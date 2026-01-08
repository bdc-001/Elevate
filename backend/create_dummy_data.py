"""
Script to create comprehensive dummy data for 50 Indian customers.
All data is tagged with "DUMMY_DATA" tag for easy identification and removal.

Usage:
    # Use local .env file
    python3 create_dummy_data.py
    
    # Use production database (same as Vercel)
    python3 create_dummy_data.py --mongo-url "mongodb+srv://..." --db-name "elivate"
    
    # Or set environment variables
    export MONGO_URL="mongodb+srv://..."
    export DB_NAME="elivate"
    python3 create_dummy_data.py
"""

import asyncio
import argparse
import os
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Parse command line arguments
parser = argparse.ArgumentParser(description='Create dummy data for Convin Elevate')
parser.add_argument('--mongo-url', type=str, help='MongoDB connection string (overrides .env)')
parser.add_argument('--db-name', type=str, help='Database name (overrides .env)')
args = parser.parse_args()

# Use command line args if provided, otherwise use environment variables
MONGO_URL = args.mongo_url or os.getenv("MONGO_URL")
DB_NAME = args.db_name or os.getenv("DB_NAME", "elivate")

# Indian company names
INDIAN_COMPANIES = [
    "PW Online", "Flipkart", "CasaGrand", "Puravankara", "DLF", "Godrej Properties",
    "Mahindra Lifespaces", "Sobha", "Brigade Group", "Prestige Group", "Shapoorji Pallonji",
    "Tata Housing", "Lodha Group", "Adani Realty", "Embassy Group", "Phoenix Mills",
    "M3M", "Raheja", "Ansal API", "Emaar India", "Hiranandani", "K Raheja Corp",
    "Omaxe", "Unitech", "Jaypee", "Parsvnath", "Ansal", "BPTP", "Supertech",
    "Tata Consultancy Services", "Infosys", "Wipro", "HCL Technologies", "Tech Mahindra",
    "L&T Infotech", "Mindtree", "Mphasis", "Hexaware", "Zensar", "Persistent Systems",
    "Cyient", "L&T Technology Services", "KPIT", "Sonata Software", "Newgen Software",
    "Intellect Design", "Ramco Systems", "3i Infotech", "NIIT Technologies", "Syntel",
    "Cognizant India", "Accenture India", "IBM India", "Capgemini India", "Deloitte India"
]

INDUSTRIES = [
    "Real Estate", "E-commerce", "Technology", "IT Services", "Software", "Consulting",
    "Education", "Healthcare", "Finance", "Manufacturing", "Retail", "Telecommunications"
]

REGIONS = ["North", "South", "East", "West", "Central"]

PLAN_TYPES = ["Enterprise", "Professional", "Starter", "Premium", "Custom"]

ONBOARDING_STATUSES = ["Not Started", "In Progress", "Completed", "On Hold"]

ACCOUNT_STATUSES = ["Active", "At Risk", "Critical", "Churned", "Onboarding"]

HEALTH_STATUSES = ["Healthy", "At Risk", "Critical"]

ACTIVITY_TYPES = [
    "Call", "Email", "Meeting", "QBR", "Training", "Support", "Onboarding", "Check-in"
]

SENTIMENTS = ["Positive", "Neutral", "Negative"]

RISK_CATEGORIES = [
    "Usage", "Engagement", "Technical", "Commercial", "Relationship", "Competitive"
]

RISK_SUBCATEGORIES = {
    "Usage": ["Low Adoption", "Feature Underutilization", "Declining Usage"],
    "Engagement": ["Low Engagement", "No Response", "Stakeholder Change"],
    "Technical": ["Integration Issues", "Performance", "Data Quality"],
    "Commercial": ["Payment Delay", "Contract Dispute", "Budget Constraints"],
    "Relationship": ["Key Contact Left", "Escalation", "Dissatisfaction"],
    "Competitive": ["Competitor Evaluation", "Switching Risk"]
}

