// Document Search Tools for Performance Testing
import { z } from 'zod';
import { Tool } from './function-tools';

// In-memory document storage for this demo
const documentStore = new Map<string, string>();

export const uploadDocumentTool: Tool = {
  name: 'upload_document',
  description: 'Upload a document for searching',
  parameters: z.object({
    content: z.string().describe('The full text content of the document'),
    filename: z.string().describe('Name of the document'),
    id: z.string().optional().describe('Document ID (auto-generated if not provided)'),
  }),
  execute: async (params) => {
    try {
      const docId = params.id || `doc_${Date.now()}`;
      documentStore.set(docId, params.content);
      
      return {
        success: true,
        documentId: docId,
        filename: params.filename,
        wordCount: params.content.split(/\s+/).length,
        characterCount: params.content.length,
        message: `Document "${params.filename}" uploaded successfully`
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

export const searchDocumentTool: Tool = {
  name: 'search_document',
  description: 'Search for specific words or phrases in an uploaded document',
  parameters: z.object({
    documentId: z.string().describe('ID of the document to search'),
    searchTerms: z.array(z.string()).describe('Words or phrases to search for'),
    caseSensitive: z.boolean().default(false).describe('Whether the search is case sensitive'),
  }),
  execute: async (params) => {
    try {
      const startTime = performance.now();
      const document = documentStore.get(params.documentId);
      
      if (!document) {
        return { error: true, message: 'Document not found' };
      }

      const results: Record<string, number> = {};
      const searchText = params.caseSensitive ? document : document.toLowerCase();
      
      for (const term of params.searchTerms) {
        const searchTerm = params.caseSensitive ? term : term.toLowerCase();
        
        // Count occurrences using regex for whole words
        const regex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const matches = searchText.match(regex);
        results[term] = matches ? matches.length : 0;
      }
      
      const processingTime = performance.now() - startTime;
      
      return {
        success: true,
        documentId: params.documentId,
        searchTerms: params.searchTerms,
        results,
        processingTimeMs: processingTime,
        totalMatches: Object.values(results).reduce((sum, count) => sum + count, 0),
        documentStats: {
          wordCount: document.split(/\s+/).length,
          characterCount: document.length,
        }
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

export const searchSingleWordTool: Tool = {
  name: 'search_single_word',
  description: 'Search for a single word in a document (optimized for parallel processing)',
  parameters: z.object({
    documentId: z.string().describe('ID of the document to search'),
    word: z.string().describe('Single word to search for'),
    caseSensitive: z.boolean().default(false).describe('Whether the search is case sensitive'),
  }),
  execute: async (params) => {
    try {
      const startTime = performance.now();
      const document = documentStore.get(params.documentId);
      
      if (!document) {
        return { error: true, message: 'Document not found' };
      }

      const searchText = params.caseSensitive ? document : document.toLowerCase();
      const searchTerm = params.caseSensitive ? params.word : params.word.toLowerCase();
      
      // Count occurrences using regex for whole words
      const regex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      const matches = searchText.match(regex);
      const count = matches ? matches.length : 0;
      
      const processingTime = performance.now() - startTime;
      
      return {
        success: true,
        documentId: params.documentId,
        word: params.word,
        count,
        processingTimeMs: processingTime,
        agentId: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentStats: {
          wordCount: document.split(/\s+/).length,
          characterCount: document.length,
        }
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// Export all document search tools
export const DOCUMENT_SEARCH_TOOLS = {
  upload_document: uploadDocumentTool,
  search_document: searchDocumentTool,
  search_single_word: searchSingleWordTool,
};