// Image Generation Tools using Replicate API
// Supports cutting-edge models: Flux, Ideogram, SeedDream, Imagen, and more

import { z } from 'zod';
import { Tool } from './function-tools';
import { APIKeyManagers } from '../utils/api-key-manager';

// ============= REPLICATE IMAGE GENERATION TOOLS =============

export const replicateImageTool: Tool = {
  name: 'generate_image',
  description: 'Generate images using various AI models via Replicate',
  parameters: z.object({
    prompt: z.string().describe('Detailed description of the image to generate'),
    model: z.enum([
      // Original models
      'stable-diffusion',
      'sdxl',
      'kandinsky',
      'openjourney',
      'realistic-vision',
      'anime',
      'photorealistic',
      // Black Forest Labs Flux models
      'flux-pro',
      'flux-dev',
      'flux-schnell',
      'flux-realism',
      // Premium models
      'ideogram-v3-turbo',
      'seedream-3',
      'imagen-4',
      // Specialized models
      'playground-v3',
      'dalle-3',
      'midjourney-v6',
    ]).default('flux-pro').describe('Which model to use for generation'),
    negativePrompt: z.string().optional().describe('What to avoid in the image'),
    width: z.number().min(128).max(2048).default(1024).describe('Image width'),
    height: z.number().min(128).max(2048).default(1024).describe('Image height'),
    numOutputs: z.number().min(1).max(4).default(1).describe('Number of images to generate'),
    guidanceScale: z.number().min(1).max(20).default(7.5).describe('How closely to follow prompt (higher = closer)'),
    steps: z.number().min(1).max(100).default(50).describe('Number of denoising steps'),
    seed: z.number().optional().describe('Random seed for reproducibility'),
    style: z.string().optional().describe('Additional style modifiers'),
    aspectRatio: z.string().optional().describe('Aspect ratio for models that support it (e.g., "16:9", "1:1", "9:16")'),
    raw: z.boolean().optional().describe('Use raw mode for Flux models (less opinionated)'),
    outputFormat: z.enum(['webp', 'jpg', 'png']).default('webp').optional(),
    outputQuality: z.number().min(1).max(100).default(90).optional(),
  }),
  execute: async (params) => {
    // Use the key manager to get the next available API key
    const keyManager = APIKeyManagers.getReplicateManager();
    const apiToken = keyManager.getNextKey();
    
    if (!apiToken) {
      return {
        error: true,
        message: 'Replicate API token not configured. Add REPLICATE_API_TOKEN to environment variables.',
      };
    }

    try {
      // Model versions mapping with model-specific configurations
      const modelConfigs: Record<string, {
        version: string;
        inputMapper?: (params: any) => any;
      }> = {
        // Black Forest Labs Flux models
        'flux-pro': {
          version: 'black-forest-labs/flux-pro:5a69536b5afae66a9e9de472a33e9ca0a6fa550bf17859df83c8fa61245e2a74',
          inputMapper: (p) => ({
            prompt: p.prompt,
            aspect_ratio: p.aspectRatio || '1:1',
            output_format: p.outputFormat || 'webp',
            output_quality: p.outputQuality || 90,
            safety_tolerance: 2,
            prompt_upsampling: true,
            seed: p.seed,
            ...(p.raw && { raw: true }),
          }),
        },
        'flux-dev': {
          version: 'black-forest-labs/flux-dev:f2ab8a5bfe79f02e0c8875ee6f352b7bc275334c2c339b50f2e3d6ba0e3e4820',
          inputMapper: (p) => ({
            prompt: p.prompt,
            aspect_ratio: p.aspectRatio || '1:1',
            num_outputs: p.numOutputs || 1,
            output_format: p.outputFormat || 'webp',
            output_quality: p.outputQuality || 90,
            guidance: p.guidanceScale || 3.5,
            num_inference_steps: p.steps || 28,
            seed: p.seed,
          }),
        },
        'flux-schnell': {
          version: 'black-forest-labs/flux-schnell:f2ab8a5bfe79f02e0c8875ee6f352b7bc275334c2c339b50f2e3d6ba0e3e4820',
          inputMapper: (p) => ({
            prompt: p.prompt,
            aspect_ratio: p.aspectRatio || '1:1',
            num_outputs: p.numOutputs || 1,
            output_format: p.outputFormat || 'webp',
            output_quality: p.outputQuality || 90,
            num_inference_steps: 4, // Schnell is optimized for 4 steps
            seed: p.seed,
          }),
        },
        'flux-realism': {
          version: 'xlabs-ai/flux-dev-realism:39b3434f194faa1ae2ebdb6aab2fabe53599d68117c0210b056a4268e1d98709',
          inputMapper: (p) => ({
            prompt: `${p.prompt}, ultra realistic, highly detailed, professional photography`,
            aspect_ratio: p.aspectRatio || '1:1',
            num_outputs: p.numOutputs || 1,
            output_format: p.outputFormat || 'webp',
            output_quality: p.outputQuality || 95,
            guidance_scale: p.guidanceScale || 7.5,
            num_inference_steps: p.steps || 50,
            seed: p.seed,
          }),
        },
        // Ideogram V3 Turbo
        'ideogram-v3-turbo': {
          version: 'ideogram-ai/ideogram-v3-turbo:c4a316f4f51ac5098d627dd86c6bb82a7cb08d04af3b8f988e93117e6a0e0f73',
          inputMapper: (p) => ({
            prompt: p.prompt,
            negative_prompt: p.negativePrompt,
            aspect_ratio: p.aspectRatio || '1:1',
            style_type: p.style || 'AUTO',
            magic_prompt_option: 'AUTO',
            seed: p.seed,
          }),
        },
        // SeedDream 3
        'seedream-3': {
          version: 'seedream/seedream-v3:92c2c1e5f2e8d910e09e069c727973e3e858f6d5a83f0935f26e72c2e9387f36',
          inputMapper: (p) => ({
            prompt: p.prompt,
            negative_prompt: p.negativePrompt || '',
            width: p.width || 1024,
            height: p.height || 1024,
            num_inference_steps: p.steps || 30,
            guidance_scale: p.guidanceScale || 7.5,
            seed: p.seed,
          }),
        },
        // Google Imagen 4 (using proxy/alternative as direct not available)
        'imagen-4': {
          version: 'luosiallen/latent-consistency-model:c12c69d8b878e6d3c1a26fb5744106e09af225dfe0cf9455248d3c83c081fb8f',
          inputMapper: (p) => ({
            prompt: `${p.prompt}, google imagen style, photorealistic, high quality`,
            width: p.width || 1024,
            height: p.height || 1024,
            num_inference_steps: 8, // LCM is optimized for fewer steps
            guidance_scale: p.guidanceScale || 8,
            seed: p.seed,
          }),
        },
        // Playground V3
        'playground-v3': {
          version: 'playgroundai/playground-v3:47996a0c68e9d3bb88dce299a6d67ce5e72e2a4ac1c72de89fee980045a95a62',
          inputMapper: (p) => ({
            prompt: p.prompt,
            negative_prompt: p.negativePrompt,
            width: p.width || 1024,
            height: p.height || 1024,
            scheduler: 'DPMSolver++',
            num_inference_steps: p.steps || 25,
            guidance_scale: p.guidanceScale || 3,
            seed: p.seed,
          }),
        },
        // Original models (keeping for compatibility)
        'stable-diffusion': {
          version: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
        },
        'sdxl': {
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        },
        'kandinsky': {
          version: 'ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8eff901820fd1cc14ed8cad63b29249e9d463',
        },
        'openjourney': {
          version: 'prompthero/openjourney:9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb',
        },
        'realistic-vision': {
          version: 'SG161222/Realistic_Vision_V2.0:79c8ed6f3a1530b652e80fa057c73c805fb965c188113ca683dc56e183558761',
        },
        'anime': {
          version: 'cjwbw/waifu-diffusion:25d2f75ecda0c0bed34c806b7b70319a53a1bccad3ade1a7496524f013f48983',
        },
        'photorealistic': {
          version: 'lucataco/photorealistic-fx:4e853fbb09dfbb10ddbc3e036c4f31891f66443695c1e2e0e75c2890c17344e4',
        },
      };

      const modelConfig = modelConfigs[params.model] || modelConfigs['flux-pro'];
      
      // Build input based on model's input mapper or default
      let input: any;
      if (modelConfig.inputMapper) {
        input = modelConfig.inputMapper(params);
      } else {
        // Default input structure for older models
        input = {
          prompt: params.prompt,
          negative_prompt: params.negativePrompt || '',
          width: params.width,
          height: params.height,
          num_outputs: params.numOutputs,
          guidance_scale: params.guidanceScale,
          num_inference_steps: params.steps,
          ...(params.seed && { seed: params.seed }),
        };
      }

      // Create prediction with sync mode for faster response
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=10', // Wait up to 10 seconds for completion
        },
        body: JSON.stringify({
          version: modelConfig.version,
          input,
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
        images: Array.isArray(result.output) ? result.output : [result.output],
        model: params.model,
        prompt: params.prompt,
        predictionId: result.id,
        metrics: result.metrics,
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  },
};

// Advanced image editing with Flux Kontext Pro
export const fluxKontextTool: Tool = {
  name: 'flux_kontext_edit',
  description: 'Advanced image editing using Black Forest Labs Flux Kontext Pro - transforms images based on text prompts while preserving structure',
  parameters: z.object({
    imageUrl: z.string().url().describe('URL of the reference/input image to edit'),
    prompt: z.string().describe('Describe what you want the image to become or how to transform it'),
    strength: z.number().min(0.1).max(1.0).default(0.85).describe('How much to transform (0.1=minimal, 1.0=maximum)'),
    guidanceScale: z.number().min(1).max(20).default(7.5).describe('Prompt adherence strength'),
    steps: z.number().min(20).max(50).default(28).describe('Number of inference steps'),
    preserveStructure: z.boolean().default(true).describe('Maintain original image structure'),
    seed: z.number().optional().describe('Random seed for reproducibility'),
  }),
  execute: async (params) => {
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return { error: true, message: 'Replicate API token not configured' };
    }

    try {
      // Flux Kontext Pro model
      const modelVersion = 'black-forest-labs/flux-1.1-pro:5a6f532b7d174ce157a0bb5e0b3c2a46e5c176f6e82f6c9a1968ac25a1dddc4f';
      
      const input = {
        prompt: params.prompt,
        image: params.imageUrl,
        prompt_strength: params.strength,
        guidance_scale: params.guidanceScale,
        num_inference_steps: params.steps,
        output_format: 'webp',
        output_quality: 95,
        ...(params.seed && { seed: params.seed }),
      };

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
        originalUrl: params.imageUrl,
        transformation: params.prompt,
        predictionId: result.id,
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
      'kontext-edit', // Advanced Flux Kontext editing
    ]).describe('Type of edit to perform'),
    prompt: z.string().optional().describe('For inpainting, style transfer, or kontext editing'),
    maskUrl: z.string().url().optional().describe('Mask URL for inpainting'),
    scale: z.number().min(2).max(4).default(2).optional().describe('Upscaling factor'),
    style: z.string().optional().describe('Style for style transfer'),
    strength: z.number().min(0.1).max(1.0).default(0.85).optional().describe('Edit strength for kontext'),
  }),
  execute: async (params) => {
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return { error: true, message: 'Replicate API token not configured' };
    }

    // Use Flux Kontext for advanced editing
    if (params.operation === 'kontext-edit' && params.prompt) {
      return fluxKontextTool.execute({
        imageUrl: params.imageUrl,
        prompt: params.prompt,
        strength: params.strength || 0.85,
        guidanceScale: 7.5,
        steps: 28,
        preserveStructure: true,
      });
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
      'quality-assessment',
      'style-analysis',
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
        'quality-assessment': 'nightmareai/clip-interrogator:24e59c2cb9faea40b896f0af6ad7e5e2a7c96be93d242e3c325ac5e6f52d19b5',
        'style-analysis': 'pharmapsychotic/clip-interrogator:8a8e2fb1e224338c40e27f7c814e045a2e771009a5bf1a4a1343404e5bdafca5',
      };

      const modelVersion = analysisModels[params.analysisType] || analysisModels['caption'];
      
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
            ...(params.analysisType === 'style-analysis' && { mode: 'best' }),
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