OPPORTUNITY_TYPES = ["Renewal", "Upsell", "Expansion", "Cross-sell"]

OPPORTUNITY_STAGES = [
    "Discovery", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"
]

TASK_TYPES = [
    "Follow-up", "QBR Preparation", "Training", "Onboarding", "Support", "Documentation"
]

TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"]

TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue"]

DOCUMENT_TYPES = [
    "Contract", "QBR Deck", "Proposal", "SOW", "MOU", "NDA", "Invoice", "Report"
]

REPORT_TYPES = [
    "Usage Report", "Health Report", "Engagement Report", "QBR Report", "Custom Report"
]

PRODUCTS = [
    "Convin AI", "Call Analytics", "Quality Assurance", "Agent Coaching", "Compliance"
]


def generate_id() -> str:
    """Generate a UUID-like string."""
    return secrets.token_urlsafe(16)


def random_date(start_days_ago: int = 365, end_days_ago: int = 0) -> str:
    """Generate a random date string in ISO format."""
    days_ago = random.randint(end_days_ago, start_days_ago)
    date = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return date.isoformat()


def random_future_date(days_ahead: int = 90) -> str:
    """Generate a random future date."""
    days = random.randint(1, days_ahead)
    date = datetime.now(timezone.utc) + timedelta(days=days)
    return date.isoformat()


async def get_or_create_csm_users(db) -> List[Dict[str, Any]]:
    """Get existing CSM users or create dummy ones."""
    # Try to get existing CSM users
    csm_users = await db.users.find({"role": "CSM", "status": "Active"}).to_list(length=10)
    
    if not csm_users:
        # Create 5 dummy CSM users
        csm_names = ["Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh"]
        csm_users = []
        for name in csm_names:
            user = {
                "id": generate_id(),
                "email": f"{name.lower().replace(' ', '.')}@convin.com",
                "name": name,
                "password": "$2b$12$dummy",  # Dummy hash
                "role": "CSM",
                "roles": ["CSM"],
                "status": "Active",
                "job_title": "Customer Success Manager",
                "department": "Customer Success",
                "created_at": random_date(180, 30),
                "tags": ["DUMMY_DATA"]
            }
            await db.users.insert_one(user)
            csm_users.append(user)
            print(f"Created dummy CSM user: {name}")
    
    return csm_users


async def create_customers(db, csm_users: List[Dict]) -> List[str]:
    """Create 50 Indian customers."""
    customer_ids = []
    
    for i, company in enumerate(INDIAN_COMPANIES[:50]):
        csm = random.choice(csm_users)
        health_score = random.randint(30, 100)
        health_status = "Healthy" if health_score >= 70 else ("At Risk" if health_score >= 50 else "Critical")
        
        contract_start = random_date(730, 30)
        contract_end = (datetime.fromisoformat(contract_start.replace('Z', '+00:00')) + timedelta(days=365)).isoformat()
        renewal_date = (datetime.fromisoformat(contract_end.replace('Z', '+00:00')) - timedelta(days=90)).isoformat()
        
        customer = {
            "id": generate_id(),
            "company_name": company,
            "website": f"https://www.{company.lower().replace(' ', '')}.com",
            "industry": random.choice(INDUSTRIES),
            "region": random.choice(REGIONS),
            "plan_type": random.choice(PLAN_TYPES),
            "arr": round(random.uniform(50000, 500000), 2),
            "one_time_setup_cost": round(random.uniform(10000, 50000), 2),
            "quarterly_consumption_cost": round(random.uniform(5000, 25000), 2),
            "contract_start_date": contract_start,
            "contract_end_date": contract_end,
            "renewal_date": renewal_date,
            "go_live_date": random_date(365, 60),
            "products_purchased": random.sample(PRODUCTS, random.randint(1, 3)),
            "onboarding_status": random.choice(ONBOARDING_STATUSES),
            "account_status": random.choice(ACCOUNT_STATUSES),
            "health_score": health_score,
            "health_status": health_status,
            "risk_level": random.choice(["Low", "Medium", "High"]) if health_score < 70 else "Low",
            "primary_objective": random.choice([
                "Improve Customer Satisfaction", "Increase Adoption", "Reduce Churn",
                "Expand Usage", "Renewal", "Upsell"
            ]),
            "calls_processed": random.randint(1000, 100000),
            "active_users": random.randint(10, 500),
            "total_licensed_users": random.randint(20, 1000),
            "csm_owner_id": csm["id"],
            "csm_owner_name": csm["name"],
            "am_owner_id": None,
            "am_owner_name": None,
            "tags": ["DUMMY_DATA"],
            "stakeholders": [
                {
                    "name": f"Contact {j+1}",
                    "email": f"contact{j+1}@{company.lower().replace(' ', '')}.com",
                    "role": random.choice(["CEO", "CTO", "VP", "Director", "Manager"]),
                    "phone": f"+91-{random.randint(9000000000, 9999999999)}"
                }
                for j in range(random.randint(1, 3))
            ],
            "last_activity_date": random_date(30, 0),
            "created_at": random_date(365, 30),
            "updated_at": random_date(30, 0)
        }
        
        await db.customers.insert_one(customer)
        customer_ids.append(customer["id"])
        print(f"Created customer {i+1}/50: {company}")
    
    return customer_ids


