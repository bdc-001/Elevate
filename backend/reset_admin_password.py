"""
Script to reset the admin@convin.ai password.
"""

import os
import asyncio
import bcrypt
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "elivate")

async def reset_admin_password():
    if not MONGO_URL:
        print("❌ Error: MONGO_URL not found in .env")
        return

    print(f"📊 Connecting to database: {DB_NAME}...")
    
    client = AsyncIOMotorClient(
        MONGO_URL,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    
    email = "admin@convin.ai"
    new_password = "admin123"  # Change this to your preferred password
    
    print(f"🔐 Hashing password for {email}...")
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    print("🔄 Updating user record...")
    result = await db.users.update_one(
        {"email": email}, 
        {"$set": {"password": hashed}}
    )
    
    if result.matched_count > 0:
        print(f"\n✅ Success! Password updated for {email}")
        print(f"   New password: {new_password}")
        print(f"\n💡 You can now log in with:")
        print(f"   Email: {email}")
        print(f"   Password: {new_password}")
    else:
        print(f"❌ User with email '{email}' not found in the database.")
    
    client.close()

if __name__ == "__main__":
    try:
        asyncio.run(reset_admin_password())
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()

