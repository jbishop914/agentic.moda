// src/lib/tools/function-tools.ts
// Advanced function calling implementation for agents

import { z } from 'zod';

// Base tool interface
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
}

// ============= API CALLING TOOLS =============

export const apiCallTool: Tool = {
  name: 'make_api_call',
  description: 'Make HTTP API calls to external services',
  parameters: z.object({
    url: z.string().url().describe('The API endpoint URL'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP method'),
    headers: z.record(z.string()).optional().describe('Request headers as key-value pairs'),
    body: z.any().optional().describe('Request body (will be JSON stringified)'),
    queryParams: z.record(z.string()).optional().describe('Query parameters'),
  }),
  execute: async (params) => {
    try {
      // Build URL with query params
      const url = new URL(params.url);
      if (params.queryParams) {
        Object.entries(params.queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: params.method,
        headers: {
          'Content-Type': 'application/json',
          ...params.headers,
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
      });

      const data = await response.json();
      
      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      return {
        error: true,
        message: error.message,
        details: 'Failed to make API call',
      };
    }
  },
};

// ============= WEB SCRAPING TOOL =============

export const webScrapeTool: Tool = {
  name: 'scrape_webpage',
  description: 'Extract content from a webpage',
  parameters: z.object({
    url: z.string().url().describe('URL to scrape'),
    selector: z.string().optional().describe('CSS selector to extract specific content'),
    extractType: z.enum(['text', 'html', 'links', 'images']).default('text'),
  }),
  execute: async (params) => {
    try {
      const response = await fetch(params.url);
      const html = await response.text();
      
      // Basic extraction without DOM (for server-side)
      // In production, use cheerio or playwright
      
      // Extract title
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : 'No title';
      
      // Extract meta description
      const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const description = descMatch ? descMatch[1] : '';
      
      // Extract text content (basic)
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000);
      
      return {
        title,
        description,
        content: textContent,
        url: params.url,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// ============= DATABASE QUERY TOOL =============

export const databaseQueryTool: Tool = {
  name: 'query_database',
  description: 'Query a SQL database (PostgreSQL)',
  parameters: z.object({
    query: z.string().describe('SQL query to execute'),
    database: z.enum(['supabase', 'postgres', 'mysql']).default('supabase'),
    params: z.array(z.any()).optional().describe('Query parameters for prepared statements'),
  }),
  execute: async (params) => {
    // For Supabase integration
    if (params.database === 'supabase') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for agent queries
      );
      
      try {
        // Parse the SQL to determine operation type
        const operation = params.query.trim().toUpperCase().split(' ')[0];
        
        if (operation === 'SELECT') {
          const { data, error } = await supabase.rpc('execute_sql', {
            query: params.query,
            params: params.params || [],
          });
          
          if (error) throw error;
          return { rows: data, count: data?.length || 0 };
        } else {
          // For INSERT, UPDATE, DELETE
          return { 
            message: 'Write operations restricted for safety',
            suggestion: 'Use Supabase client methods for writes',
          };
        }
      } catch (error: any) {
        return { error: true, message: error.message };
      }
    }
    
    return { error: true, message: 'Database not configured' };
  },
};

// ============= CALCULATION TOOL =============

export const calculationTool: Tool = {
  name: 'calculate',
  description: 'Perform mathematical calculations and data analysis',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression or calculation'),
    operation: z.enum(['basic', 'statistical', 'financial']).default('basic'),
    data: z.array(z.number()).optional().describe('Array of numbers for statistical operations'),
  }),
  execute: async (params) => {
    try {
      if (params.operation === 'basic') {
        // Use Function constructor for safer eval
        const result = new Function('return ' + params.expression)();
        return { result, expression: params.expression };
      }
      
      if (params.operation === 'statistical' && params.data) {
        const data = params.data;
        const mean = data.reduce((a: number, b: number) => a + b, 0) / data.length;
        const variance = data.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);
        const min = Math.min(...data);
        const max = Math.max(...data);
        
        return {
          mean,
          median: data.sort((a: number, b: number) => a - b)[Math.floor(data.length / 2)],
          variance,
          standardDeviation: stdDev,
          min,
          max,
          count: data.length,
        };
      }
      
      if (params.operation === 'financial') {
        // Add financial calculations like compound interest, NPV, etc.
        return { message: 'Financial calculations coming soon' };
      }
      
      return { error: true, message: 'Invalid operation' };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// ============= FILE OPERATIONS TOOL =============

export const fileOperationsTool: Tool = {
  name: 'file_operations',
  description: 'Read, write, and manipulate files',
  parameters: z.object({
    operation: z.enum(['read', 'write', 'append', 'delete', 'list']),
    path: z.string().describe('File path or directory'),
    content: z.string().optional().describe('Content to write'),
    encoding: z.enum(['utf8', 'base64', 'binary']).default('utf8'),
  }),
  execute: async (params) => {
    // This would integrate with a file storage service
    // For now, we'll use localStorage or IndexedDB for demo
    
    const STORAGE_KEY = `file_${params.path}`;
    
    switch (params.operation) {
      case 'read':
        const content = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        return content ? { content, path: params.path } : { error: true, message: 'File not found' };
      
      case 'write':
        if (!params.content) return { error: true, message: 'Content required for write' };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, params.content);
        }
        return { success: true, path: params.path, size: params.content.length };
      
      case 'append':
        if (!params.content) return { error: true, message: 'Content required for append' };
        if (typeof window !== 'undefined') {
          const existing = localStorage.getItem(STORAGE_KEY) || '';
          localStorage.setItem(STORAGE_KEY, existing + params.content);
        }
        return { success: true, path: params.path };
      
      case 'delete':
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        return { success: true, path: params.path };
      
      case 'list':
        if (typeof window !== 'undefined') {
          const files = Object.keys(localStorage)
            .filter(key => key.startsWith('file_'))
            .map(key => key.replace('file_', ''));
          return { files, count: files.length };
        }
        return { files: [], count: 0 };
      
      default:
        return { error: true, message: 'Invalid operation' };
    }
  },
};

// ============= DATA TRANSFORMATION TOOL =============

export const dataTransformTool: Tool = {
  name: 'transform_data',
  description: 'Transform data between different formats',
  parameters: z.object({
    data: z.any().describe('Input data to transform'),
    fromFormat: z.enum(['json', 'csv', 'xml', 'yaml', 'markdown']),
    toFormat: z.enum(['json', 'csv', 'xml', 'yaml', 'markdown', 'table']),
    options: z.object({
      pretty: z.boolean().optional(),
      headers: z.boolean().optional(),
      delimiter: z.string().optional(),
    }).optional(),
  }),
  execute: async (params) => {
    try {
      let parsed: any;
      
      // Parse input format
      switch (params.fromFormat) {
        case 'json':
          parsed = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;
          break;
        case 'csv':
          // Simple CSV parsing
          const lines = (params.data as string).split('\n');
          const headers = lines[0].split(',');
          parsed = lines.slice(1).map((line: string) => {
            const values = line.split(',');
            return headers.reduce((obj: any, header: string, i: number) => {
              obj[header.trim()] = values[i]?.trim();
              return obj;
            }, {});
          });
          break;
        default:
          parsed = params.data;
      }
      
      // Convert to output format
      let result: any;
      switch (params.toFormat) {
        case 'json':
          result = params.options?.pretty 
            ? JSON.stringify(parsed, null, 2)
            : JSON.stringify(parsed);
          break;
        
        case 'csv':
          if (Array.isArray(parsed) && parsed.length > 0) {
            const headers = Object.keys(parsed[0]);
            const csv = [
              headers.join(','),
              ...parsed.map(row => headers.map(h => row[h]).join(','))
            ].join('\n');
            result = csv;
          } else {
            result = 'No data to convert';
          }
          break;
        
        case 'markdown':
          if (Array.isArray(parsed) && parsed.length > 0) {
            const headers = Object.keys(parsed[0]);
            const table = [
              `| ${headers.join(' | ')} |`,
              `| ${headers.map(() => '---').join(' | ')} |`,
              ...parsed.map(row => `| ${headers.map(h => row[h]).join(' | ')} |`)
            ].join('\n');
            result = table;
          } else {
            result = '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
          }
          break;
        
        default:
          result = parsed;
      }
      
      return { result, format: params.toFormat };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// ============= TOOL REGISTRY =============

export const AVAILABLE_TOOLS: Record<string, Tool> = {
  api_call: apiCallTool,
  web_scrape: webScrapeTool,
  database_query: databaseQueryTool,
  calculate: calculationTool,
  file_operations: fileOperationsTool,
  transform_data: dataTransformTool,
};

// Helper function to convert tools for OpenAI format
export function convertToolsForOpenAI(toolIds: string[]) {
  return toolIds
    .map(id => AVAILABLE_TOOLS[id])
    .filter(Boolean)
    .map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToOpenAISchema(tool.parameters),
      },
    }));
}

