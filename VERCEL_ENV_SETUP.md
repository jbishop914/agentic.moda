# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to your Vercel project settings:

### Core AI APIs
```
OPENAI_API_KEY=sk-...your-key...
OPENAI_API_KEY_2=sk-...your-second-key...
OPENAI_API_KEY_3=sk-...your-third-key...

REPLICATE_API_KEY=r8_...your-key...
REPLICATE_API_KEY_2=r8_...your-second-key...
REPLICATE_API_KEY_3=r8_...your-third-key...

ANTHROPIC_API_KEY=sk-ant-...your-key...
```

### Supabase (Database)
```
NEXT_PUBLIC_SUPABASE_URL=https://fqahqwodkunntpsgwqon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-key...
```

### Optional Services
```
GITHUB_TOKEN=ghp_...your-token...
```

## How to Add to Vercel:

1. Go to: https://vercel.com/[your-username]/agentic-moda/settings/environment-variables
2. Add each variable one by one
3. Select environments: ✅ Production, ✅ Preview, ✅ Development
4. Click "Save" for each
5. **Redeploy** your application

## To Redeploy After Adding Variables:

1. Go to Deployments tab
2. Find the latest deployment
3. Click the 3 dots menu
4. Select "Redeploy"
5. Wait for deployment to complete

## Testing After Deployment:

1. Open browser console (F12)
2. Go to Network tab
3. Try the architecture pipeline
4. Check the `/api/architecture` request
5. Should return 200 with image URLs

## If Still Not Working:

Check the Vercel Function Logs:
1. Go to Functions tab in Vercel dashboard
2. Click on the API route
3. View logs to see actual errors

Common issues:
- API keys not loaded (will show "No API keys available")
- Rate limits hit (will show rate limit error)
- Typo in environment variable names