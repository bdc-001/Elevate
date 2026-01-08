import os
import asyncio
import bcrypt
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

async def update_password():
    if not MONGO_URL:
        print("Error: MONGO_URL not found in .env")
        return

    print(f"Connecting to database: {DB_NAME}...")
    
    # Use robust connection settings matching server.py
    client = AsyncIOMotorClient(
        MONGO_URL,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    
    email = "utsav@convin.ai"
    new_password = "utsav123"
    
    print(f"Hashing password for {email}...")
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    print("Updating user record...")
    result = await db.users.update_one(
        {"email": email}, 
        {"$set": {"password": hashed}}
    )
    
    if result.matched_count > 0:
        print("✅ Success! Password updated to 'utsav123'")
    else:
        print(f"❌ User with email '{email}' not found in the database.")

if __name__ == "__main__":
    try:
        asyncio.run(update_password())
    except Exception as e:
        print(f"❌ An error occurred: {e}")
