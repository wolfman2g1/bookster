import { Module } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { MeilisearchSdkModule } from '@nestixis/nestjs-meilisearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MeilisearchSdkModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        auth: {
          url: configService.getOrThrow<string>('MEILISEARCH_URL'),
          key: configService.getOrThrow<string>('MEILISEARCH_AUTH_KEY'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class MeilisearchModule {}
