# 🚀 Vercel Deployment Guide

## Step 1: Clean Install Locally

```bash
# Remove node_modules and lock file
rmdir /s /q node_modules
del package-lock.json

# Fresh install with legacy peer deps
npm install --legacy-peer-deps
```

## Step 2: Push to GitHub

```bash
git add .
git commit -m "Remove react-flow-renderer, add .npmrc for Vercel"
git push
```

## Step 3: Configure Vercel

### Environment Variables (Required)
Add these in Vercel Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://fqahqwodkunntpsgwqon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Build Settings
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install --legacy-peer-deps`

## Step 4: Alternative - Minimal Production Build

If you still have issues, create a production branch with minimal dependencies:

```json
{
  "name": "agentic-moda",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "lucide-react": "^0.454.0",
    "next": "15.4.6",
    "openai": "^4.70.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.0"
  }
}
```

## Step 5: Vercel Deploy Button

Add this to your README for one-click deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fagentic.moda&env=OPENAI_API_KEY,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=API%20Keys%20for%20OpenAI%20and%20Supabase&project-name=agentic-moda&repository-name=agentic-moda)

## Troubleshooting

### If build fails with dependency errors:

1. **Use the .npmrc file** (already created) which forces legacy peer deps
2. **Remove unused dependencies** from package.json
3. **Try pnpm instead**: Vercel supports pnpm which handles peer deps better

In Vercel settings, change Install Command to:
```
pnpm install
```

### If LangChain causes issues:

The LangChain dependencies are heavy and not used in the main app. You can:
1. Remove them from package.json (already done above)
2. Move the agent implementations to API routes only
3. Use dynamic imports for heavy libraries

### Memory Issues:

If you get memory errors during build:
- Add to next.config.js:
```javascript
module.exports = {
  experimental: {
    outputFileTracingExcludes: {
      '*': ['node_modules/@swc/core-linux-x64-gnu'],
    },
  },
}
```

## Success Checklist

- ✅ Removed react-flow-renderer from package.json
- ✅ Added .npmrc with legacy-peer-deps=true
- ✅ All environment variables set in Vercel
- ✅ Using Next.js 15.4.6 (latest stable)
- ✅ Clean node_modules and package-lock.json before deploy

The app should now deploy successfully to Vercel!