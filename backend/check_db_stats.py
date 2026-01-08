import os
import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

async def check_stats():
    if not MONGO_URL:
        print("Error: MONGO_URL not found")
        return

    client = AsyncIOMotorClient(
        MONGO_URL,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    
    collections = await db.list_collection_names()
    print(f"Collections found: {collections}")
    
    for col in ["customers", "documents", "users", "activities"]:
        if col in collections:
            count = await db[col].count_documents({})
            print(f"{col}: {count} records")
        else:
            print(f"{col}: <missing>")

if __name__ == "__main__":
    try:
        asyncio.run(check_stats())
    except Exception as e:
        print(f"Error: {e}")
