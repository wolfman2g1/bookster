import { MEILISEARCH_SDK_CLIENT } from '@nestixis/nestjs-meilisearch';
import { MeiliSearch } from 'meilisearch';
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class MeilisearchService {
     constructor(
    @Inject(MEILISEARCH_SDK_CLIENT) private readonly meiliSearchClient: MeiliSearch
     ) { }
    async index(indexName: string = 'books') {
        return this.meiliSearchClient.index(indexName);
    }
    async search(
        indexName: string,
        query: string,
        options?: {
            limit?: number;
            offset?: number;
            filter?: string;
            sort?: string[];
        },
    ) {
        return this.meiliSearchClient
            .index(indexName)
            .search(query, options ?? undefined);
    }

    async updateSettings(indexName: string, settings: object) {
        return this.meiliSearchClient
            .index(indexName)
            .updateSettings(settings);
    }
    async delete(indexName: string) {
        return this.meiliSearchClient.index(indexName).delete();
    }
    async update(indexName: string, data: any) {
        return this.meiliSearchClient.index(indexName).update(data);
    }
    async addDocuments(indexName: string, documents: any[]) {
        return this.meiliSearchClient.index(indexName).addDocuments(documents);
    }
    async deleteDocuments(indexName: string, documents: any[]) {
        return this.meiliSearchClient.index(indexName).deleteDocuments(documents);
    }
    async updateDocuments(indexName: string, documents: any[]) {
        return this.meiliSearchClient.index(indexName).updateDocuments(documents);
    }
    async getDocuments(indexName: string) {
        return this.meiliSearchClient.index(indexName).getDocuments();
    }
    async getDocument(indexName: string, documentId: string) {
        return this.meiliSearchClient.index(indexName).getDocument(documentId);
    }
}