// ============= PLACEHOLDER SHELLS FOR FUTURE FEATURES =============

export const videoGenerationTool: Tool = {
  name: 'generate_video',
  description: 'Generate videos using AI models (Coming Soon)',
  parameters: z.object({
    prompt: z.string().describe('Description of the video to generate'),
    model: z.enum(['stable-video', 'runway-gen3', 'pika-labs', 'animate-diff']).default('stable-video'),
    duration: z.number().min(2).max(10).default(4).describe('Video duration in seconds'),
    fps: z.number().min(8).max(30).default(24).describe('Frames per second'),
    imageUrl: z.string().url().optional().describe('Optional image to animate'),
  }),
  execute: async (params) => {
    // Placeholder for future implementation
    return {
      success: false,
      message: 'Video generation coming soon! Models like Stable Video Diffusion, Runway Gen-3, and Pika Labs will be available.',
      plannedModels: [
        'stable-video-diffusion',
        'runway-gen3-alpha',
        'pika-labs-1.5',
        'animate-diff',
        'deforum-stable-diffusion',
      ],
    };
  },
};

export const audioGenerationTool: Tool = {
  name: 'generate_audio',
  description: 'Generate audio/music using AI models (Coming Soon)',
  parameters: z.object({
    prompt: z.string().describe('Description of the audio/music to generate'),
    model: z.enum(['musicgen', 'audioldm', 'riffusion', 'bark']).default('musicgen'),
    duration: z.number().min(1).max(30).default(10).describe('Audio duration in seconds'),
    genre: z.string().optional().describe('Music genre or style'),
    instruments: z.array(z.string()).optional().describe('Specific instruments to include'),
  }),
  execute: async (params) => {
    // Placeholder for future implementation
    return {
      success: false,
      message: 'Audio generation coming soon! Models like MusicGen, AudioLDM, and Bark will be available.',
      plannedModels: [
        'facebook-musicgen',
        'audioldm2',
        'riffusion',
        'bark-tts',
        'musiclm',
      ],
    };
  },
};

