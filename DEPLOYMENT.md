# 🚀 Vercel Deployment Guide for Map Studio

## Prerequisites

1. **Git Repository** - Push your code to GitHub/GitLab/Bitbucket
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **ArcGIS Developer Account** - Get your API key from [developers.arcgis.com](https://developers.arcgis.com)

## Step 1: Prepare Environment Variables

Create a `.env.production` file (for reference, don't commit this):

```env
# ArcGIS API Key (Required for some features)
NEXT_PUBLIC_ARCGIS_API_KEY=your_arcgis_api_key_here

# Optional: Add other API keys as needed
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
```

## Step 2: Update package.json

Ensure your `package.json` has the correct build scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Production-ready Map Studio"
git push origin main
```

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or leave blank)
   - **Build Command**: `next build` (or leave default)
   - **Output Directory**: Leave default
4. Add Environment Variables:
   - Click "Environment Variables"
   - Add `NEXT_PUBLIC_ARCGIS_API_KEY` with your API key
   - Add any other required variables
5. Click "Deploy"

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Confirm settings
# - Deploy

# Add environment variables
vercel env add NEXT_PUBLIC_ARCGIS_API_KEY
```

## Step 5: Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain (e.g., `map.yourdomain.com`)
4. Follow DNS configuration instructions

### Performance Optimization

The app is already optimized with:
- ✅ Lazy loading of ArcGIS modules
- ✅ Client-side only rendering for map components
- ✅ Efficient state management
- ✅ Responsive design
- ✅ Dark theme for better performance

### Security Considerations

1. **API Key Protection**:
   - Consider implementing API key restrictions in ArcGIS Developer dashboard
   - Limit to specific domains
   - Set usage limits

2. **CORS Configuration**:
   - The app uses public Esri services which handle CORS
   - For custom services, configure CORS appropriately

## Step 6: Monitor & Test

After deployment:

1. **Check the deployment URL**: `https://your-project.vercel.app`
2. **Test all features**:
   - [ ] Map loads correctly
   - [ ] Basemap switching works
   - [ ] 3D view functions
   - [ ] Layers panel works
   - [ ] Mode switching works

## Troubleshooting

### Common Issues & Solutions

#### 1. Map Not Loading
- **Issue**: Blank screen or map not appearing
- **Solution**: 
  - Check browser console for errors
  - Verify ArcGIS API key is set in Vercel environment variables
  - Ensure HTTPS is being used (required for geolocation)

#### 2. 3D Buildings Not Showing
- **Issue**: 3D buildings layer doesn't appear
- **Solution**: 
  - This is normal - requires zooming into supported areas
  - Works best in major cities (NYC, SF, London, etc.)

#### 3. Performance Issues
- **Issue**: Slow loading or laggy performance
- **Solution**:
  - Enable Vercel Edge Network
  - Consider implementing Progressive Web App (PWA) features
  - Use Vercel Analytics to identify bottlenecks

#### 4. Environment Variables Not Working
- **Issue**: Features requiring API keys not working
- **Solution**:
  - Ensure variables start with `NEXT_PUBLIC_` for client-side access
  - Redeploy after adding/changing environment variables
  - Check Vercel dashboard → Settings → Environment Variables

## Production Features

### Working Features ✅
- Satellite/Street/Terrain basemap switching
- 3D terrain visualization with elevation
- Mode switching (Explore, Develop, Simulate, Analyze)
- Collapsible sidebar
- Floating UI controls
- Demo layers (parcels, traffic, flood zones)
- Real data layers (3D buildings, cities, state boundaries)

### Features Requiring Additional Setup ⚠️
- **Live Traffic**: Requires ArcGIS traffic service subscription
- **Demographics**: May require ArcGIS GeoEnrichment service
- **Property Parcels**: Requires county/city specific data services
- **Crime Data**: Requires local police department APIs

## Monitoring

### Vercel Analytics (Recommended)

```bash
npm install @vercel/analytics
```

Add to your `_app.tsx` or layout:

```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
```

### Error Tracking (Optional)

Consider adding Sentry for error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## Performance Tips

1. **Enable ISR** (Incremental Static Regeneration) for static content
2. **Use Vercel Edge Functions** for API routes
3. **Enable Image Optimization** for any static images
4. **Consider CDN** for heavy assets

## Backup Deployment Options

If you prefer other platforms:

### Netlify
```toml
# netlify.toml
[build]
  command = "next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### AWS Amplify
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Docker (Self-Hosted)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **ArcGIS Docs**: [developers.arcgis.com](https://developers.arcgis.com)

---

## Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)
- [ ] Tested all features

🎉 **Your Map Studio is now live!**