async def create_activities(db, customer_ids: List[str], csm_users: List[Dict]):
    """Create activities for each customer."""
    activity_count = 0
    
    for customer_id in customer_ids:
        # 3-8 activities per customer
        num_activities = random.randint(3, 8)
        
        for _ in range(num_activities):
            csm = random.choice(csm_users)
            activity_type = random.choice(ACTIVITY_TYPES)
            
            activity = {
                "id": generate_id(),
                "customer_id": customer_id,
                "customer_name": None,  # Will be populated by API
                "activity_type": activity_type,
                "activity_date": random_date(90, 0),
                "title": f"{activity_type} - {random.choice(['Follow-up', 'Check-in', 'QBR', 'Training', 'Support'])}",
                "summary": f"Conducted {activity_type.lower()} with customer. Discussed {random.choice(['product usage', 'renewal', 'expansion', 'support issues', 'training needs'])}.",
                "internal_notes": f"Internal notes for {activity_type.lower()} session.",
                "sentiment": random.choice(SENTIMENTS),
                "follow_up_required": random.choice([True, False]),
                "follow_up_date": random_future_date(30) if random.choice([True, False]) else None,
                "follow_up_status": random.choice(["Pending", "Completed", "Cancelled"]) if random.choice([True, False]) else None,
                "csm_id": csm["id"],
                "csm_name": csm["name"],
                "created_at": random_date(90, 0),
                "tags": ["DUMMY_DATA"]
            }
            
            await db.activities.insert_one(activity)
            activity_count += 1
    
    print(f"Created {activity_count} activities")


async def create_risks(db, customer_ids: List[str], csm_users: List[Dict]):
    """Create risks for some customers."""
    risk_count = 0
    # 30-40% of customers have risks
    customers_with_risks = random.sample(customer_ids, random.randint(15, 20))
    
    for customer_id in customers_with_risks:
        # 1-3 risks per customer
        num_risks = random.randint(1, 3)
        
        for _ in range(num_risks):
            category = random.choice(RISK_CATEGORIES)
            subcategory = random.choice(RISK_SUBCATEGORIES.get(category, ["General"]))
            severity = random.choice(["Low", "Medium", "High", "Critical"])
            status = random.choice(["Open", "In Progress", "Resolved", "Mitigated"])
            
            risk = {
                "id": generate_id(),
                "customer_id": customer_id,
                "customer_name": None,
                "category": category,
                "subcategory": subcategory,
                "severity": severity,
                "status": status,
                "title": f"{category} Risk: {subcategory}",
                "description": f"Identified {subcategory.lower()} risk in {category.lower()} category. Requires attention.",
                "impact_description": f"Potential impact on customer satisfaction and retention.",
                "mitigation_plan": f"Action plan to mitigate {subcategory.lower()} risk.",
                "revenue_impact": round(random.uniform(10000, 100000), 2) if severity in ["High", "Critical"] else None,
                "churn_probability": random.randint(20, 80) if severity in ["High", "Critical"] else random.randint(5, 30),
                "identified_date": random_date(180, 0),
                "target_resolution_date": random_future_date(60) if status != "Resolved" else None,
                "resolution_date": random_date(30, 0) if status == "Resolved" else None,
                "assigned_to_id": random.choice(csm_users)["id"],
                "assigned_to_name": None,
                "created_at": random_date(180, 0),
                "updated_at": random_date(30, 0),
                "tags": ["DUMMY_DATA"]
            }
            
            await db.risks.insert_one(risk)
            risk_count += 1
    
    print(f"Created {risk_count} risks")


