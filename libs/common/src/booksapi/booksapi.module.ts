import { Module } from '@nestjs/common';
import { BooksapiService } from './booksapi.service';

@Module({
  providers: [BooksapiService],
  exports: [BooksapiService],
})
export class BooksapiModule {}
