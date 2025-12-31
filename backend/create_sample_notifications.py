"""
Script to create sample notifications for testing.
Run this after logging in to get a user ID, then create notifications for that user.
"""

import os
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid

load_dotenv()

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

async def create_sample_notifications():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get a user to assign notifications to
    user = await db.users.find_one({"email": {"$exists": True}})
    if not user:
        print("❌ No users found. Please register a user first.")
        return
    
    user_id = user['id']
    print(f"✅ Creating notifications for user: {user['name']} ({user['email']})")
    
    sample_notifications = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Health Score Alert",
            "message": "Acme Corp health dropped below 60. Immediate action required.",
            "severity": "Critical",
            "module": "Customer",
            "status": "Unread",
            "entity_type": "customer",
            "entity_id": "sample-cust-1",
            "entity_name": "Acme Corp",
            "cta_text": "View Account",
            "cta_url": "/customers/sample-cust-1",
            "metadata": {"health_score": 45, "previous_score": 75},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Task Assigned to You",
            "message": "Prepare QBR deck for Globex Inc by Friday",
            "severity": "High",
            "module": "Task",
            "status": "Unread",
            "entity_type": "task",
            "entity_id": "sample-task-1",
            "entity_name": "Prepare QBR Deck - Globex",
            "cta_text": "View Task",
            "cta_url": "/tasks",
            "metadata": {"due_date": "2025-01-10"},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Critical Risk Flagged",
            "message": "Payment delay risk on RetailX account. CSM requested immediate escalation.",
            "severity": "Critical",
            "module": "Risk",
            "status": "Unread",
            "entity_type": "risk",
            "entity_id": "sample-risk-1",
            "entity_name": "Payment Delay - RetailX",
            "cta_text": "View Risk",
            "cta_url": "/customers/sample-cust-2#risks",
            "metadata": {"risk_type": "Payment Delay", "days_overdue": 15},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Renewal Opportunity Created",
            "message": "90-day renewal window for FinServe ($80K ARR)",
            "severity": "Normal",
            "module": "Opportunity",
            "status": "Unread",
            "entity_type": "opportunity",
            "entity_id": "sample-opp-1",
            "entity_name": "FinServe Renewal",
            "cta_text": "View Opportunity",
            "cta_url": "/opportunities",
            "metadata": {"arr": 80000, "days_to_renewal": 90},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Document Uploaded",
            "message": "New QBR deck uploaded for TechNova by Sarah Johnson",
            "severity": "Info",
            "module": "Document",
            "status": "Unread",
            "entity_type": "document",
            "entity_id": "sample-doc-1",
            "entity_name": "Q1 2025 QBR - TechNova.pdf",
            "cta_text": "View Document",
            "cta_url": "/customers/sample-cust-3#documents",
            "metadata": {"uploaded_by": "Sarah Johnson", "file_size": "2.4 MB"},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Monthly Usage Report Due",
            "message": "Usage analysis report is due for 3 accounts this week",
            "severity": "High",
            "module": "Report",
            "status": "Unread",
            "entity_type": "report",
            "entity_id": None,
            "entity_name": None,
            "cta_text": "View Reports",
            "cta_url": "/data-labs-reports",
            "metadata": {"accounts_count": 3, "report_type": "Usage Analysis"},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Follow-up Due Today",
            "message": "Scheduled follow-up call with Acme Corp stakeholders",
            "severity": "Normal",
            "module": "Activity",
            "status": "Unread",
            "entity_type": "activity",
            "entity_id": "sample-activity-1",
            "entity_name": "Follow-up Call - Acme",
            "cta_text": "Log Activity",
            "cta_url": "/customers/sample-cust-1#activities",
            "metadata": {"activity_type": "Follow-up Call"},
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
            "actioned_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "New Account Assigned",
            "message": "You've been assigned as CSM for CloudTech Solutions",
            "severity": "Normal",
            "module": "Customer",
            "status": "Read",
            "entity_type": "customer",
            "entity_id": "sample-cust-4",
            "entity_name": "CloudTech Solutions",
            "cta_text": "View Account",
            "cta_url": "/customers/sample-cust-4",
            "metadata": {"arr": 150000, "onboarding_status": "In Progress"},
            "created_at": datetime.now(timezone.utc),
            "read_at": datetime.now(timezone.utc),
            "actioned_at": None
        },
    ]
    
    # Insert notifications
    result = await db.notifications.insert_many(sample_notifications)
    print(f"✅ Created {len(result.inserted_ids)} sample notifications")
    print(f"\n📊 Notification Breakdown:")
    print(f"   - Critical: 2")
    print(f"   - High: 2")
    print(f"   - Normal: 3")
    print(f"   - Info: 1")
    print(f"\n✅ Open the app and click the notification bell to see them!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_sample_notifications())

