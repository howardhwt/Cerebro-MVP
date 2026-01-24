# Deployment Guide: Cerebro MVP to GitHub & Vercel

## ✅ Pre-Deployment Checklist

- [x] Git repository initialized
- [x] Initial commit created
- [x] `.env` files are in `.gitignore`
- [x] No API keys in source code
- [x] Security review completed

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Repository name: `Cerebro-MVP`
3. Description: "Sales Intelligence OS - AI-powered customer pain point extraction using Perplexity AI and Supabase"
4. Choose: **Private** (recommended) or **Public**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd /Users/howard/cerebro-dashboard
git remote add origin https://github.com/YOUR_USERNAME/Cerebro-MVP.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your GitHub username.**

## Step 3: Deploy to Vercel

### Option A: Connect GitHub Repository (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your `Cerebro-MVP` repository
4. Vercel will auto-detect Next.js settings
5. **Add Environment Variables:**
   - Go to **Settings → Environment Variables**
   - Add each variable:
     ```
     PERPLEXITY_API_KEY=pplx-...
     NEXT_PUBLIC_SUPABASE_URL=https://...
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
     SUPABASE_SERVICE_ROLE_KEY=eyJ... (if using)
     PERPLEXITY_MODEL=sonar (optional)
     ```
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**
6. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
npm i -g vercel
cd /Users/howard/cerebro-dashboard
vercel
```

Follow the prompts and add environment variables when asked.

## Step 4: Verify Deployment

1. Check Vercel deployment logs for any errors
2. Visit your deployed URL
3. Test the application:
   - Try extracting pain points from a transcript
   - Verify companys appear in dropdown
   - Check that data is saved to Supabase

## 🔐 Security Reminders

- ✅ Never commit `.env` files
- ✅ All API keys are in Vercel environment variables
- ✅ Service role key is server-side only
- ✅ Debug logging is disabled in production

## 📝 Post-Deployment

1. Update `README.md` with your deployed URL
2. Test all features on the live site
3. Monitor Vercel logs for any issues
4. Set up error monitoring (optional: Sentry, LogRocket, etc.)
