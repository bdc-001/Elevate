"""
Script to assign all dummy customers to a specific user (by email).
This makes the customers visible if you're logged in as a CSM with "own" scope.
"""

import asyncio
import argparse
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

parser = argparse.ArgumentParser(description='Assign dummy customers to a user')
parser.add_argument('--mongo-url', type=str, help='MongoDB connection string (overrides .env)')
parser.add_argument('--db-name', type=str, help='Database name (overrides .env)')
parser.add_argument('--user-email', type=str, required=True, help='Email of the user to assign customers to')
args = parser.parse_args()

MONGO_URL = args.mongo_url or os.getenv("MONGO_URL")
DB_NAME = args.db_name or os.getenv("DB_NAME", "elivate")


async def assign_customers():
    """Assign all dummy customers to the specified user."""
    if not MONGO_URL:
        print("❌ Error: MONGO_URL is required!")
        return
    
    print(f"📊 Connecting to database: {DB_NAME}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Find the user
        user = await db.users.find_one({"email": args.user_email})
        if not user:
            print(f"❌ User with email '{args.user_email}' not found!")
            return
        
        print(f"✅ Found user: {user.get('name')} ({user.get('email')})")
        print(f"   User ID: {user.get('id')}")
        
        # Count dummy customers
        dummy_count = await db.customers.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        print(f"\n📊 Found {dummy_count} customers with DUMMY_DATA tag")
        
        if dummy_count == 0:
            print("⚠️  No dummy customers found. Make sure you've run create_dummy_data.py first.")
            return
        
        # Update all dummy customers to be assigned to this user
        result = await db.customers.update_many(
            {"tags": {"$in": ["DUMMY_DATA"]}},
            {
                "$set": {
                    "csm_owner_id": user.get("id"),
                    "csm_owner_name": user.get("name")
                }
            }
        )
        
        print(f"\n✅ Successfully assigned {result.modified_count} customers to {user.get('name')}")
        print(f"\n💡 Now log in as {user.get('email')} to see all dummy customers!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(assign_customers())