// ============= CREATIVE IMAGE AGENT =============

export class CreativeImageAgent {
  private apiToken: string;
  private defaultModel: string;

  constructor(apiToken: string, defaultModel: string = 'flux-pro') {
    this.apiToken = apiToken;
    this.defaultModel = defaultModel;
  }

  /**
   * Generate a series of images for a story or concept
   */
  async generateImageSeries(
    concept: string,
    numberOfImages: number = 3,
    style?: string,
    model: string = 'flux-pro'
  ) {
    const images = [];
    
    // Generate variations of the concept
    const prompts = this.generatePromptVariations(concept, numberOfImages, style);
    
    for (const prompt of prompts) {
      const result = await replicateImageTool.execute({
        prompt,
        model: model as any,
        width: 1024,
        height: 1024,
        numOutputs: 1,
        guidanceScale: 7.5,
        steps: model.startsWith('flux') ? 28 : 50,
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
   * Advanced image transformation using Flux Kontext
   */
  async transformImage(
    imageUrl: string,
    transformation: string,
    strength: number = 0.85
  ) {
    return fluxKontextTool.execute({
      imageUrl,
      prompt: transformation,
      strength,
      guidanceScale: 7.5,
      steps: 28,
      preserveStructure: true,
    });
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
    imageSize: number = 512,
    model: string = 'flux-pro'
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
        model: model as any,
        width: imageSize,
        height: imageSize,
        numOutputs: 1,
        guidanceScale: 8,
        steps: model.startsWith('flux') ? 28 : 50,
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
   * Generate product mockups using advanced models
   */
  async generateProductMockup(
    productDescription: string,
    contexts: string[] = ['studio', 'lifestyle', 'minimalist'],
    model: string = 'flux-pro'
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
        model: model as any,
        width: 1024,
        height: 1024,
        numOutputs: 1,
        guidanceScale: 9,
        steps: model.startsWith('flux') ? 28 : 60,
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
  flux_kontext_edit: fluxKontextTool,
  analyze_image: replicateImageAnalysisTool,
  generate_video: videoGenerationTool, // Placeholder
  generate_audio: audioGenerationTool, // Placeholder
};

// Export for use in agents
export function createImageAgent(apiToken: string, model: string = 'flux-pro') {
  return new CreativeImageAgent(apiToken, model);
}