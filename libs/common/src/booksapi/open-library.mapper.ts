import type { Book, Author, ExternalSource } from '../types/books';
import type { OpenLibrary } from '../types/open-library.types';

const OPEN_LIBRARY_COVER_URL = 'https://covers.openlibrary.org/b/id';

/** Map Open Library API result to our Book shape (for external search preview). */
export function openLibraryToBook(doc: OpenLibrary): Book {
  const authorNames = doc.author_name ?? [];
  const authorKeys = doc.author_key ?? [];
  const now = new Date().toISOString();

  return {
    id: doc.key ?? `ol:${doc.cover_i ?? Date.now()}`,
    title: doc.title ?? '',
    subtitle: '',
    description: '',
    language: '',
    publishedYear: doc.first_publish_year ?? 0,
    coverImageUrl: doc.cover_i
      ? `${OPEN_LIBRARY_COVER_URL}/${doc.cover_i}-M.jpg`
      : '',
    externalSource: 1 as ExternalSource, // OPEN_LIBRARY
    externalId: doc.key ?? '',
    authors: authorNames.map((name, i) => ({
      id: authorKeys[i] ?? `ol-author-${i}`,
      name,
      sortName: name,
      externalSource: 1 as ExternalSource,
      externalId: authorKeys[i] ?? '',
      createdAt: now,
      updatedAt: now,
    })),
    genres: [],
    primaryAuthor: authorNames[0] ?? '',
    authorNames,
    genreSlugs: [],
    likeCount: 0,
    dislikeCount: 0,
    wantCount: 0,
    readingCount: 0,
    readCount: 0,
    dnfCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
