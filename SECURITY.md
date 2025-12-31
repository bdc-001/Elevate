# Security Guide - Protecting Your Credentials

## 🔒 Never Commit Credentials!

**Your `.env` files contain sensitive information:**
- Database passwords
- API keys
- JWT secrets
- Connection strings

**These should NEVER be committed to Git!**

---

## ✅ Current Status

### What's Protected:
- ✅ `.gitignore` is configured to ignore `.env` files
- ✅ `.env` files are NOT tracked in git
- ✅ `.env.example` templates are provided (safe to commit)

### What You Need to Do:

1. **Verify `.env` is ignored:**
   ```bash
   git check-ignore backend/.env
   # Should output: backend/.env
   ```

2. **Never commit `.env` files:**
   ```bash
   # Always check before committing
   git status
   # Should NOT see .env files listed
   ```

3. **Use `.env.example` as template:**
   - Copy `.env.example` to `.env`
   - Fill in your actual credentials
   - `.env` stays local (never committed)

---

## 🚨 If You Accidentally Committed Credentials

### Step 1: Remove from Git Tracking

```bash
# Remove .env from git (but keep local file)
git rm --cached backend/.env

# If you have multiple .env files
git rm --cached **/.env
```

### Step 2: Update .gitignore

Make sure `.gitignore` includes:
```
*.env
*.env.*
!.env.example
```

### Step 3: Commit the Removal

```bash
git add .gitignore
git commit -m "Remove .env files from tracking"
git push
```

### Step 4: Rotate Your Credentials! ⚠️

**IMPORTANT:** If credentials were pushed to a public repo:

1. **Change MongoDB password:**
   - MongoDB Atlas → Database Access
   - Change user password
   - Update `.env` with new password

2. **Regenerate JWT Secret:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   - Update `JWT_SECRET` in `.env`

3. **Review Git History:**
   - If repo was public, assume credentials are compromised
   - Rotate ALL exposed credentials

---

## 📋 Environment Variables Setup

### Backend (.env)

Create `backend/.env` from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
# Edit .env with your actual credentials
```

**Required Variables:**
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret key for JWT tokens
- `CORS_ORIGINS` - Allowed frontend origins

### Frontend (.env)

If you need frontend environment variables:

```bash
cd frontend
cp .env.example .env
# Edit .env with your actual values
```

**Common Variables:**
- `REACT_APP_BACKEND_URL` - Backend API URL

---

## 🔐 Best Practices

### 1. Use Environment Variables

**✅ Good:**
```python
MONGO_URL = os.environ['MONGO_URL']
```

**❌ Bad:**
```python
MONGO_URL = "mongodb+srv://user:pass@cluster.mongodb.net/"
```

### 2. Never Hardcode Secrets

**❌ Never do this:**
```python
# Don't hardcode passwords
password = "my_secret_password"
api_key = "sk_live_1234567890"
```

### 3. Use Different Credentials for Different Environments

- **Development:** `.env.development`
- **Production:** `.env.production`
- **Testing:** `.env.test`

### 4. Rotate Credentials Regularly

- Change passwords every 90 days
- Regenerate API keys periodically
- Use strong, random secrets

### 5. Limit Access to .env Files

- Only team members who need access
- Use secret management tools for production (AWS Secrets Manager, etc.)

---

## 🛡️ Production Security

### For Production Deployments:

1. **Use Secret Management Services:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

2. **Use Environment Variables in Hosting:**
   - Vercel: Environment Variables in dashboard
   - Railway: Environment Variables in project settings
   - Render: Environment Variables in service settings

3. **Never Store Secrets in Code:**
   - Even in private repos
   - Use environment variables or secret managers

---

## 📝 Checklist Before Committing

Before every commit, verify:

- [ ] No `.env` files in `git status`
- [ ] No hardcoded passwords in code
- [ ] No API keys in code
- [ ] `.env.example` files are up to date
- [ ] `.gitignore` includes `*.env`

**Quick Check:**
```bash
# Check for any .env files staged
git diff --cached --name-only | grep -E "\.env$|\.env\."

# Should return nothing!
```

---

## 🔍 Verify Your Setup

### Test 1: Check .env is ignored
```bash
git check-ignore backend/.env
# Should output: backend/.env
```

### Test 2: Check .env is not tracked
```bash
git ls-files | grep .env
# Should return nothing (or only .env.example)
```

### Test 3: Try to add .env (should fail)
```bash
git add backend/.env
git status
# .env should NOT appear in staged files
```

---

## 🆘 Emergency: Credentials Exposed

If credentials were committed to a **public repository**:

1. **Immediately rotate credentials:**
   - Change all passwords
   - Regenerate all API keys
   - Create new JWT secrets

2. **Remove from Git history:**
   ```bash
   # Use git filter-branch or BFG Repo-Cleaner
   # This is complex - consider professional help
   ```

3. **Notify your team:**
   - Alert all team members
   - Review access logs
   - Monitor for unauthorized access

4. **Consider the repository compromised:**
   - May need to create new repository
   - Transfer code without history
   - Start fresh with proper security

---

## 📚 Additional Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_cryptographic_key)
- [12 Factor App: Config](https://12factor.net/config)

---

## ✅ Summary

**Your credentials are currently safe!**

- ✅ `.env` files are ignored
- ✅ `.env.example` templates provided
- ✅ No credentials in git history

**Just remember:**
- Never commit `.env` files
- Always use `.env.example` as template
- Rotate credentials if exposed
- Use environment variables, never hardcode

**Stay secure!** 🔒

