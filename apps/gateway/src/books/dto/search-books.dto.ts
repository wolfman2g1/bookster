export interface SearchBooksQueryDto {
  q?: string;
  limit?: number;
  offset?: number;
  allowExternalFallback?: boolean;
  language?: string;
  publishedYearMin?: number;
  publishedYearMax?: number;
  genreSlugs?: string[] | string;
  sort?: string;
}
