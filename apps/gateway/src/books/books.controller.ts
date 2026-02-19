import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { SearchBooksQueryDto } from './dto/search-books.dto';
import { UpsertBookDto } from './dto/upsert-book.dto';
import { SetUserBookReactionDto } from './dto/set-reaction.dto';
import { SetUserBookStatusDto } from './dto/set-status.dto';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  private buildSearchRequest(query: SearchBooksQueryDto & Record<string, unknown>) {
    const raw = query.genreSlugs;
    const genreSlugs = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    // Support ?q=... or ?=... (nameless param, e.g. ?=only+the+dead)
    const q = query.q ?? (query as Record<string, string>)[''];
    const searchQuery = (typeof q === 'string' ? q : '') || '';
    return {
      query: String(searchQuery),
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      allowExternalFallback: query.allowExternalFallback ?? false,
      language: query.language ?? '',
      publishedYearMin: query.publishedYearMin ?? 0,
      publishedYearMax: query.publishedYearMax ?? 0,
      genreSlugs,
      sort: query.sort ?? '',
    };
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  searchAtPath(@Query() query: SearchBooksQueryDto & Record<string, unknown>) {
    return this.booksService.searchBooks(this.buildSearchRequest(query)).pipe(
      catchError((error) =>
        throwError(() =>
          new HttpException(
            error.details || error.message || 'Search failed',
            error.code === 3 ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  search(@Query() query: SearchBooksQueryDto & Record<string, unknown>) {
    return this.booksService.searchBooks(this.buildSearchRequest(query)).pipe(
      catchError((error) =>
        throwError(() =>
          new HttpException(
            error.details || error.message || 'Search failed',
            error.code === 3 ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('id') id: string,
    @Query('includeStats') includeStats?: string,
  ) {
    return this.booksService.getBook({
      id,
      includeStats: includeStats === 'true',
    }).pipe(
      catchError((error) =>
        throwError(() =>
          new HttpException(
            error.details || error.message || 'Failed to get book',
            error.code === 5 ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  upsert(@Body() dto: UpsertBookDto) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    return this.booksService.upsertBook({
      id: dto.id ?? '',
      title: dto.title,
      subtitle: dto.subtitle ?? '',
      description: dto.description ?? '',
      language: dto.language ?? '',
      publishedYear: dto.publishedYear ?? 0,
      coverImageUrl: dto.coverImageUrl ?? '',
      externalSource: dto.externalSource,
      externalId: dto.externalId ?? '',
      authors: dto.authors ?? [],
      genres: dto.genres ?? [],
      reindexSearchDocument: dto.reindexSearchDocument ?? true,
    }).pipe(
      catchError((error) =>
        throwError(() =>
          new HttpException(
            error.details || error.message || 'Failed to upsert book',
            error.code === 3 ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
    );
  }

  @Post(':id/reaction')
  @HttpCode(HttpStatus.OK)
  setReaction(@Param('id') bookId: string, @Body() dto: SetUserBookReactionDto) {
    return this.booksService.setUserBookReaction({
      userId: dto.userId,
      bookId,
      reaction: dto.reaction,
    }).pipe(
      catchError((error) =>
        throwError(() =>
          new HttpException(
            error.details || error.message || 'Failed to set reaction',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
    );
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  setStatus(@Param('id') bookId: string, @Body() dto: SetUserBookStatusDto) {
    return this.booksService.setUserBookStatus({
      userId: dto.userId,
      bookId,
      status: dto.status,
      startedAt: dto.startedAt ?? '',
      finishedAt: dto.finishedAt ?? '',
    }).pipe(
      catchError((error) =>
        throwError(() =>
          new HttpException(
            error.details || error.message || 'Failed to set status',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
    );
  }
}
