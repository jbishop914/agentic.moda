// Test script for image generation functionality
// Run this with: node scripts/test-image-generation.js

async function testImageGeneration() {
  console.log('🎨 Testing Agentic.Moda Image Generation\n');
  console.log('Make sure you have added your Replicate API key to .env.local\n');
  
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
  
  if (!apiKey || apiKey === 'YOUR_REPLICATE_API_KEY_HERE') {
    console.error('⚠️  Please add your actual Replicate API key to .env.local');
    console.error('   Get your API key from: https://replicate.com/account/api-tokens');
    console.error('   Then replace YOUR_REPLICATE_API_KEY_HERE with your actual key');
    return;
  }

  // Test basic image generation
  console.log('Testing Flux Pro model...');
  
  try {
    const response = await fetch('http://localhost:3000/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a beautiful landscape with mountains and a lake at sunset',
        model: 'flux-pro',
        aspectRatio: '16:9',
        numOutputs: 1,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Success! Image generated:');
      console.log('   URL:', data.images[0]);
      console.log('   Prediction ID:', data.predictionId);
    } else {
      console.log('❌ Failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Run the test
console.log('Starting test...\n');
testImageGeneration();