async def create_opportunities(db, customer_ids: List[str], csm_users: List[Dict]):
    """Create opportunities for some customers."""
    opp_count = 0
    # 40-50% of customers have opportunities
    customers_with_opps = random.sample(customer_ids, random.randint(20, 25))
    
    for customer_id in customers_with_opps:
        # 1-2 opportunities per customer
        num_opps = random.randint(1, 2)
        
        for _ in range(num_opps):
            opp_type = random.choice(OPPORTUNITY_TYPES)
            stage = random.choice(OPPORTUNITY_STAGES)
            
            opportunity = {
                "id": generate_id(),
                "customer_id": customer_id,
                "customer_name": None,
                "opportunity_type": opp_type,
                "title": f"{opp_type} Opportunity",
                "description": f"{opp_type} opportunity with potential value.",
                "value": round(random.uniform(20000, 200000), 2),
                "probability": random.randint(20, 90),
                "stage": stage,
                "expected_close_date": random_future_date(180),
                "owner_id": random.choice(csm_users)["id"],
                "owner_name": None,
                "created_at": random_date(180, 0),
                "updated_at": random_date(30, 0),
                "tags": ["DUMMY_DATA"]
            }
            
            await db.opportunities.insert_one(opportunity)
            opp_count += 1
    
    print(f"Created {opp_count} opportunities")


async def create_tasks(db, customer_ids: List[str], csm_users: List[Dict]):
    """Create tasks for customers."""
    task_count = 0
    
    for customer_id in customer_ids:
        # 2-5 tasks per customer
        num_tasks = random.randint(2, 5)
        
        for _ in range(num_tasks):
            task_type = random.choice(TASK_TYPES)
            priority = random.choice(TASK_PRIORITIES)
            status = random.choice(TASK_STATUSES)
            csm = random.choice(csm_users)
            
            due_date = random_future_date(30) if status != "Completed" else random_date(30, 0)
            
            task = {
                "id": generate_id(),
                "customer_id": customer_id,
                "customer_name": None,
                "task_type": task_type,
                "title": f"{task_type} Task",
                "description": f"Task description for {task_type.lower()}.",
                "priority": priority,
                "status": status,
                "assigned_to_id": csm["id"],
                "assigned_to_name": csm["name"],
                "due_date": due_date,
                "completed_date": random_date(30, 0) if status == "Completed" else None,
                "created_by_id": csm["id"],
                "created_by_name": csm["name"],
                "created_at": random_date(90, 0),
                "updated_at": random_date(30, 0),
                "tags": ["DUMMY_DATA"]
            }
            
            await db.tasks.insert_one(task)
            task_count += 1
    
    print(f"Created {task_count} tasks")


