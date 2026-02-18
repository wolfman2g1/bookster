import { Test, TestingModule } from '@nestjs/testing';
import { BooksapiService } from './booksapi.service';

describe('BooksapiService', () => {
  let service: BooksapiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooksapiService],
    }).compile();

    service = module.get<BooksapiService>(BooksapiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
