import type { Book, Author, Genre, ExternalSource } from '../types/books';

/** Document shape stored in Meilisearch for fuzzy search. */
export interface BookSearchDocument {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  language: string;
  publishedYear: number;
  coverImageUrl: string;
  externalSource: string;
  externalId: string;
  authors: Array<{ id: string; name: string; sortName: string }>;
  genres: Array<{ id: string; name: string; slug: string }>;
  primaryAuthor: string;
  authorNames: string[];
  genreSlugs: string[];
  likeCount: number;
  dislikeCount: number;
  wantCount: number;
  readingCount: number;
  readCount: number;
  dnfCount: number;
  createdAt: string;
  updatedAt: string;
}

export const BOOKS_INDEX = 'books';

/** Meilisearch index settings for fuzzy search (typo tolerance enabled by default). */
export const BOOKS_INDEX_SETTINGS = {
  searchableAttributes: [
    'title',
    'subtitle',
    'primaryAuthor',
    'authorNames',
    'description',
  ],
  filterableAttributes: ['genreSlugs', 'language', 'publishedYear'],
  sortableAttributes: [
    'publishedYear',
    'likeCount',
    'readingCount',
    'readCount',
    'createdAt',
  ],
};

function stringToExternalSource(s: string): ExternalSource {
  switch (s) {
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

/** Convert a Prisma Book (with relations) to a Meilisearch document. */
export function bookToSearchDocument(book: {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  language?: string | null;
  publishedYear?: number | null;
  coverImageUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  authors: Array<{ author: { id: string; name: string; sortName: string | null } }>;
  genres: Array<{ genre: { id: string; name: string; slug: string } }>;
  primaryAuthor?: string;
  authorNames?: string[];
  genreSlugs?: string[];
  likeCount?: number;
  dislikeCount?: number;
  wantCount?: number;
  readingCount?: number;
  readCount?: number;
  dnfCount?: number;
}): BookSearchDocument {
  const authorNames =
    book.authorNames ??
    book.authors.map((a) => a.author.name);
  const genreSlugs =
    book.genreSlugs ??
    book.genres.map((g) => g.genre.slug);
  const primaryAuthor =
    book.primaryAuthor ??
    (authorNames[0] ?? '');

  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle ?? '',
    description: book.description ?? '',
    language: book.language ?? '',
    publishedYear: book.publishedYear ?? 0,
    coverImageUrl: book.coverImageUrl ?? '',
    externalSource: book.externalSource ?? '',
    externalId: book.externalId ?? '',
    authors: book.authors.map((a) => ({
      id: a.author.id,
      name: a.author.name,
      sortName: a.author.sortName ?? '',
    })),
    genres: book.genres.map((g) => ({
      id: g.genre.id,
      name: g.genre.name,
      slug: g.genre.slug,
    })),
    primaryAuthor,
    authorNames,
    genreSlugs,
    likeCount: book.likeCount ?? 0,
    dislikeCount: book.dislikeCount ?? 0,
    wantCount: book.wantCount ?? 0,
    readingCount: book.readingCount ?? 0,
    readCount: book.readCount ?? 0,
    dnfCount: book.dnfCount ?? 0,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}

/** Convert a Meilisearch hit back to proto Book shape. */
export function searchDocumentToBook(doc: BookSearchDocument): Book {
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description,
    language: doc.language,
    publishedYear: doc.publishedYear,
    coverImageUrl: doc.coverImageUrl,
    externalSource: stringToExternalSource(doc.externalSource),
    externalId: doc.externalId,
    authors: doc.authors.map(
      (a): Author => ({
        id: a.id,
        name: a.name,
        sortName: a.sortName,
        externalSource: 0,
        externalId: '',
        createdAt: '',
        updatedAt: '',
      }),
    ),
    genres: doc.genres.map(
      (g): Genre => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        createdAt: '',
        updatedAt: '',
      }),
    ),
    primaryAuthor: doc.primaryAuthor,
    authorNames: doc.authorNames,
    genreSlugs: doc.genreSlugs,
    likeCount: doc.likeCount,
    dislikeCount: doc.dislikeCount,
    wantCount: doc.wantCount,
    readingCount: doc.readingCount,
    readCount: doc.readCount,
    dnfCount: doc.dnfCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
