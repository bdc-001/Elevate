
from dotenv import load_dotenv
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import certifi

async def test_connection():
    ROOT_DIR = Path(__file__).parent
    env_path = ROOT_DIR / '.env'
    print(f"Loading env from {env_path}")
    load_dotenv(env_path)
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    print(f"MONGO_URL present: {bool(mongo_url)}")
    print(f"DB_NAME: {db_name}")
    
    if not mongo_url:
        print("MONGO_URL is missing!")
        return

    try:
        print("Attempting to connect...")
        client = AsyncIOMotorClient(
            mongo_url,
            tlsCAFile=certifi.where(),
            tls=True,
            tlsAllowInvalidCertificates=True,
            uuidRepresentation='standard',
            serverSelectionTimeoutMS=5000 
        )
        # Force a connection attempt
        await client.server_info()
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
