# MongoDB Atlas Connection Fix

## 🔴 Current Issue

All APIs are failing with this error:
```
SSL handshake failed: [SSL: TLSV1_ALERT_INTERNAL_ERROR] tlsv1 alert internal error
ServerSelectionTimeoutError
```

This means the backend **cannot connect to MongoDB Atlas**.

---

## ✅ Solution: Whitelist IP Address in MongoDB Atlas

### Step 1: Get Your Current IP Address

**Option A: From Terminal**
```bash
curl ifconfig.me
```

**Option B: From Browser**
- Visit: https://whatismyipaddress.com/
- Copy your public IP address

### Step 2: Whitelist IP in MongoDB Atlas

1. **Log in to MongoDB Atlas:**
   - Go to: https://cloud.mongodb.com/
   - Sign in with your account

2. **Navigate to Network Access:**
   - Click on your cluster name
   - Go to **"Network Access"** (left sidebar)
   - Or go directly: https://cloud.mongodb.com/v2#/security/network/whitelist

3. **Add IP Address:**
   - Click **"Add IP Address"** button
   - Choose one of:
     - **"Add Current IP Address"** (recommended - automatically adds your IP)
     - **"Allow Access from Anywhere"** (for testing: `0.0.0.0/0`)
   
   ⚠️ **For Production:** Only whitelist specific IPs
   ⚠️ **For Development:** You can use `0.0.0.0/0` temporarily

4. **Save Changes:**
   - Click **"Confirm"**
   - Wait 1-2 minutes for changes to propagate

### Step 3: Verify Connection

```bash
# Restart backend to test connection
docker restart elivate-backend

# Check logs
docker logs elivate-backend --tail 20
```

You should see the backend start successfully without SSL errors.

---

## 🔍 Alternative: Check Connection String

If whitelisting doesn't work, verify your connection string:

**Current Connection String:**
```
mongodb+srv://arsalaan_db_user:a*EZhbJiZ9mTQ93@cluster0.tn3k7lr.mongodb.net/?appName=Cluster0
```

**Verify:**
1. Username: `arsalaan_db_user` ✅
2. Password: `a*EZhbJiZ9mTQ93` (URL-encoded as `a%2AEZhbJiZ9mTQ93`) ✅
3. Cluster: `cluster0.tn3k7lr.mongodb.net` ✅
4. Database: `elivate` ✅

**If password has special characters:**
- Make sure they're URL-encoded in the connection string
- `*` = `%2A`
- `@` = `%40`
- `#` = `%23`
- etc.

---

## 🐳 Docker Network Issue

If you're running MongoDB in Docker, make sure:

1. **Backend container can reach internet:**
   ```bash
   docker exec elivate-backend ping -c 2 8.8.8.8
   ```

2. **Check Docker network:**
   ```bash
   docker network ls
   docker inspect elivate-backend | grep -A 10 NetworkSettings
   ```

---

## 🔧 Quick Test: Verify MongoDB Connection

Run this inside the backend container:

```bash
docker exec -it elivate-backend python -c "
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test():
    try:
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        await client.admin.command('ping')
        print('✅ MongoDB connection successful!')
    except Exception as e:
        print(f'❌ MongoDB connection failed: {e}')

asyncio.run(test())
"
```

---

## 📋 Common Issues & Solutions

### Issue 1: "SSL handshake failed"
**Solution:** Whitelist IP address in MongoDB Atlas Network Access

### Issue 2: "Authentication failed"
**Solution:** 
- Check username/password in `.env` file
- Verify database user exists in MongoDB Atlas
- Check if password needs URL encoding

### Issue 3: "ServerSelectionTimeoutError"
**Solution:**
- Whitelist IP address
- Check if MongoDB Atlas cluster is running
- Verify connection string format

### Issue 4: "Connection refused"
**Solution:**
- Check if MongoDB Atlas cluster is paused (free tier auto-pauses)
- Resume cluster in MongoDB Atlas dashboard
- Wait 2-3 minutes for cluster to start

---

## 🚀 After Fixing

Once the connection is fixed:

1. **Restart backend:**
   ```bash
   docker restart elivate-backend
   ```

2. **Test an API:**
   ```bash
   curl http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```

3. **Check frontend:**
   - Refresh the app
   - Try logging in
   - APIs should work now!

---

## ✅ Verification Checklist

- [ ] IP address whitelisted in MongoDB Atlas
- [ ] Connection string is correct in `.env`
- [ ] Backend container restarted
- [ ] No SSL errors in logs
- [ ] Test API call succeeds
- [ ] Frontend can connect to backend

---

## 📞 Still Having Issues?

If the problem persists:

1. **Check MongoDB Atlas Status:**
   - Go to: https://status.mongodb.com/
   - Verify no ongoing incidents

2. **Check Backend Logs:**
   ```bash
   docker logs elivate-backend --tail 50
   ```

3. **Test Connection Manually:**
   - Use MongoDB Compass or `mongosh` to test connection
   - Verify credentials work outside Docker

4. **Verify Environment Variables:**
   ```bash
   docker exec elivate-backend printenv | grep MONGO
   ```

---

**The most common fix is whitelisting your IP address in MongoDB Atlas Network Access!** 🎯

