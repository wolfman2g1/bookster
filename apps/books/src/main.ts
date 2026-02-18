import { NestFactory } from '@nestjs/core';
import { BooksModule } from './books.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { BOOKS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(BooksModule,
    {
      transport: Transport.GRPC,
      options: {
        package: BOOKS,
        protoPath: join(process.cwd(), 'proto/books.proto'),
        url: 'localhost:5002',
      },
    }
  );
  await app.listen();
}
bootstrap();
