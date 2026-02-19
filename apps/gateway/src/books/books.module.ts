import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BOOKS_SERVICE } from './constants';
import { BOOKS } from '@app/common';

@Module({
  controllers: [BooksController],
  providers: [BooksService],
  imports: [
    ClientsModule.register([
      {
        name: BOOKS_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: BOOKS,
          protoPath: join(process.cwd(), 'proto/books.proto'),
          url: process.env.BOOKS_SERVICE_URL || 'localhost:5002',
        },
      },
    ]),
  ],
})
export class BooksModule {}
