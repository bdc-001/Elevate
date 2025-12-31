# Vercel Deployment Guide for Convin Elevate

## 🚀 Quick Start

### Option 1: Deploy from GitHub (Recommended)

1. **Push code to GitHub** (already done ✅)
2. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click **"Add New Project"**
   - Import your repository: `bdc-001/Elevate`

3. **Configure Project Settings:**
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `build` (auto-detected)

4. **Add Environment Variables:**
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.com
   ```
   ⚠️ **Important:** Replace with your actual backend URL

5. **Deploy!**
   - Click **"Deploy"**
   - Wait for build to complete
   - Your app will be live!

---

## 🔧 Manual Deployment via CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 4: Deploy

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No** (first time) or **Yes** (updates)
- What's your project's name? **convin-elevate** (or your choice)
- In which directory is your code located? **./** (current directory)

### Step 5: Set Environment Variables

```bash
vercel env add REACT_APP_BACKEND_URL
# Enter your backend URL when prompted
```

### Step 6: Deploy to Production

```bash
vercel --prod
```

---

## 🌐 Backend Deployment

**Vercel is for frontend only.** You need to deploy the backend separately.

### Recommended: Railway (Easiest)

1. **Go to Railway:** https://railway.app/
2. **Create New Project** → **Deploy from GitHub**
3. **Select your repository**
4. **Configure:**
   - **Root Directory:** `backend`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:**
     ```
     MONGO_URL=your_mongodb_connection_string
     DB_NAME=elivate
     JWT_SECRET=your_jwt_secret_key
     CORS_ORIGINS=https://your-vercel-app.vercel.app
     ```

5. **Deploy!**
6. **Copy the Railway URL** (e.g., `https://your-app.railway.app`)
7. **Update Vercel environment variable:**
   - `REACT_APP_BACKEND_URL=https://your-app.railway.app`

### Alternative: Render

1. **Go to Render:** https://render.com/
2. **New** → **Web Service**
3. **Connect GitHub** → Select repository
4. **Configure:**
   - **Name:** `convin-elevate-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:** (same as Railway)

---

## 📋 Environment Variables Checklist

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `https://your-backend.railway.app` |

### Backend (Railway/Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Database name | `elivate` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-here` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://your-app.vercel.app` |

---

## 🔍 Troubleshooting

### Issue 1: 404 NOT_FOUND Error

**Cause:** Vercel can't find the build output or routing is misconfigured.

**Solution:**
1. **Check Root Directory:**
   - In Vercel Dashboard → Settings → General
   - Set **Root Directory** to `frontend`

2. **Verify vercel.json:**
   - Should be in `frontend/vercel.json`
   - Contains rewrite rules for React Router

3. **Check Build Output:**
   - Go to Deployments → Latest → Build Logs
   - Verify `build` directory is created
   - Check for build errors

### Issue 2: API Calls Failing

**Cause:** `REACT_APP_BACKEND_URL` not set or incorrect.

**Solution:**
1. **Set Environment Variable in Vercel:**
   - Settings → Environment Variables
   - Add `REACT_APP_BACKEND_URL`
   - Value: Your backend URL (with `https://`)

2. **Redeploy:**
   - After adding env vars, redeploy the app
   - Environment variables are injected at build time

### Issue 3: CORS Errors

**Cause:** Backend not allowing frontend origin.

**Solution:**
1. **Update Backend CORS_ORIGINS:**
   ```
   CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
   ```
   - Include both production and preview URLs

2. **Restart Backend:**
   - After updating env vars, restart backend service

### Issue 4: Build Fails

**Cause:** Missing dependencies or build errors.

**Solution:**
1. **Check Build Logs:**
   - Vercel Dashboard → Deployments → Build Logs
   - Look for error messages

2. **Test Locally:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   - Fix any errors locally first

3. **Common Issues:**
   - Node version mismatch → Set in `package.json`:
     ```json
     "engines": {
       "node": "18.x"
     }
     ```
   - Missing dependencies → Check `package.json`

### Issue 5: Routes Not Working (404 on refresh)

**Cause:** React Router needs server-side rewrites.

**Solution:**
- Already handled in `vercel.json` with rewrites
- If still failing, check that `vercel.json` is in `frontend/` directory

---

## ✅ Deployment Checklist

### Before Deploying:

- [ ] Code pushed to GitHub
- [ ] Backend deployed (Railway/Render)
- [ ] Backend URL copied
- [ ] MongoDB Atlas IP whitelisted
- [ ] Environment variables ready

### Frontend (Vercel):

- [ ] Root directory set to `frontend`
- [ ] `REACT_APP_BACKEND_URL` environment variable set
- [ ] Build succeeds
- [ ] App loads without errors
- [ ] API calls work

### Backend (Railway/Render):

- [ ] Root directory set to `backend`
- [ ] All environment variables set
- [ ] MongoDB connection works
- [ ] API endpoints respond
- [ ] CORS configured correctly

---

## 🎯 Quick Deploy Commands

### Frontend (Vercel CLI)

```bash
cd frontend
vercel --prod
```

### Update Environment Variable

```bash
vercel env add REACT_APP_BACKEND_URL production
# Enter: https://your-backend.railway.app
```

### View Logs

```bash
vercel logs
```

---

## 📚 Additional Resources

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app/
- **Render Docs:** https://render.com/docs

---

## 🆘 Still Having Issues?

1. **Check Vercel Build Logs:**
   - Dashboard → Deployments → Latest → Build Logs

2. **Check Backend Logs:**
   - Railway/Render dashboard → Logs

3. **Test Backend Directly:**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

4. **Test Frontend Locally:**
   ```bash
   cd frontend
   REACT_APP_BACKEND_URL=https://your-backend.railway.app npm start
   ```

---

## 🎉 After Successful Deployment

1. **Update CORS_ORIGINS** in backend with your Vercel URL
2. **Test all features:**
   - Login/Register
   - Dashboard
   - Customer management
   - Notifications
   - Reports

3. **Set up custom domain** (optional):
   - Vercel Dashboard → Settings → Domains
   - Add your domain

---

**Your app should now be live on Vercel!** 🚀

