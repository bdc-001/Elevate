import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi
import sys

# Load env vars
load_dotenv('backend/.env')

async def migrate_products():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')

    if not mongo_url or not db_name:
        print("Error: MONGO_URL or DB_NAME not set in environment.")
        return

    print("Connecting to MongoDB...")
    try:
        client = AsyncIOMotorClient(
            mongo_url,
            tlsCAFile=certifi.where(),
            tls=True,
            tlsAllowInvalidCertificates=True,
            uuidRepresentation='standard'
        )
        db = client[db_name]
        print(f"Connected to database: {db_name}")
        
        # 1. Update customers to have products_purchased array
        print("Migrating customers: ensuring 'products_purchased' field exists...")
        result = await db.customers.update_many(
            {"products_purchased": {"$exists": False}},
            {"$set": {"products_purchased": []}}
        )
        print(f"Matched {result.matched_count} customers, modified {result.modified_count}.")

        # 2. Update customers to have primary_objective field
        print("Migrating customers: ensuring 'primary_objective' field exists...")
        result_obj = await db.customers.update_many(
            {"primary_objective": {"$exists": False}},
            {"$set": {"primary_objective": ""}}
        )
        print(f"Matched {result_obj.matched_count} customers, modified {result_obj.modified_count}.")

    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_products())
