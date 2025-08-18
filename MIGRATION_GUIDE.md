# React to Next.js Migration Guide

This project has been migrated from a React + Vite application to Next.js 14 with the App Router.

## What Changed

### 1. Project Structure
- **Before**: `src/` folder with React Router
- **After**: `app/` folder with Next.js App Router
- Pages are now in `app/[route]/page.tsx` format

### 2. Routing
- **Before**: React Router DOM with `<BrowserRouter>`, `<Routes>`, `<Route>`
- **After**: Next.js file-based routing with `app/` directory
- Links changed from `<Link to="/path">` to `<Link href="/path">`
- Navigation hooks changed from `useNavigate()` to `useRouter()` from `next/navigation`

### 3. Authentication
- Auth logic moved from React Router guards to Next.js middleware-style approach
- `RequireAuth` component updated to use Next.js navigation
- Login redirect logic updated to use URL search params

### 4. Components
- All client-side components now have `'use client'` directive
- SEO component updated to use Next.js `Head` component (consider migrating to Metadata API)
- Updated imports for navigation components

### 5. Build System
- **Before**: Vite with SWC
- **After**: Next.js with built-in optimization
- Updated package.json scripts
- New configuration files: `next.config.mjs`, `.eslintrc.json`

## Files Added
- `app/layout.tsx` - Root layout
- `app/providers.tsx` - Client-side providers wrapper
- `app/globals.css` - Global styles
- `app/page.tsx` - Home page
- `app/[routes]/page.tsx` - Individual route pages
- `next.config.mjs` - Next.js configuration
- `next-env.d.ts` - Next.js TypeScript definitions
- `.eslintrc.json` - ESLint configuration for Next.js

## Files to Remove (Old Vite Setup)
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `vite.config.ts`
- `eslint.config.js`
- Old TypeScript configs that conflict

## Environment Variables
Make sure to set up your environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Running the Application

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Start Production
```bash
npm run start
```

## Database Considerations
Since you're using Supabase, ensure that:
1. All RLS policies are correctly configured
2. Environment variables are properly set for both development and production
3. Any database changes are reflected in your SQL migrations

## Important Notes
1. All pages that use React hooks or browser APIs need the `'use client'` directive
2. Server components can't use client-side hooks or browser APIs
3. Consider using Next.js Metadata API instead of the custom SEO component for better SEO
4. The authentication flow has been updated to work with Next.js routing

## Deployment
This app is now ready for deployment on Vercel, Netlify, or any platform that supports Next.js applications.