async def create_documents(db, customer_ids: List[str], csm_users: List[Dict]):
    """Create documents for customers."""
    doc_count = 0
    # 60-70% of customers have documents
    customers_with_docs = random.sample(customer_ids, random.randint(30, 35))
    
    for customer_id in customers_with_docs:
        # 1-4 documents per customer
        num_docs = random.randint(1, 4)
        
        for _ in range(num_docs):
            doc_type = random.choice(DOCUMENT_TYPES)
            csm = random.choice(csm_users)
            
            document = {
                "id": generate_id(),
                "customer_id": customer_id,
                "document_type": doc_type,
                "title": f"{doc_type} Document",
                "description": f"{doc_type} document for customer.",
                "document_url": f"https://example.com/documents/{generate_id()}.pdf",
                "file_name": f"{doc_type.lower().replace(' ', '_')}_{generate_id()[:8]}.pdf",
                "file_size": random.randint(100000, 5000000),
                "created_by_id": csm["id"],
                "created_by_name": csm["name"],
                "created_at": random_date(180, 0),
                "tags": ["DUMMY_DATA"]
            }
            
            await db.documents.insert_one(document)
            doc_count += 1
    
    print(f"Created {doc_count} documents")


async def create_datalabs_reports(db, customer_ids: List[str], csm_users: List[Dict]):
    """Create DataLabs reports for customers."""
    report_count = 0
    # 50-60% of customers have reports
    customers_with_reports = random.sample(customer_ids, random.randint(25, 30))
    
    for customer_id in customers_with_reports:
        # 1-3 reports per customer
        num_reports = random.randint(1, 3)
        
        for _ in range(num_reports):
            report_type = random.choice(REPORT_TYPES)
            csm = random.choice(csm_users)
            
            report = {
                "id": generate_id(),
                "customer_id": customer_id,
                "customer_name": None,
                "report_date": random_date(180, 0),
                "report_title": f"{report_type} - {random_date(30, 0)[:10]}",
                "report_link": f"https://example.com/reports/{generate_id()}.pdf",
                "report_type": report_type,
                "description": f"{report_type} generated for customer analysis.",
                "sent_to": [f"contact{random.randint(1, 3)}@customer.com"],
                "created_by_id": csm["id"],
                "created_by_name": csm["name"],
                "created_at": random_date(180, 0),
                "tags": ["DUMMY_DATA"]
            }
            
            await db.datalabs_reports.insert_one(report)
            report_count += 1
    
    print(f"Created {report_count} DataLabs reports")


async def main():
    """Main function to create all dummy data."""
    print("=" * 60)
    print("Creating Dummy Data for 50 Indian Customers")
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
        # Get or create CSM users
        print("\n1. Setting up CSM users...")
        csm_users = await get_or_create_csm_users(db)
        print(f"   Using {len(csm_users)} CSM users")
        
        # Create customers
        print("\n2. Creating 50 customers...")
        customer_ids = await create_customers(db, csm_users)
        
        # Create related data
        print("\n3. Creating activities...")
        await create_activities(db, customer_ids, csm_users)
        
        print("\n4. Creating risks...")
        await create_risks(db, customer_ids, csm_users)
        
        print("\n5. Creating opportunities...")
        await create_opportunities(db, customer_ids, csm_users)
        
        print("\n6. Creating tasks...")
        await create_tasks(db, customer_ids, csm_users)
        
        print("\n7. Creating documents...")
        await create_documents(db, customer_ids, csm_users)
        
        print("\n8. Creating DataLabs reports...")
        await create_datalabs_reports(db, customer_ids, csm_users)
        
        print("\n" + "=" * 60)
        print("✅ Dummy data creation completed successfully!")
        print("=" * 60)
        print(f"\n📊 Summary:")
        print(f"   - Customers: 50")
        print(f"   - All data tagged with 'DUMMY_DATA' for easy removal")
        print(f"\n💡 To remove all dummy data, run:")
        print(f"   db.customers.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.activities.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.risks.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.opportunities.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.tasks.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.documents.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.datalabs_reports.deleteMany({{tags: 'DUMMY_DATA'}})")
        print(f"   db.users.deleteMany({{tags: 'DUMMY_DATA'}})")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