// Convert Zod schema to OpenAI function parameters
function zodToOpenAISchema(schema: z.ZodObject<any>): any {
  const shape = schema.shape;
  const properties: any = {};
  const required: string[] = [];
  
  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as any;
    
    // Check if required
    if (!zodType.isOptional()) {
      required.push(key);
    }
    
    // Map Zod types to JSON Schema
    if (zodType._def?.typeName === 'ZodString') {
      properties[key] = { 
        type: 'string', 
        description: zodType.description,
      };
    } else if (zodType._def?.typeName === 'ZodNumber') {
      properties[key] = { type: 'number', description: zodType.description };
    } else if (zodType._def?.typeName === 'ZodBoolean') {
      properties[key] = { type: 'boolean', description: zodType.description };
    } else if (zodType._def?.typeName === 'ZodEnum') {
      properties[key] = { 
        type: 'string', 
        enum: zodType._def.values,
        description: zodType.description 
      };
    } else if (zodType._def?.typeName === 'ZodArray') {
      properties[key] = { 
        type: 'array',
        items: { type: 'string' }, // Simplified
        description: zodType.description 
      };
    } else if (zodType._def?.typeName === 'ZodObject') {
      properties[key] = { 
        type: 'object',
        description: zodType.description 
      };
    } else {
      properties[key] = { type: 'string', description: zodType.description };
    }
  }
  
  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}