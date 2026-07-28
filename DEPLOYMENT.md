# Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Trade Management & Portfolio Analytics Platform** live on cloud platforms (Vercel & Render / Railway).

---

## 🚀 Recommended Deployment Architecture

- **Frontend (`/frontend`)**: Deploy to **Vercel** (Free, instant global CDN & SSL).
- **Backend (`/backend`)**: Deploy to **Render** or **Railway** (Free Node.js hosting with database support).

---

## Step 1: Deploy Backend to Render or Railway

### Option A: Render (Free Web Service)
1. Sign in to [Render.com](https://render.com) with your GitHub account.
2. Click **New +** -> **Web Service**.
3. Connect your repository: `https://github.com/priyapandey-maker/trade-management-platform`.
4. Configure service settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma db push && npm run build`
   - **Start Command**: `npm run start:prod`
5. Add Environment Variables under **Environment**:
   - `PORT`: `3001`
   - `DATABASE_URL`: `file:./dev.db`
   - `JWT_SECRET`: `your_random_secret_string`
   - `OWNER_EMAIL`: `owner@shree.com`
   - `OWNER_PASSWORD`: `your_secure_password`
6. Click **Create Web Service**. Copy your live backend URL (e.g. `https://trade-management-backend.onrender.com`).

---

## Step 2: Deploy Frontend to Vercel

1. Sign in to [Vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Select `trade-management-platform` repository.
4. Configure project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
5. Add Environment Variable under **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-url.onrender.com/api/v1` (replace with your live backend URL from Step 1)
6. Click **Deploy**. Vercel will build and assign a live production domain (e.g., `https://trade-management-platform.vercel.app`).

---

## Step 3: Verify Live Production Setup

1. Open your Vercel frontend URL.
2. Log in using your configured Owner email and password.
3. Test creating a trade position and check live price fetching on `/open`.
