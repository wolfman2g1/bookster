import { Test, TestingModule } from '@nestjs/testing';
import { MeilisearchService } from './meilisearch.service';

describe('MeilisearchService', () => {
  let service: MeilisearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeilisearchService],
    }).compile();

    service = module.get<MeilisearchService>(MeilisearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
