import { Controller } from '@nestjs/common';
import { BooksService } from './books.service';
import {
  BooksServiceController,
  BooksServiceControllerMethods,
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

@BooksServiceControllerMethods()
@Controller()
export class BooksController implements BooksServiceController {
  constructor(private readonly booksService: BooksService) {}

  searchBooks(request: SearchBooksRequest): Promise<SearchBooksResponse> {
    return this.booksService.searchBooks(request);
  }

  getBook(request: GetBookRequest): Promise<GetBookResponse> {
    return this.booksService.getBook(request);
  }

  upsertBook(request: UpsertBookRequest): Promise<UpsertBookResponse> {
    return this.booksService.upsertBook(request);
  }

  setUserBookReaction(
    request: SetUserBookReactionRequest,
  ): Promise<SetUserBookReactionResponse> {
    return this.booksService.setUserBookReaction(request);
  }

  setUserBookStatus(
    request: SetUserBookStatusRequest,
  ): Promise<SetUserBookStatusResponse> {
    return this.booksService.setUserBookStatus(request);
  }
}
