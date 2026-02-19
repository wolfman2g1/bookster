export interface UpsertAuthorDto {
  id: string;
  name: string;
  sortName: string;
  externalSource: number;
  externalId: string;
  role: string;
  position: number;
}

export interface UpsertGenreDto {
  id: string;
  name: string;
  slug: string;
  confidence: number;
}

export interface UpsertBookDto {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  language?: string;
  publishedYear?: number;
  coverImageUrl?: string;
  externalSource: number;
  externalId?: string;
  authors?: UpsertAuthorDto[];
  genres?: UpsertGenreDto[];
  reindexSearchDocument?: boolean;
}
