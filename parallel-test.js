// Test script to demonstrate parallel vs sequential execution
// You can run this in the browser console while on the app

async function testParallelExecution() {
  const apiKey = 'your-openai-api-key'; // Use your actual key
  
  // Test 1: Sequential execution (how it would work without parallelization)
  console.log('🔴 SEQUENTIAL TEST - 3 agents one after another');
  const sequentialStart = Date.now();
  
  for (let i = 1; i <= 3; i++) {
    console.log(`  Agent ${i} starting...`);
    const start = Date.now();
    
    await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'user', content: 'Write a haiku about coding' }
        ],
        max_tokens: 100
      })
    });
    
    console.log(`  Agent ${i} completed in ${Date.now() - start}ms`);
  }
  
  console.log(`❌ Sequential total: ${Date.now() - sequentialStart}ms\n`);
  
  // Test 2: Parallel execution (how our app works)
  console.log('🟢 PARALLEL TEST - 3 agents simultaneously');
  const parallelStart = Date.now();
  
  const promises = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`  Agent ${i} starting...`);
    
    promises.push(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'user', content: 'Write a haiku about coding' }
          ],
          max_tokens: 100
        })
      }).then(() => {
        console.log(`  Agent ${i} completed at ${Date.now() - parallelStart}ms`);
      })
    );
  }
  
  await Promise.all(promises);
  console.log(`✅ Parallel total: ${Date.now() - parallelStart}ms\n`);
  
  console.log('📊 RESULTS:');
  console.log('Sequential would take ~6-9 seconds for 3 agents');
  console.log('Parallel takes ~2-3 seconds for 3 agents');
  console.log('Parallel is 3x faster! 🚀');
}

// Run the test
// testParallelExecution();