# Adding Dummy Data to Vercel Production Database

## Problem

The dummy data was created in your **local database**, but Vercel is using a **different database** (production). To see the data on Vercel, you need to add it to the production database.

## Solution

Run the dummy data script against the **same database that Vercel uses**.

## Step-by-Step Instructions

### Option 1: Get Environment Variables from Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Get Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Find `MONGO_URL` and `DB_NAME`
   - Copy both values

3. **Run the Script with Production Credentials**

   ```bash
   cd backend
   
   # Method 1: Command line arguments (recommended)
   python3 create_dummy_data.py \
     --mongo-url "mongodb+srv://your-production-url" \
     --db-name "elivate"
   
   # Method 2: Environment variables
   export MONGO_URL="mongodb+srv://your-production-url"
   export DB_NAME="elivate"
   python3 create_dummy_data.py
   ```

### Option 2: Use the Same Database for Local and Production

If you want to use the **same database** for both local development and Vercel:

1. **Update Vercel Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Set `MONGO_URL` to your local database connection string
   - Set `DB_NAME` to `elivate` (or your database name)

2. **Run the Script Locally**
   ```bash
   cd backend
   python3 create_dummy_data.py
   ```
   
   This will add data to the same database that Vercel uses.

### Option 3: Check if Vercel is Already Using Your Database

1. **Check Vercel Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify `MONGO_URL` matches your local `.env` file

2. **If They Match**
   - The data should already be visible on Vercel
   - Try refreshing the page or clearing browser cache

3. **If They Don't Match**
   - Follow Option 1 to add data to the production database

## Verification

After running the script:

1. **Check the Output**
   ```
   ✅ Dummy data creation completed successfully!
   📊 Summary:
      - Customers: 50
      - Activities: 281
      - Risks: 31
      - Opportunities: 25
      - Tasks: 172
      - Documents: 82
      - DataLabs Reports: 57
   ```

2. **Verify on Vercel**
   - Go to your Vercel deployment URL
   - Log in to the application
   - Check the Dashboard - you should see 50 customers
   - Check Customers page - you should see all Indian companies

3. **If Data Still Doesn't Appear**
   - Check browser console for errors
   - Verify backend API is working: `https://your-vercel-url/api/health`
   - Check that MongoDB connection is working on Vercel

## Removing Dummy Data from Production

If you need to remove the dummy data from production:

```bash
cd backend

# Method 1: Command line arguments
python3 remove_dummy_data.py \
  --mongo-url "mongodb+srv://your-production-url" \
  --db-name "elivate"

# Method 2: Environment variables
export MONGO_URL="mongodb+srv://your-production-url"
export DB_NAME="elivate"
python3 remove_dummy_data.py
```

**⚠️ Warning:** This will permanently delete all data tagged with "DUMMY_DATA" from the production database.

## Troubleshooting

### Error: "MONGO_URL is required"
- Make sure you're providing the MongoDB connection string
- Check that the connection string is correct (starts with `mongodb+srv://`)

### Error: "SSL handshake failed" or "ServerSelectionTimeoutError"
- Your IP address might not be whitelisted in MongoDB Atlas
- Go to MongoDB Atlas → Network Access → Add your IP address
- Or temporarily allow `0.0.0.0/0` (not recommended for production)

### Data appears locally but not on Vercel
- Verify Vercel environment variables match the database you're writing to
- Check Vercel deployment logs for MongoDB connection errors
- Ensure the backend API on Vercel is connecting to the same database

### Script runs but no data appears
- Check if data was actually created: Look for the success message with counts
- Verify the database name is correct
- Check MongoDB Atlas to see if collections have documents

## Quick Reference

```bash
# Create dummy data (production)
python3 create_dummy_data.py --mongo-url "YOUR_URL" --db-name "elivate"

# Remove dummy data (production)
python3 remove_dummy_data.py --mongo-url "YOUR_URL" --db-name "elivate"

# Create dummy data (local - uses .env file)
python3 create_dummy_data.py

# Remove dummy data (local - uses .env file)
python3 remove_dummy_data.py
```

## Security Notes

- ⚠️ **Never commit** `.env` files with production credentials
- ⚠️ **Never share** MongoDB connection strings publicly
- ✅ Use Vercel's environment variables for production secrets
- ✅ Use `.env` file locally (already in `.gitignore`)


