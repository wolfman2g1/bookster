import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { BooksModule as BooksFeatureModule } from './books/books.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    BooksFeatureModule,
  ],
  controllers: [],
  providers: [],
})
export class BooksModule {}
