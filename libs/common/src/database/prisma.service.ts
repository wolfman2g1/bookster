import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class DatabaseService extends PrismaClient {
  constructor(config: ConfigService) {
    super({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: config.get('DATABASE_URL'),
        },
      },
    });
  }
}