# Fix: Vercel Using npm Instead of yarn

## 🔴 Problem

Vercel is running `npm install` instead of `yarn install`, causing:
```
Error: Cannot find module 'ajv/dist/compile/codegen'
Error: Command "cd frontend && npm install && npm run build" exited with 1
```

## ✅ Solution: Force Vercel to Use yarn

### Step 1: Override Install Command in Vercel Dashboard

**This is the most important step!**

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **General**
2. Scroll to **"Install Command"**
3. **Toggle "Override" to ON** (blue)
4. **Enter:** `yarn install --frozen-lockfile`
5. Click **"Save"**

### Step 2: Override Build Command

1. In the same settings page, find **"Build Command"**
2. **Toggle "Override" to ON** (blue)
3. **Enter:** `yarn build`
4. Click **"Save"**

### Step 3: Verify Root Directory

1. Check **"Root Directory"** is set to: `frontend`
2. If not, set it and click **"Save"**

### Step 4: Clear Build Cache

1. Scroll to bottom of Settings → General
2. Click **"Clear Build Cache"**
3. Confirm

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

---

## 🔧 Why This Happens

Vercel auto-detects the package manager, but sometimes:
- It detects `npm` even when `yarn.lock` exists
- The root directory setting can confuse the detection
- Build cache might have old npm settings

**Solution:** Manually override the install command to force yarn.

---

## 📋 Complete Settings Checklist

In Vercel Dashboard → Settings → General:

| Setting | Value | Override |
|---------|-------|----------|
| **Root Directory** | `frontend` | - |
| **Install Command** | `yarn install --frozen-lockfile` | ✅ **ON** |
| **Build Command** | `yarn build` | ✅ **ON** |
| **Output Directory** | `build` | ✅ **ON** |

---

## 🎯 What Changed in Code

I've also updated the code:

1. **Added `ajv` dependency** to `package.json`
   - Ensures the module is available
   - Prevents "Cannot find module" errors

2. **Updated `vercel.json`**
   - Explicitly uses `yarn install --frozen-lockfile`
   - Ensures yarn is used

3. **Added `.yarnrc`**
   - Yarn configuration file
   - Helps with dependency resolution

---

## 🚨 Important: Manual Override Required

**Even though `vercel.json` specifies yarn, you MUST override in Vercel Dashboard!**

Vercel sometimes ignores `vercel.json` install commands when:
- Root directory is set
- Build cache exists
- Auto-detection conflicts

**The dashboard override takes precedence and will work!**

---

## ✅ Verification

After redeploying, check build logs:

**Should see:**
```
yarn install v1.22.22
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
[4/4] Building fresh packages...
Done in X seconds.
```

**Should NOT see:**
```
npm install
```

---

## 🆘 If Still Using npm

### Option 1: Delete package-lock.json (if exists)

```bash
# If package-lock.json exists, it might confuse Vercel
rm frontend/package-lock.json
git add frontend/package-lock.json
git commit -m "Remove package-lock.json to force yarn"
git push
```

### Option 2: Add .npmrc to Disable npm

Create `frontend/.npmrc`:
```
package-lock=false
```

### Option 3: Use Vercel CLI

Deploy via CLI which respects vercel.json better:

```bash
cd frontend
vercel --prod
```

---

## 📝 Summary

**The fix:**
1. ✅ Override Install Command in Vercel Dashboard → `yarn install --frozen-lockfile`
2. ✅ Override Build Command → `yarn build`
3. ✅ Clear build cache
4. ✅ Redeploy

**Code changes:**
- ✅ Added `ajv` dependency
- ✅ Updated `vercel.json`
- ✅ Added `.yarnrc`

**After these steps, Vercel will use yarn and the build will succeed!** 🚀

