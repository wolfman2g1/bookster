import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import {
  BooksServiceClient,
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
import { BOOKS_SERVICE_NAME } from '@app/common';
import { BOOKS_SERVICE } from './constants';

@Injectable()
export class BooksService implements OnModuleInit {
  private booksService: BooksServiceClient;

  constructor(@Inject(BOOKS_SERVICE) private client: ClientGrpc) {}

  onModuleInit() {
    this.booksService =
      this.client.getService<BooksServiceClient>(BOOKS_SERVICE_NAME);
  }

  searchBooks(request: SearchBooksRequest) {
    return this.booksService.searchBooks(request);
  }

  getBook(request: GetBookRequest) {
    return this.booksService.getBook(request);
  }

  upsertBook(request: UpsertBookRequest) {
    return this.booksService.upsertBook(request);
  }

  setUserBookReaction(request: SetUserBookReactionRequest) {
    return this.booksService.setUserBookReaction(request);
  }

  setUserBookStatus(request: SetUserBookStatusRequest) {
    return this.booksService.setUserBookStatus(request);
  }
}
