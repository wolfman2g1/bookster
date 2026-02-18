import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { MeilisearchModule } from '@app/common/meilisearch';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BooksapiModule } from '@app/common/booksapi/booksapi.module';

@Module({
  imports: [DatabaseModule, MeilisearchModule,BooksapiModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
