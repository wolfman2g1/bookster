import { Injectable, Logger } from '@nestjs/common';
import type { OpenLibrary } from '../types/open-library.types';

@Injectable()
export class BooksapiService {
  private logger = new Logger(BooksapiService.name);
  private readonly OPENLIBRARY_API_URL =
      'https://openlibrary.org/search.json';
    private readonly headers = {
        'Content-Type': 'application/json',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': "Bookster ryan@jonesit.co",
            'Accept': 'application/json',
        },
    }

  async searchBooks(query: string): Promise<{ docs: OpenLibrary[] }> {
        const response = await fetch(`${this.OPENLIBRARY_API_URL}?q=${query}`, this.headers);
        this.logger.log(`Searching books: ${response.url}`);
        if (!response.ok) {
            this.logger.error(`Failed to search books: ${response.statusText}`);
            throw new Error(`Failed to search books: ${response.statusText}`);
        }
        return response.json();
    }
}
