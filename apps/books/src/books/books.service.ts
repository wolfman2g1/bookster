import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '@app/common';
import {
  MeilisearchService,
  bookToSearchDocument,
  searchDocumentToBook,
  BOOKS_INDEX,
  BOOKS_INDEX_SETTINGS,
} from '@app/common/meilisearch';
import type {
  Book,
  SearchBooksRequest,
  SearchBooksResponse,
  GetBookRequest,
  GetBookResponse,
  UpsertBookRequest,
  UpsertBookResponse,
  SetUserBookReactionRequest,
  SetUserBookReactionResponse,
  SetUserBookStatusRequest,
  SetUserBookStatusResponse,
} from '@app/common';
import { ExternalSource, ReactionType, ReadingStatus } from '@app/common';
import {
  BooksapiService,
  openLibraryToBook,
} from '@app/common/booksapi';

@Injectable()
export class BooksService implements OnModuleInit {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly meilisearch: MeilisearchService,
    private readonly booksapi: BooksapiService,
  ) {}

  async onModuleInit() {
    await this.ensureBooksIndexSettings();
  }

  private async ensureBooksIndexSettings() {
    try {
      await this.meilisearch.updateSettings(
        BOOKS_INDEX,
        BOOKS_INDEX_SETTINGS,
      );
    } catch {
      // Index may not exist yet; settings will apply when first doc is added
    }
  }

  /**
   * Search flow (e.g. when user checks in a book):
   * 1. Search cache (Meilisearch) first
   * 2. If empty, search database
   * 3. If book exists in DB, write it to the cache for next time
   */
  async searchBooks(
    request: SearchBooksRequest,
  ): Promise<SearchBooksResponse> {
    const limit = Math.min(request.limit || 20, 100);
    const offset = request.offset || 0;
    const filter = this.buildMeilisearchFilter(request);
    const sort = this.parseSort(request.sort);

    // 1. Search cache first
    const cacheResult = await this.meilisearch.search(
      BOOKS_INDEX,
      request.query || '',
      {
        limit,
        offset,
        filter: filter || undefined,
        sort: sort?.length ? sort : undefined,
      },
    );

    const cacheHits = (cacheResult.hits ?? []) as Parameters<
      typeof searchDocumentToBook
    >[0][];
    let books: Book[] = cacheHits.map(searchDocumentToBook);
    let total = cacheResult.estimatedTotalHits ?? books.length;

    // 2. If cache empty, search database
    if (cacheHits.length === 0 && request.query?.trim()) {
      const dbBooks = await this.searchDatabase(
        request.query,
        limit,
        offset,
        request,
      );
      books = dbBooks;

      // if the books are not found in the database, search the open library
      if (books.length === 0) {
        for (const word of request.query.split(' ')) {
          const openLibraryBooks = await this.booksapi.searchBooks(word);
          if (openLibraryBooks.docs.length > 0) {
            books.push(
              ...openLibraryBooks.docs.map((doc) => openLibraryToBook(doc)),
            );
            break; // use first successful search
          }
        }
      }
    }
    // Upsert Open Library results into the database (cache + DB hits already exist)
    for (const book of books) {
      if (book.externalSource === 1 && book.externalId) {
        await this.upsertBook({
          id: book.id,
          title: book.title,
          subtitle: book.subtitle,
          description: book.description,
          language: book.language,
          publishedYear: book.publishedYear,
          coverImageUrl: book.coverImageUrl,
          externalSource: book.externalSource,
          externalId: book.externalId,
          authors: book.authors.map((a, i) => ({
            id: a.id,
            name: a.name,
            sortName: a.sortName,
            externalSource: a.externalSource,
            externalId: a.externalId,
            role: '',
            position: i,
          })),
          genres: book.genres.map((g) => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            confidence: 0,
          })),
          reindexSearchDocument: true,
        });
        // index the book in meilisearch
        await this.indexBookInMeilisearch(book.id);
        total++;
        break;
      }
    }
    return {
      books,
      usedExternalFallback: false,
      importEnqueued: false,
      total,
    };
  }

  private buildMeilisearchFilter(request: SearchBooksRequest): string | null {
    const filterParts: string[] = [];
    if (request.language)
      filterParts.push(`language = "${request.language}"`);
    if (request.publishedYearMin != null && request.publishedYearMin > 0)
      filterParts.push(`publishedYear >= ${request.publishedYearMin}`);
    if (request.publishedYearMax != null && request.publishedYearMax > 0)
      filterParts.push(`publishedYear <= ${request.publishedYearMax}`);
    if (
      request.genreSlugs?.length &&
      request.genreSlugs.length > 0
    ) {
      const genreFilters = request.genreSlugs.map(
        (s) => `genreSlugs = "${s}"`,
      );
      filterParts.push(`(${genreFilters.join(' OR ')})`);
    }
    return filterParts.length > 0 ? filterParts.join(' AND ') : null;
  }

  private async searchDatabase(
    query: string,
    limit: number,
    offset: number,
    request: SearchBooksRequest,
  ): Promise<Book[]> {
    const where: any = {
      title: { contains: query, mode: 'insensitive' },
    };
    if (request.language) {
      where.language = request.language;
    }
    const yearConditions: Record<string, number> = {};
    if (request.publishedYearMin != null && request.publishedYearMin > 0) {
      yearConditions.gte = request.publishedYearMin;
    }
    if (request.publishedYearMax != null && request.publishedYearMax > 0) {
      yearConditions.lte = request.publishedYearMax;
    }
    if (Object.keys(yearConditions).length) {
      where.publishedYear = yearConditions;
    }
    if (request.genreSlugs?.length) {
      where.genres = {
        some: { genre: { slug: { in: request.genreSlugs } } },
      };
    }

    const dbBooks = await this.prisma.book.findMany({
      where,
      include: {
        authors: { include: { author: true }, orderBy: { position: 'asc' } },
        genres: { include: { genre: true } },
      },
      take: limit,
      skip: offset,
      orderBy: { title: 'asc' },
    });

    const books: Book[] = [];
    for (const b of dbBooks) {
      const full = await this.findBookWithStats(b.id, true);
      if (full) books.push(full);
    }
    return books;
  }

  private parseSort(sort?: string): string[] | undefined {
    if (!sort || !sort.trim()) return undefined;
    const s = sort.trim().toLowerCase();
    if (s === 'relevance') return undefined;
    if (s === 'published_year:desc') return ['publishedYear:desc'];
    if (s === 'published_year:asc') return ['publishedYear:asc'];
    if (s === 'like_count:desc') return ['likeCount:desc'];
    if (s === 'reading_count:desc') return ['readingCount:desc'];
    if (s === 'read_count:desc') return ['readCount:desc'];
    if (s === 'created_at:desc') return ['createdAt:desc'];
    return undefined;
  }

  async getBook(request: GetBookRequest): Promise<GetBookResponse> {
    const book = await this.findBookWithStats(request.id, request.includeStats);
    return { book: book ?? undefined };
  }

  async upsertBook(
    request: UpsertBookRequest,
  ): Promise<UpsertBookResponse> {
    const externalSource = this.protoToPrismaExternalSource(
      request.externalSource,
    );
    const authors = request.authors ?? [];
    const genres = request.genres ?? [];
    const useExternalIdentity =
      externalSource && request.externalId?.trim();

    let book: Awaited<
      ReturnType<DatabaseService['book']['upsert']>
    >;
    let created = true;

    if (useExternalIdentity) {
      const existing = await this.prisma.book.findUnique({
        where: {
          externalSource_externalId: {
            externalSource,
            externalId: request.externalId!,
          },
        },
        include: {
          authors: { include: { author: true }, orderBy: { position: 'asc' } },
          genres: { include: { genre: true } },
        },
      });
      if (existing) {
        created = false;
        book = await this.prisma.book.update({
          where: { id: existing.id },
          data: {
            title: request.title,
            subtitle: request.subtitle || null,
            description: request.description || null,
            language: request.language || null,
            publishedYear: request.publishedYear || null,
            coverImageUrl: request.coverImageUrl || null,
          },
          include: {
            authors: { include: { author: true }, orderBy: { position: 'asc' } },
            genres: { include: { genre: true } },
          },
        });
      } else {
        book = await this.prisma.book.create({
          data: {
            id: request.id || undefined,
            title: request.title,
            subtitle: request.subtitle || null,
            description: request.description || null,
            language: request.language || null,
            publishedYear: request.publishedYear || null,
            coverImageUrl: request.coverImageUrl || null,
            externalSource,
            externalId: request.externalId,
          },
          include: {
            authors: { include: { author: true }, orderBy: { position: 'asc' } },
            genres: { include: { genre: true } },
          },
        });
      }
    } else if (request.id) {
      const byId = await this.prisma.book.findUnique({
        where: { id: request.id },
      });
      created = !byId;
      book = await this.prisma.book.upsert({
        where: { id: request.id },
        create: {
          id: request.id,
          title: request.title,
          subtitle: request.subtitle || null,
          description: request.description || null,
          language: request.language || null,
          publishedYear: request.publishedYear || null,
          coverImageUrl: request.coverImageUrl || null,
          externalSource: externalSource ?? null,
          externalId: request.externalId || null,
        },
        update: {
          title: request.title,
          subtitle: request.subtitle || null,
          description: request.description || null,
          language: request.language || null,
          publishedYear: request.publishedYear || null,
          coverImageUrl: request.coverImageUrl || null,
        },
        include: {
          authors: { include: { author: true }, orderBy: { position: 'asc' } },
          genres: { include: { genre: true } },
        },
      });
    } else {
      book = await this.prisma.book.create({
        data: {
          title: request.title,
          subtitle: request.subtitle || null,
          description: request.description || null,
          language: request.language || null,
          publishedYear: request.publishedYear || null,
          coverImageUrl: request.coverImageUrl || null,
          externalSource: externalSource ?? null,
          externalId: request.externalId || null,
        },
        include: {
          authors: { include: { author: true }, orderBy: { position: 'asc' } },
          genres: { include: { genre: true } },
        },
      });
    }

    if (authors.length || genres.length) {
      await this.syncAuthorsAndGenres(book.id, authors, genres);
    }

    if (request.reindexSearchDocument) {
      await this.indexBookInMeilisearch(book.id);
    }
    const fullBook = await this.findBookWithStats(book.id, true);
    return {
      book: fullBook ?? undefined,
      created,
    };
  }

  private async syncAuthorsAndGenres(
    bookId: string,
    authors: UpsertBookRequest['authors'],
    genres: UpsertBookRequest['genres'],
  ): Promise<void> {
    const toExt = (s: number) =>
      s === 1 ? 'OPEN_LIBRARY' : s === 2 ? 'GOOGLE_BOOKS' : s === 3 ? 'OTHER' : null;
    if (authors?.length) {
      for (const a of authors) {
        await this.prisma.author.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            name: a.name,
            sortName: a.sortName || null,
            externalSource: toExt(a.externalSource) ?? null,
            externalId: a.externalId || null,
          },
          update: { name: a.name, sortName: a.sortName || null },
        });
      }
      for (let i = 0; i < authors.length; i++) {
        const a = authors[i];
        await this.prisma.bookAuthor.upsert({
          where: { bookId_authorId: { bookId, authorId: a.id } },
          create: { bookId, authorId: a.id, role: a.role || null, position: i },
          update: { role: a.role || null, position: i },
        });
      }
    }
    if (genres?.length) {
      for (const g of genres) {
        await this.prisma.genre.upsert({
          where: { slug: g.slug },
          create: { id: g.id, name: g.name, slug: g.slug },
          update: { name: g.name },
        });
      }
      for (const g of genres) {
        const genre = await this.prisma.genre.findUnique({
          where: { slug: g.slug },
        });
        if (genre) {
          await this.prisma.bookGenre.upsert({
            where: { bookId_genreId: { bookId, genreId: genre.id } },
            create: {
              bookId,
              genreId: genre.id,
              confidence: g.confidence ?? null,
            },
            update: { confidence: g.confidence ?? undefined },
          });
        }
      }
    }
  }

  /** Index a book in Meilisearch. Call when a user checks in a new book (cache population). */
  async indexBookInMeilisearch(bookId: string): Promise<void> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        authors: { include: { author: true }, orderBy: { position: 'asc' } },
        genres: { include: { genre: true } },
      },
    });
    if (!book) return;
    const [likeCount, dislikeCount, wantCount, readingCount, readCount, dnfCount] =
      await Promise.all([
        this.prisma.userBookReaction.count({
          where: { bookId, reaction: 'LIKE' },
        }),
        this.prisma.userBookReaction.count({
          where: { bookId, reaction: 'DISLIKE' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId, status: 'WANT' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId, status: 'READING' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId, status: 'READ' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId, status: 'DNF' },
        }),
      ]);
    const doc = bookToSearchDocument({
      ...book,
      externalSource: book.externalSource as string | null,
      likeCount,
      dislikeCount,
      wantCount,
      readingCount,
      readCount,
      dnfCount,
    });
    await this.meilisearch.updateDocuments(BOOKS_INDEX, [doc]);
  }

  async setUserBookReaction(
    request: SetUserBookReactionRequest,
  ): Promise<SetUserBookReactionResponse> {
    const reaction = this.protoToPrismaReaction(request.reaction);
    const result = await this.prisma.userBookReaction.upsert({
      where: {
        userId_bookId: {
          userId: request.userId,
          bookId: request.bookId,
        },
      },
      create: {
        userId: request.userId,
        bookId: request.bookId,
        reaction,
      },
      update: { reaction },
    });
    await this.indexBookInMeilisearch(request.bookId);
    return {
      reaction: {
        userId: result.userId,
        bookId: result.bookId,
        reaction: request.reaction,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    };
  }

  async setUserBookStatus(
    request: SetUserBookStatusRequest,
  ): Promise<SetUserBookStatusResponse> {
    const status = this.protoToPrismaStatus(request.status);
    const result = await this.prisma.userBookStatus.upsert({
      where: {
        userId_bookId: {
          userId: request.userId,
          bookId: request.bookId,
        },
      },
      create: {
        userId: request.userId,
        bookId: request.bookId,
        status,
        startedAt: request.startedAt
          ? new Date(request.startedAt)
          : null,
        finishedAt: request.finishedAt
          ? new Date(request.finishedAt)
          : null,
      },
      update: {
        status,
        startedAt: request.startedAt
          ? new Date(request.startedAt)
          : undefined,
        finishedAt: request.finishedAt
          ? new Date(request.finishedAt)
          : undefined,
      },
    });
    await this.indexBookInMeilisearch(request.bookId);
    return {
      status: {
        userId: result.userId,
        bookId: result.bookId,
        status: request.status,
        startedAt: result.startedAt?.toISOString() ?? '',
        finishedAt: result.finishedAt?.toISOString() ?? '',
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    };
  }

  private async findBookWithStats(
    id: string,
    includeStats: boolean,
  ): Promise<Book | null> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        authors: { include: { author: true }, orderBy: { position: 'asc' } },
        genres: { include: { genre: true } },
      },
    });
    if (!book) return null;
    if (!includeStats) {
      return this.prismaBookToProto(book, {
        likeCount: 0,
        dislikeCount: 0,
        wantCount: 0,
        readingCount: 0,
        readCount: 0,
        dnfCount: 0,
      });
    }
    const [likeCount, dislikeCount, wantCount, readingCount, readCount, dnfCount] =
      await Promise.all([
        this.prisma.userBookReaction.count({
          where: { bookId: id, reaction: 'LIKE' },
        }),
        this.prisma.userBookReaction.count({
          where: { bookId: id, reaction: 'DISLIKE' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId: id, status: 'WANT' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId: id, status: 'READING' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId: id, status: 'READ' },
        }),
        this.prisma.userBookStatus.count({
          where: { bookId: id, status: 'DNF' },
        }),
      ]);
    return this.prismaBookToProto(book, {
      likeCount,
      dislikeCount,
      wantCount,
      readingCount,
      readCount,
      dnfCount,
    });
  }

  private prismaBookToProto(
    book: {
      id: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      language: string | null;
      publishedYear: number | null;
      coverImageUrl: string | null;
      externalSource: string | null;
      externalId: string | null;
      createdAt: Date;
      updatedAt: Date;
      authors: Array<{ author: { id: string; name: string; sortName: string | null; updatedAt: Date; createdAt: Date; externalId: string | null } }>;
      genres: Array<{ genre: { id: string; name: string; slug: string; createdAt: Date; updatedAt: Date } }>;
    },
    stats: {
      likeCount: number;
      dislikeCount: number;
      wantCount: number;
      readingCount: number;
      readCount: number;
      dnfCount: number;
    },
  ): Book {
    const authorNames = book.authors.map((a) => a.author.name);
    const genreSlugs = book.genres.map((g) => g.genre.slug);
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle ?? '',
      description: book.description ?? '',
      language: book.language ?? '',
      publishedYear: book.publishedYear ?? 0,
      coverImageUrl: book.coverImageUrl ?? '',
      externalSource: this.prismaToProtoExternalSource(book.externalSource),
      externalId: book.externalId ?? '',
      authors: book.authors.map((a) => ({
        id: a.author.id,
        name: a.author.name,
        sortName: a.author.sortName ?? '',
        externalSource: 0,
        externalId: a.author.externalId ?? '',
        createdAt: a.author.createdAt.toISOString(),
        updatedAt: a.author.updatedAt.toISOString(),
      })),
      genres: book.genres.map((g) => ({
        id: g.genre.id,
        name: g.genre.name,
        slug: g.genre.slug,
        createdAt: g.genre.createdAt.toISOString(),
        updatedAt: g.genre.updatedAt.toISOString(),
      })),
      primaryAuthor: authorNames[0] ?? '',
      authorNames,
      genreSlugs,
      ...stats,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    };
  }

  private protoToPrismaExternalSource(
    src: ExternalSource,
  ): 'OPEN_LIBRARY' | 'GOOGLE_BOOKS' | 'OTHER' | null {
    switch (src) {
      case 1:
        return 'OPEN_LIBRARY';
      case 2:
        return 'GOOGLE_BOOKS';
      case 3:
        return 'OTHER';
      default:
        return null;
    }
  }

  private prismaToProtoExternalSource(
    src: string | null,
  ): ExternalSource {
    switch (src) {
      case 'OPEN_LIBRARY':
        return 1;
      case 'GOOGLE_BOOKS':
        return 2;
      case 'OTHER':
        return 3;
      default:
        return 0;
    }
  }

  private protoToPrismaReaction(
    r: ReactionType,
  ): 'LIKE' | 'DISLIKE' {
    return r === 1 ? 'LIKE' : 'DISLIKE';
  }

  private protoToPrismaStatus(
    s: ReadingStatus,
  ): 'WANT' | 'READING' | 'READ' | 'DNF' {
    switch (s) {
      case 1:
        return 'WANT';
      case 2:
        return 'READING';
      case 3:
        return 'READ';
      case 4:
        return 'DNF';
      default:
        return 'WANT';
    }
  }
}
