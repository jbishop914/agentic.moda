// Image Generation Tools using Replicate API
// Supports multiple models: Stable Diffusion, DALL-E style, Midjourney style, etc.

import { z } from 'zod';
import { Tool } from './function-tools';

// ============= REPLICATE IMAGE GENERATION TOOLS =============

export const replicateImageTool: Tool = {
  name: 'generate_image',
  description: 'Generate images using various AI models via Replicate',
  parameters: z.object({
    prompt: z.string().describe('Detailed description of the image to generate'),
    model: z.enum([
      'stable-diffusion',
      'sdxl',
      'kandinsky',
      'openjourney',
      'realistic-vision',
      'anime',
      'photorealistic',
    ]).default('sdxl').describe('Which model to use for generation'),
    negativePrompt: z.string().optional().describe('What to avoid in the image'),
    width: z.number().min(128).max(2048).default(1024).describe('Image width'),
    height: z.number().min(128).max(2048).default(1024).describe('Image height'),
    numOutputs: z.number().min(1).max(4).default(1).describe('Number of images to generate'),
    guidanceScale: z.number().min(1).max(20).default(7.5).describe('How closely to follow prompt (higher = closer)'),
    steps: z.number().min(1).max(100).default(50).describe('Number of denoising steps'),
    seed: z.number().optional().describe('Random seed for reproducibility'),
    style: z.string().optional().describe('Additional style modifiers'),
  }),
  execute: async (params) => {
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return {
        error: true,
        message: 'Replicate API token not configured. Add REPLICATE_API_TOKEN to environment variables.',
      };
    }

    try {
      // Model versions mapping
      const modelVersions: Record<string, string> = {
        'stable-diffusion': 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
        'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        'kandinsky': 'ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8eff901820fd1cc14ed8cad63b29249e9d463',
        'openjourney': 'prompthero/openjourney:9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb',
        'realistic-vision': 'SG161222/Realistic_Vision_V2.0:79c8ed6f3a1530b652e80fa057c73c805fb965c188113ca683dc56e183558761',
        'anime': 'cjwbw/waifu-diffusion:25d2f75ecda0c0bed34c806b7b70319a53a1bccad3ade1a7496524f013f48983',
        'photorealistic': 'lucataco/photorealistic-fx:4e853fbb09dfbb10ddbc3e036c4f31891f66443695c1e2e0e75c2890c17344e4',
      };

      const modelVersion = modelVersions[params.model] || modelVersions['sdxl'];

      // Enhance prompt with style if provided
      let enhancedPrompt = params.prompt;
      if (params.style) {
        enhancedPrompt += `, ${params.style}`;
      }

      // Model-specific enhancements
      if (params.model === 'photorealistic') {
        enhancedPrompt += ', highly detailed, professional photography, 8k resolution';
      } else if (params.model === 'anime') {
        enhancedPrompt += ', anime style, manga, detailed illustration';
      }

      // Create prediction
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            prompt: enhancedPrompt,
            negative_prompt: params.negativePrompt || 'blurry, bad quality, distorted',
            width: params.width,
            height: params.height,
            num_outputs: params.numOutputs,
            guidance_scale: params.guidanceScale,
            num_inference_steps: params.steps,
            ...(params.seed && { seed: params.seed }),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create prediction');
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              'Authorization': `Token ${apiToken}`,
            },
          }
        );
        
        result = await statusResponse.json();
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Image generation failed');
      }

      return {
        success: true,
        images: result.output,
        model: params.model,
        prompt: enhancedPrompt,
        predictionId: result.id,
        metrics: result.metrics,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

export const replicateImageEditTool: Tool = {
  name: 'edit_image',
  description: 'Edit or transform existing images using AI',
  parameters: z.object({
    imageUrl: z.string().url().describe('URL of the image to edit'),
    operation: z.enum([
      'upscale',
      'remove-background',
      'colorize',
      'style-transfer',
      'inpaint',
      'face-restore',
    ]).describe('Type of edit to perform'),
    prompt: z.string().optional().describe('For inpainting or style transfer'),
    maskUrl: z.string().url().optional().describe('Mask URL for inpainting'),
    scale: z.number().min(2).max(4).default(2).optional().describe('Upscaling factor'),
    style: z.string().optional().describe('Style for style transfer'),
  }),
  execute: async (params) => {
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return { error: true, message: 'Replicate API token not configured' };
    }

    try {
      // Model mapping for different operations
      const operationModels: Record<string, string> = {
        'upscale': 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
        'remove-background': 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
        'colorize': 'arielreplicate/deoldify_image:0da600fab0c45a66211339f1c16b71345d22f9ef2a126e5c795d824aac71950a',
        'style-transfer': 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
        'inpaint': 'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
        'face-restore': 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
      };

      const modelVersion = operationModels[params.operation];
      
      // Build input based on operation
      let input: any = { img: params.imageUrl };
      
      switch (params.operation) {
        case 'upscale':
          input.scale = params.scale || 2;
          break;
        case 'inpaint':
          input.prompt = params.prompt;
          input.mask = params.maskUrl;
          break;
        case 'style-transfer':
          input.style = params.style;
          break;
      }

      // Create prediction
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelVersion,
          input,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prediction');
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              'Authorization': `Token ${apiToken}`,
            },
          }
        );
        
        result = await statusResponse.json();
      }

      if (result.status === 'failed') {
        throw new Error('Image editing failed');
      }

      return {
        success: true,
        outputUrl: result.output,
        operation: params.operation,
        predictionId: result.id,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

export const replicateImageAnalysisTool: Tool = {
  name: 'analyze_image',
  description: 'Analyze images to extract information, captions, or tags',
  parameters: z.object({
    imageUrl: z.string().url().describe('URL of the image to analyze'),
    analysisType: z.enum([
      'caption',
      'tags',
      'ocr',
      'face-detection',
      'object-detection',
      'nsfw-check',
    ]).describe('Type of analysis to perform'),
    detail: z.enum(['low', 'medium', 'high']).default('medium').optional(),
  }),
  execute: async (params) => {
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return { error: true, message: 'Replicate API token not configured' };
    }

    try {
      // Model mapping for different analysis types
      const analysisModels: Record<string, string> = {
        'caption': 'salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746',
        'tags': 'xinyu1205/recognize-anything:5a2de068f538590cd00ecbb1e1ac23521f5a566a4874c0607d35f6f5c5e344a0',
        'ocr': 'abiruyt/text-extract-ocr:a32904bed12e4c988ba02c901f4fb3fe8c3813ac46dd662db89f124c51c43dc5',
        'face-detection': 'abiruyt/face-detection:7d1dd85c1b979e60c87ebeda1b26e0bbef8233c4d59c8e1c946bf5a6e7e9e0f7',
        'object-detection': 'adirik/yolov8:9cf087c1f8b28630fc04f78bb4dfd73797fb92bb4e91f1c6aa86bb3f69d1a1c6',
        'nsfw-check': 'lucataco/nsfw-image-detection:5e97a040b1ba11e8ffc51a8072e18e51eb6da93e0b690b5d4c4e7bfc886d4523',
      };

      const modelVersion = analysisModels[params.analysisType];
      
      // Create prediction
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            image: params.imageUrl,
            ...(params.analysisType === 'caption' && { task: 'image_captioning' }),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prediction');
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              'Authorization': `Token ${apiToken}`,
            },
          }
        );
        
        result = await statusResponse.json();
      }

      if (result.status === 'failed') {
        throw new Error('Image analysis failed');
      }

      return {
        success: true,
        analysisType: params.analysisType,
        result: result.output,
        predictionId: result.id,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// ============= CREATIVE IMAGE AGENT =============

export class CreativeImageAgent {
  private apiToken: string;
  private defaultModel: string;

  constructor(apiToken: string, defaultModel: string = 'sdxl') {
    this.apiToken = apiToken;
    this.defaultModel = defaultModel;
  }

  /**
   * Generate a series of images for a story or concept
   */
  async generateImageSeries(
    concept: string,
    numberOfImages: number = 3,
    style?: string
  ) {
    const images = [];
    
    // Generate variations of the concept
    const prompts = this.generatePromptVariations(concept, numberOfImages, style);
    
    for (const prompt of prompts) {
      const result = await replicateImageTool.execute({
        prompt,
        model: this.defaultModel,
        width: 1024,
        height: 1024,
        numOutputs: 1,
        guidanceScale: 7.5,
        steps: 50,
        style,
      });
      
      if (result.success) {
        images.push({
          prompt,
          url: result.images[0],
          metadata: result.metrics,
        });
      }
    }
    
    return images;
  }

  /**
   * Generate prompt variations for a concept
   */
  private generatePromptVariations(
    concept: string,
    count: number,
    style?: string
  ): string[] {
    const variations = [];
    const angles = ['wide shot', 'close-up', 'aerial view', 'dramatic angle', 'portrait'];
    const times = ['dawn', 'midday', 'sunset', 'night', 'golden hour'];
    const moods = ['serene', 'dramatic', 'mysterious', 'vibrant', 'melancholic'];
    
    for (let i = 0; i < count; i++) {
      const angle = angles[i % angles.length];
      const time = times[i % times.length];
      const mood = moods[i % moods.length];
      
      let prompt = `${concept}, ${angle}, ${time} lighting, ${mood} atmosphere`;
      if (style) {
        prompt += `, ${style}`;
      }
      
      variations.push(prompt);
    }
    
    return variations;
  }

  /**
   * Create a mood board from a description
   */
  async createMoodBoard(
    theme: string,
    gridSize: number = 4,
    imageSize: number = 512
  ) {
    const aspects = [
      'color palette',
      'texture and materials',
      'architectural style',
      'natural elements',
      'lighting and atmosphere',
      'decorative details',
      'overall composition',
      'lifestyle elements',
    ];
    
    const images = [];
    const selectedAspects = aspects.slice(0, gridSize);
    
    for (const aspect of selectedAspects) {
      const prompt = `${theme}, focusing on ${aspect}, professional photography, high quality`;
      
      const result = await replicateImageTool.execute({
        prompt,
        model: 'photorealistic',
        width: imageSize,
        height: imageSize,
        numOutputs: 1,
        guidanceScale: 8,
        steps: 50,
      });
      
      if (result.success) {
        images.push({
          aspect,
          url: result.images[0],
          prompt,
        });
      }
    }
    
    return {
      theme,
      gridSize,
      images,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate product mockups
   */
  async generateProductMockup(
    productDescription: string,
    contexts: string[] = ['studio', 'lifestyle', 'minimalist']
  ) {
    const mockups = [];
    
    for (const context of contexts) {
      let prompt = '';
      
      switch (context) {
        case 'studio':
          prompt = `${productDescription}, professional studio photography, white background, soft lighting, high quality product shot`;
          break;
        case 'lifestyle':
          prompt = `${productDescription}, lifestyle photography, in use, natural setting, warm lighting`;
          break;
        case 'minimalist':
          prompt = `${productDescription}, minimalist composition, geometric shapes, modern aesthetic, clean background`;
          break;
        default:
          prompt = `${productDescription}, ${context}`;
      }
      
      const result = await replicateImageTool.execute({
        prompt,
        model: 'photorealistic',
        width: 1024,
        height: 1024,
        numOutputs: 1,
        guidanceScale: 9,
        steps: 60,
      });
      
      if (result.success) {
        mockups.push({
          context,
          url: result.images[0],
          prompt,
        });
      }
    }
    
    return mockups;
  }
}

// Export all image tools
export const IMAGE_GENERATION_TOOLS = {
  generate_image: replicateImageTool,
  edit_image: replicateImageEditTool,
  analyze_image: replicateImageAnalysisTool,
};

// Export for use in agents
export function createImageAgent(apiToken: string, model: string = 'sdxl') {
  return new CreativeImageAgent(apiToken, model);
}
