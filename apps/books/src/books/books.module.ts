import { Module } from '@nestjs/common';
import { DatabaseModule, MeilisearchModule, BooksapiModule } from '@app/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';

@Module({
  imports: [DatabaseModule, MeilisearchModule,BooksapiModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
