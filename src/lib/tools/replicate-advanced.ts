// Advanced Replicate Features based on Official API Documentation
// Implements webhooks, streaming, and optimization strategies

import { z } from 'zod';

// Webhook configuration for async predictions
export interface WebhookConfig {
  url: string;
  events: ('start' | 'output' | 'logs' | 'completed')[];
}

// Enhanced prediction options
export interface PredictionOptions {
  webhook?: WebhookConfig;
  webhook_events_filter?: string[];
  stream?: boolean;
  prefer_wait?: number; // Sync mode: wait up to N seconds (1-60)
}

/**
 * Create a prediction with advanced options
 * Based on official Replicate API documentation
 */
export async function createPredictionAdvanced(
  version: string,
  input: any,
  options: PredictionOptions = {},
  apiKey?: string
) {
  const headers: any = {
    'Authorization': `Token ${apiKey || process.env.REPLICATE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Add sync mode header if specified
  if (options.prefer_wait) {
    headers['Prefer'] = `wait=${Math.min(60, Math.max(1, options.prefer_wait))}`;
  }

  const body: any = {
    version,
    input,
  };

  // Add webhook configuration
  if (options.webhook) {
    body.webhook = options.webhook.url;
    body.webhook_events_filter = options.webhook.events;
  }

  // Add streaming flag (deprecated but still supported)
  if (options.stream) {
    body.stream = true;
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create prediction');
  }

  return response.json();
}

/**
 * Stream prediction output using Server-Sent Events
 * This is more efficient for real-time output streaming
 */
export async function streamPrediction(
  predictionId: string,
  onData: (data: string) => void,
  apiKey?: string
) {
  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: {
        'Authorization': `Token ${apiKey || process.env.REPLICATE_API_KEY}`,
        'Accept': 'text/event-stream',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to stream prediction');
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        onData(data);
      }
    }
  }
}

/**
 * Batch create predictions for parallel processing
 * Uses multiple API keys for maximum throughput
 */
export async function batchCreatePredictions(
  predictions: Array<{ version: string; input: any }>,
  apiKeys: string[]
): Promise<any[]> {
  const results = await Promise.all(
    predictions.map(async (pred, index) => {
      const apiKey = apiKeys[index % apiKeys.length];
      
      try {
        return await createPredictionAdvanced(
          pred.version,
          pred.input,
          { prefer_wait: 10 }, // Use sync mode for faster results
          apiKey
        );
      } catch (error) {
        console.error(`Prediction ${index} failed:`, error);
        return { error: true, message: (error as Error).message };
      }
    })
  );
  
  return results;
}

/**
 * Get model details with caching
 * Useful for getting input/output schemas
 */
const modelCache = new Map<string, any>();

export async function getModelDetails(
  modelOwner: string,
  modelName: string,
  apiKey?: string
) {
  const cacheKey = `${modelOwner}/${modelName}`;
  
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey);
  }
  
  const response = await fetch(
    `https://api.replicate.com/v1/models/${modelOwner}/${modelName}`,
    {
      headers: {
        'Authorization': `Token ${apiKey || process.env.REPLICATE_API_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to get model details');
  }
  
  const model = await response.json();
  modelCache.set(cacheKey, model);
  
  return model;
}

/**
 * Get model input schema for validation
 */
export async function getModelInputSchema(
  modelOwner: string,
  modelName: string
): Promise<any> {
  const model = await getModelDetails(modelOwner, modelName);
  return model.latest_version?.openapi_schema?.components?.schemas?.Input;
}

/**
 * Validate input against model schema before sending
 */
export async function validateModelInput(
  modelOwner: string,
  modelName: string,
  input: any
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const schema = await getModelInputSchema(modelOwner, modelName);
    
    if (!schema) {
      return { valid: true }; // No schema to validate against
    }
    
    const errors: string[] = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }
    
    // Check field types (basic validation)
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in input) {
          const value = input[field];
          const expectedType = (fieldSchema as any).type;
          
          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field ${field} should be a string`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field ${field} should be a number`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Field ${field} should be a boolean`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Schema validation error:', error);
    return { valid: true }; // Don't block on validation errors
  }
}

/**
 * Cancel a running prediction
 */
export async function cancelPrediction(
  predictionId: string,
  apiKey?: string
): Promise<void> {
  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey || process.env.REPLICATE_API_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to cancel prediction');
  }
}

/**
 * List all available hardware SKUs
 */
export async function listHardware(apiKey?: string): Promise<any[]> {
  const response = await fetch('https://api.replicate.com/v1/hardware', {
    headers: {
      'Authorization': `Token ${apiKey || process.env.REPLICATE_API_KEY}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to list hardware');
  }
  
  return response.json();
}

// Export all advanced features
export const ReplicateAdvanced = {
  createPredictionAdvanced,
  streamPrediction,
  batchCreatePredictions,
  getModelDetails,
  getModelInputSchema,
  validateModelInput,
  cancelPrediction,
  listHardware,
};