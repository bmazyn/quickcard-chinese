# Vercel Deployment Checklist

## ✅ Pre-Deployment Verification

- [x] PWA manifest configured (name: QuickCard, white theme)
- [x] Service worker registration in main.tsx
- [x] Mobile viewport with safe-area padding
- [x] Icons created (pwa-192.png, pwa-512.png)
- [x] Build succeeds: `npm run build` ✓
- [x] Preview works: `npm run preview` ✓
- [x] No TypeScript errors ✓
- [x] 100 quiz cards (HSK1) loaded

## 🚀 Deploy Steps

### Option 1: Vercel Dashboard (Recommended)
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Vercel auto-detects settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click Deploy

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

## 📱 Testing After Deploy

### Desktop
1. Visit your Vercel URL
2. Check install prompt appears (Chrome/Edge)
3. Test quiz functionality

### iPhone
1. Open in Safari (not Chrome!)
2. Tap Share → "Add to Home Screen"
3. Launch from home screen
4. Verify:
   - No browser UI (standalone mode)
   - Content not hidden behind notch/home indicator
   - Works offline (airplane mode)

### Android
1. Open in Chrome
2. Tap "Install app" banner
3. Launch from home screen
4. Verify offline functionality

## 🔍 Key Files for Deployment

- `vite.config.ts` - PWA configuration
- `public/pwa-192.png` - App icon (192x192)
- `public/pwa-512.png` - App icon (512x512)
- `public/apple-touch-icon.png` - iOS icon
- `dist/` - Build output (auto-generated)
- `dist/sw.js` - Service worker (auto-generated)
- `dist/manifest.webmanifest` - PWA manifest (auto-generated)

## 📝 Vercel Project Settings

**Build & Development Settings:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Development Command: `npm run dev`

**Environment Variables:**
None required for basic deployment

## 🎯 Post-Deploy

- [ ] Test on real iPhone (iOS Safari)
- [ ] Test on Android (Chrome)
- [ ] Verify offline mode works
- [ ] Check safe-area padding on iPhone 14/15
- [ ] Test quiz flow (answer → feedback → next)
- [ ] Verify stats persist (localStorage)
