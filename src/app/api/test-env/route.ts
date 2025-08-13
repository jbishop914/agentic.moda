import { NextResponse } from 'next/server';

export async function GET() {
  // Check which environment variables are available
  const envCheck = {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    apiKeys: {
      replicate: {
        key1: !!process.env.REPLICATE_API_KEY,
        key2: !!process.env.REPLICATE_API_KEY_2,
        key3: !!process.env.REPLICATE_API_KEY_3,
        public1: !!process.env.NEXT_PUBLIC_REPLICATE_API_KEY,
        public2: !!process.env.NEXT_PUBLIC_REPLICATE_API_KEY_2,
        public3: !!process.env.NEXT_PUBLIC_REPLICATE_API_KEY_3,
      },
      openai: {
        key1: !!process.env.OPENAI_API_KEY,
        key2: !!process.env.OPENAI_API_KEY_2,
        key3: !!process.env.OPENAI_API_KEY_3,
      },
      anthropic: {
        key1: !!process.env.ANTHROPIC_API_KEY,
      },
      supabase: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    },
    // Show first few characters of keys (for debugging, not full keys!)
    keyPrefixes: {
      replicate: process.env.REPLICATE_API_KEY?.substring(0, 5) || 'not-set',
      openai: process.env.OPENAI_API_KEY?.substring(0, 5) || 'not-set',
    }
  };

  return NextResponse.json(envCheck);
}