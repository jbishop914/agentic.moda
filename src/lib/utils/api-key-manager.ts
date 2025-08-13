// API Key Manager for intelligent key rotation and parallel processing
// Manages multiple API keys for rate limit optimization and parallel execution

export class APIKeyManager {
  private keys: string[];
  private currentIndex: number = 0;
  private keyUsage: Map<string, { count: number; lastUsed: Date }> = new Map();
  private rateLimits: Map<string, { limit: number; window: number }> = new Map();

  constructor(keys: string[], rateLimit: number = 100, windowMs: number = 60000) {
    this.keys = keys.filter(key => key && key !== 'YOUR_API_KEY_HERE');
    
    // Initialize tracking for each key
    this.keys.forEach(key => {
      this.keyUsage.set(key, { count: 0, lastUsed: new Date() });
      this.rateLimits.set(key, { limit: rateLimit, window: windowMs });
    });
  }

  /**
   * Get the next available API key using round-robin with rate limit checking
   */
  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No API keys available');
    }

    // Try to find a key that's not rate limited
    for (let attempts = 0; attempts < this.keys.length; attempts++) {
      const key = this.keys[this.currentIndex];
      const usage = this.keyUsage.get(key)!;
      const rateLimit = this.rateLimits.get(key)!;
      
      // Check if we need to reset the counter (window has passed)
      const timeSinceLastUse = Date.now() - usage.lastUsed.getTime();
      if (timeSinceLastUse > rateLimit.window) {
        usage.count = 0;
      }
      
      // Check if this key is within rate limits
      if (usage.count < rateLimit.limit) {
        usage.count++;
        usage.lastUsed = new Date();
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        return key;
      }
      
      // Try next key
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }
    
    // All keys are rate limited, use the least recently used one
    console.warn('All API keys are rate limited, using LRU key');
    return this.getLeastRecentlyUsedKey();
  }

  /**
   * Get multiple keys for parallel execution
   */
  getParallelKeys(count: number): string[] {
    const availableKeys: string[] = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < Math.min(count, this.keys.length); i++) {
      let keyIndex = i;
      
      // Find an unused key
      while (usedIndices.has(keyIndex) && usedIndices.size < this.keys.length) {
        keyIndex = (keyIndex + 1) % this.keys.length;
      }
      
      if (!usedIndices.has(keyIndex)) {
        availableKeys.push(this.keys[keyIndex]);
        usedIndices.add(keyIndex);
        
        // Update usage
        const usage = this.keyUsage.get(this.keys[keyIndex])!;
        usage.count++;
        usage.lastUsed = new Date();
      }
    }
    
    return availableKeys;
  }

  /**
   * Get the least recently used key
   */
  private getLeastRecentlyUsedKey(): string {
    let oldestKey = this.keys[0];
    let oldestTime = this.keyUsage.get(oldestKey)!.lastUsed;
    
    for (const key of this.keys) {
      const usage = this.keyUsage.get(key)!;
      if (usage.lastUsed < oldestTime) {
        oldestTime = usage.lastUsed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Get usage statistics for monitoring
   */
  getUsageStats() {
    const stats: any = {};
    this.keys.forEach((key, index) => {
      const usage = this.keyUsage.get(key)!;
      const rateLimit = this.rateLimits.get(key)!;
      stats[`key_${index + 1}`] = {
        count: usage.count,
        lastUsed: usage.lastUsed,
        remaining: rateLimit.limit - usage.count,
        resetIn: Math.max(0, rateLimit.window - (Date.now() - usage.lastUsed.getTime()))
      };
    });
    return stats;
  }

  /**
   * Reset all counters (useful for testing)
   */
  reset() {
    this.keyUsage.forEach(usage => {
      usage.count = 0;
      usage.lastUsed = new Date();
    });
    this.currentIndex = 0;
  }
}

// Singleton instances for different services
export class APIKeyManagers {
  private static instances: Map<string, APIKeyManager> = new Map();

  static getReplicateManager(): APIKeyManager {
    if (!this.instances.has('replicate')) {
      const keys = [
        process.env.REPLICATE_API_KEY || process.env.NEXT_PUBLIC_REPLICATE_API_KEY,
        process.env.REPLICATE_API_KEY_2 || process.env.NEXT_PUBLIC_REPLICATE_API_KEY_2,
        process.env.REPLICATE_API_KEY_3 || process.env.NEXT_PUBLIC_REPLICATE_API_KEY_3,
      ].filter(Boolean) as string[];
      
      this.instances.set('replicate', new APIKeyManager(keys, 100, 60000));
    }
    return this.instances.get('replicate')!;
  }

  static getOpenAIManager(): APIKeyManager {
    if (!this.instances.has('openai')) {
      const keys = [
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_API_KEY_2,
        process.env.OPENAI_API_KEY_3,
      ].filter(Boolean) as string[];
      
      this.instances.set('openai', new APIKeyManager(keys, 500, 60000));
    }
    return this.instances.get('openai')!;
  }

  static getAnthropicManager(): APIKeyManager {
    if (!this.instances.has('anthropic')) {
      const keys = [
        process.env.ANTHROPIC_API_KEY,
        process.env.ANTHROPIC_API_KEY_2,
        process.env.ANTHROPIC_API_KEY_3,
      ].filter(Boolean) as string[];
      
      this.instances.set('anthropic', new APIKeyManager(keys, 100, 60000));
    }
    return this.instances.get('anthropic')!;
  }
}

// Helper function for parallel image generation
export async function generateImagesInParallel(
  prompts: string[],
  model: string = 'flux-pro'
): Promise<any[]> {
  const manager = APIKeyManagers.getReplicateManager();
  const keys = manager.getParallelKeys(prompts.length);
  
  const promises = prompts.map(async (prompt, index) => {
    const apiKey = keys[index % keys.length];
    
    // Use the specific API key for this request
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: getModelVersion(model),
        input: { prompt },
      }),
    });
    
    return response.json();
  });
  
  return Promise.all(promises);
}

// Model version helper
function getModelVersion(model: string): string {
  const versions: Record<string, string> = {
    'flux-pro': 'black-forest-labs/flux-pro:5a69536b5afae66a9e9de472a33e9ca0a6fa550bf17859df83c8fa61245e2a74',
    'flux-dev': 'black-forest-labs/flux-dev:f2ab8a5bfe79f02e0c8875ee6f352b7bc275334c2c339b50f2e3d6ba0e3e4820',
    'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  };
  return versions[model] || versions['flux-pro'];
}