// Advanced Parallel Image Generation Examples
// Demonstrates the power of multiple API keys for parallel processing

import { APIKeyManagers, generateImagesInParallel } from '../src/lib/utils/api-key-manager';
import { replicateImageTool, fluxKontextTool } from '../src/lib/tools/image-tools';

// Example 1: Generate a mood board with 9 images in parallel
async function generateMoodBoard(theme: string) {
  console.log(`🎨 Generating mood board for: ${theme}\n`);
  
  const aspects = [
    'color palette and textures',
    'architectural elements',
    'natural lighting',
    'materials and surfaces',
    'lifestyle and atmosphere',
    'geometric patterns',
    'organic shapes',
    'contrast and shadows',
    'overall composition'
  ];
  
  const prompts = aspects.map(aspect => 
    `${theme}, focusing on ${aspect}, professional photography, high quality, 8k`
  );
  
  console.log('Using parallel processing with multiple API keys...');
  const startTime = Date.now();
  
  // This will use up to 3 API keys in parallel!
  const results = await generateImagesInParallel(prompts, 'flux-pro');
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Generated ${results.length} images in ${duration}s (3x faster with parallel keys!)\n`);
  
  return results;
}

// Example 2: Generate variations of a concept using different models simultaneously
async function generateConceptVariations(concept: string) {
  console.log(`🚀 Generating variations of: ${concept}\n`);
  
  const keyManager = APIKeyManagers.getReplicateManager();
  const keys = keyManager.getParallelKeys(3);
  
  // Run 3 different models at the same time using different keys
  const variations = await Promise.all([
    // Flux Pro - Best quality
    generateWithKey(keys[0], concept, 'flux-pro'),
    
    // Ideogram - Best for text
    generateWithKey(keys[1], concept + ' with elegant typography', 'ideogram-v3-turbo'),
    
    // Flux Realism - Photorealistic
    generateWithKey(keys[2], concept + ' ultra realistic photography', 'flux-realism')
  ]);
  
  console.log('✅ Generated 3 variations using different models simultaneously!\n');
  return variations;
}

// Example 3: Batch process multiple images with Flux Kontext
async function batchEditImages(imageUrls: string[], transformation: string) {
  console.log(`✏️ Batch editing ${imageUrls.length} images\n`);
  
  const keyManager = APIKeyManagers.getReplicateManager();
  const keys = keyManager.getParallelKeys(imageUrls.length);
  
  const edits = await Promise.all(
    imageUrls.map(async (url, index) => {
      const apiKey = keys[index % keys.length];
      
      // Direct API call with specific key
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-1.1-pro:5a6f532b7d174ce157a0bb5e0b3c2a46e5c176f6e82f6c9a1968ac25a1dddc4f',
          input: {
            image: url,
            prompt: transformation,
            prompt_strength: 0.85,
            output_format: 'webp',
            output_quality: 95
          }
        })
      });
      
      return response.json();
    })
  );
  
  console.log(`✅ Edited ${edits.length} images in parallel!\n`);
  return edits;
}

// Example 4: Architecture pipeline with parallel rendering
async function generateArchitectureDesign(description: string) {
  console.log(`🏗️ Generating complete architecture design\n`);
  
  const keyManager = APIKeyManagers.getReplicateManager();
  const keys = keyManager.getParallelKeys(4);
  
  // Generate 4 different views simultaneously
  const views = await Promise.all([
    // Floorplan
    generateWithKey(keys[0], 
      `architectural floorplan, technical drawing, ${description}, top view, measurements`,
      'flux-pro'
    ),
    
    // Exterior
    generateWithKey(keys[1],
      `modern house exterior, ${description}, architectural photography, golden hour`,
      'flux-realism'
    ),
    
    // Interior
    generateWithKey(keys[2],
      `modern interior design, ${description}, professional photography, natural lighting`,
      'flux-realism'
    ),
    
    // Aerial
    generateWithKey(keys[3],
      `aerial view, ${description}, drone photography, landscape context`,
      'flux-pro'
    )
  ]);
  
  console.log('✅ Generated complete architectural visualization in parallel!\n');
  return {
    floorplan: views[0],
    exterior: views[1],
    interior: views[2],
    aerial: views[3]
  };
}

// Helper function to generate with a specific API key
async function generateWithKey(apiKey: string, prompt: string, model: string) {
  const modelVersions: Record<string, string> = {
    'flux-pro': 'black-forest-labs/flux-pro:5a69536b5afae66a9e9de472a33e9ca0a6fa550bf17859df83c8fa61245e2a74',
    'flux-realism': 'xlabs-ai/flux-dev-realism:39b3434f194faa1ae2ebdb6aab2fabe53599d68117c0210b056a4268e1d98709',
    'ideogram-v3-turbo': 'ideogram-ai/ideogram-v3-turbo:c4a316f4f51ac5098d627dd86c6bb82a7cb08d04af3b8f988e93117e6a0e0f73',
  };
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: modelVersions[model] || modelVersions['flux-pro'],
      input: { 
        prompt,
        aspect_ratio: '1:1',
        output_format: 'webp',
        output_quality: 90
      }
    })
  });
  
  const prediction = await response.json();
  
  // Poll for completion
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      {
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
      }
    );
    
    result = await statusResponse.json();
  }
  
  return result.output;
}

// Example 5: Monitor API key usage
function monitorKeyUsage() {
  const replicateManager = APIKeyManagers.getReplicateManager();
  const openaiManager = APIKeyManagers.getOpenAIManager();
  
  console.log('📊 API Key Usage Statistics:\n');
  
  console.log('Replicate Keys:');
  console.log(replicateManager.getUsageStats());
  
  console.log('\nOpenAI Keys:');
  console.log(openaiManager.getUsageStats());
}

// Main execution
async function main() {
  console.log('🚀 Advanced Parallel Image Generation Demo\n');
  console.log('This demo shows how multiple API keys enable true parallel processing\n');
  
  try {
    // Test 1: Mood board (9 images in parallel)
    await generateMoodBoard('futuristic cyberpunk city');
    
    // Test 2: Multi-model variations
    await generateConceptVariations('a magical forest portal');
    
    // Test 3: Architecture pipeline
    await generateArchitectureDesign('modern 3-bedroom house with open concept living');
    
    // Show usage stats
    monitorKeyUsage();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  generateMoodBoard,
  generateConceptVariations,
  batchEditImages,
  generateArchitectureDesign,
  monitorKeyUsage
};