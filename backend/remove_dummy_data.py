"""
Script to remove all dummy data tagged with "DUMMY_DATA".
This script will delete all customers, activities, risks, opportunities, tasks,
documents, reports, and dummy users that have the "DUMMY_DATA" tag.

Usage:
    # Use local .env file
    python3 remove_dummy_data.py
    
    # Use production database (same as Vercel)
    python3 remove_dummy_data.py --mongo-url "mongodb+srv://..." --db-name "elivate"
"""

import asyncio
import argparse
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Parse command line arguments
parser = argparse.ArgumentParser(description='Remove dummy data from Convin Elevate')
parser.add_argument('--mongo-url', type=str, help='MongoDB connection string (overrides .env)')
parser.add_argument('--db-name', type=str, help='Database name (overrides .env)')
args = parser.parse_args()

# Use command line args if provided, otherwise use environment variables
MONGO_URL = args.mongo_url or os.getenv("MONGO_URL")
DB_NAME = args.db_name or os.getenv("DB_NAME", "elivate")


async def remove_dummy_data():
    """Remove all dummy data from the database."""
    print("=" * 60)
    print("Removing Dummy Data")
    print("=" * 60)
    
    if not MONGO_URL:
        print("❌ Error: MONGO_URL is required!")
        print("   Set it via:")
        print("   - Command line: --mongo-url 'mongodb+srv://...'")
        print("   - Environment variable: export MONGO_URL='mongodb+srv://...'")
        print("   - .env file: MONGO_URL=mongodb+srv://...")
        return
    
    print(f"\n📊 Connecting to database: {DB_NAME}")
    print(f"   MongoDB URL: {MONGO_URL[:50]}...")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Count before deletion (tags is an array, so use $in operator)
        customers_count = await db.customers.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        activities_count = await db.activities.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        risks_count = await db.risks.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        opportunities_count = await db.opportunities.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        tasks_count = await db.tasks.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        documents_count = await db.documents.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        reports_count = await db.datalabs_reports.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        users_count = await db.users.count_documents({"tags": {"$in": ["DUMMY_DATA"]}})
        
        print(f"\n📊 Found dummy data:")
        print(f"   - Customers: {customers_count}")
        print(f"   - Activities: {activities_count}")
        print(f"   - Risks: {risks_count}")
        print(f"   - Opportunities: {opportunities_count}")
        print(f"   - Tasks: {tasks_count}")
        print(f"   - Documents: {documents_count}")
        print(f"   - DataLabs Reports: {reports_count}")
        print(f"   - Users: {users_count}")
        
        # Confirm deletion
        print("\n⚠️  This will permanently delete all dummy data!")
        response = input("Type 'DELETE' to confirm: ")
        
        if response != "DELETE":
            print("❌ Deletion cancelled.")
            return
        
        # Delete dummy data (tags is an array, so use $in operator)
        print("\n🗑️  Deleting dummy data...")
        
        result_customers = await db.customers.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_activities = await db.activities.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_risks = await db.risks.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_opportunities = await db.opportunities.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_tasks = await db.tasks.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_documents = await db.documents.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_reports = await db.datalabs_reports.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        result_users = await db.users.delete_many({"tags": {"$in": ["DUMMY_DATA"]}})
        
        print("\n✅ Deletion completed!")
        print(f"\n📊 Deleted:")
        print(f"   - Customers: {result_customers.deleted_count}")
        print(f"   - Activities: {result_activities.deleted_count}")
        print(f"   - Risks: {result_risks.deleted_count}")
        print(f"   - Opportunities: {result_opportunities.deleted_count}")
        print(f"   - Tasks: {result_tasks.deleted_count}")
        print(f"   - Documents: {result_documents.deleted_count}")
        print(f"   - DataLabs Reports: {result_reports.deleted_count}")
        print(f"   - Users: {result_users.deleted_count}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(remove_dummy_data())

