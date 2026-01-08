"""
Script to create or reset admin@convin.ai user in production database.
This works with both local and production databases.
"""

import os
import asyncio
import argparse
import bcrypt
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

parser = argparse.ArgumentParser(description='Create or reset admin user')
parser.add_argument('--mongo-url', type=str, help='MongoDB connection string (overrides .env)')
parser.add_argument('--db-name', type=str, help='Database name (overrides .env)')
parser.add_argument('--password', type=str, default='admin123', help='Password for admin user (default: admin123)')
args = parser.parse_args()

MONGO_URL = args.mongo_url or os.getenv("MONGO_URL")
DB_NAME = args.db_name or os.getenv("DB_NAME", "elivate")

async def setup_admin():
    if not MONGO_URL:
        print("❌ Error: MONGO_URL is required!")
        print("   Set it via:")
        print("   - Command line: --mongo-url 'mongodb+srv://...'")
        print("   - Environment variable: export MONGO_URL='mongodb+srv://...'")
        print("   - .env file: MONGO_URL=mongodb+srv://...")
        return
    
    print(f"📊 Connecting to database: {DB_NAME}")
    print(f"   MongoDB URL: {MONGO_URL[:50]}...")
    
    client = AsyncIOMotorClient(
        MONGO_URL,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    
    email = "admin@convin.ai"
    password = args.password
    
    try:
        # Check if user exists
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user:
            # User exists - reset password
            print(f"\n✅ User {email} already exists. Resetting password...")
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            result = await db.users.update_one(
                {"email": email},
                {"$set": {"password": hashed}}
            )
            
            if result.modified_count > 0:
                print(f"✅ Password reset successfully!")
            else:
                print(f"⚠️  Password was already set (no changes made)")
        else:
            # User doesn't exist - create it
            print(f"\n📝 Creating new admin user: {email}")
            
            import secrets
            user_id = secrets.token_urlsafe(16)
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            admin_user = {
                "id": user_id,
                "email": email,
                "name": "Setup User",
                "password": hashed,
                "role": "ADMIN",
                "roles": ["ADMIN"],
                "status": "Active",
                "job_title": "Administrator",
                "department": "IT",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_login_at": None
            }
            
            await db.users.insert_one(admin_user)
            print(f"✅ Admin user created successfully!")
        
        print(f"\n💡 Login credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"\n🚀 You can now log in to see all customers!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(setup_admin())

