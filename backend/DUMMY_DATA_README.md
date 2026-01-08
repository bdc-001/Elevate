# Dummy Data for Convin Elevate

## Overview

This directory contains scripts to create and remove comprehensive dummy data for testing and visualization purposes.

## Created Data

### ✅ Successfully Created

- **50 Indian Customers** including:
  - PW Online, Flipkart, CasaGrand, Puravankara, DLF, Godrej Properties
  - Tata Consultancy Services, Infosys, Wipro, HCL Technologies
  - And 40+ more Indian companies

- **281 Activities** (3-8 per customer)
- **31 Risks** (for 15-20 customers)
- **25 Opportunities** (for 20-25 customers)
- **172 Tasks** (2-5 per customer)
- **82 Documents** (for 30-35 customers)
- **57 DataLabs Reports** (for 25-30 customers)

### Data Characteristics

- **Realistic Indian Company Names**: All customers are real Indian companies
- **Comprehensive Coverage**: Data spans all modules (Customers, Activities, Risks, Opportunities, Tasks, Documents, Reports)
- **Varied Health Scores**: 30-100 (distributed across Healthy, At Risk, Critical)
- **Realistic ARR**: $50K - $500K per customer
- **Proper Relationships**: All data is properly linked (customer_id, owner_id, etc.)
- **Date Ranges**: Activities, tasks, and other time-based data span the last 90-180 days

## Identification

All dummy data is tagged with **`"DUMMY_DATA"`** in the `tags` field for easy identification and removal.

## Usage

### Create Dummy Data

```bash
cd backend
python3 create_dummy_data.py
```

This will:
1. Check for existing CSM users (or create 5 dummy CSM users if none exist)
2. Create 50 customers with comprehensive data
3. Create related activities, risks, opportunities, tasks, documents, and reports

### Remove Dummy Data

```bash
cd backend
python3 remove_dummy_data.py
```

This will:
1. Show a count of all dummy data
2. Ask for confirmation (type "DELETE" to confirm)
3. Remove all data tagged with "DUMMY_DATA"

### Manual Removal (MongoDB Shell)

If you prefer to remove manually using MongoDB shell:

```javascript
// Connect to your database
use elivate

// Remove all dummy data
db.customers.deleteMany({tags: "DUMMY_DATA"})
db.activities.deleteMany({tags: "DUMMY_DATA"})
db.risks.deleteMany({tags: "DUMMY_DATA"})
db.opportunities.deleteMany({tags: "DUMMY_DATA"})
db.tasks.deleteMany({tags: "DUMMY_DATA"})
db.documents.deleteMany({tags: "DUMMY_DATA"})
db.datalabs_reports.deleteMany({tags: "DUMMY_DATA"})
db.users.deleteMany({tags: "DUMMY_DATA"})
```

## Data Structure

### Customers
- Company name, website, industry, region
- ARR, plan type, contract dates
- Health score, health status, account status
- CSM owner assignment
- Stakeholders (1-3 per customer)

### Activities
- Various types: Call, Email, Meeting, QBR, Training, Support, etc.
- Sentiment tracking (Positive, Neutral, Negative)
- Follow-up requirements and dates

### Risks
- Categories: Usage, Engagement, Technical, Commercial, Relationship, Competitive
- Severity levels: Low, Medium, High, Critical
- Status: Open, In Progress, Resolved, Mitigated

### Opportunities
- Types: Renewal, Upsell, Expansion, Cross-sell
- Stages: Discovery, Qualification, Proposal, Negotiation, Closed Won/Lost
- Value and probability tracking

### Tasks
- Types: Follow-up, QBR Preparation, Training, Onboarding, Support
- Priorities: Low, Medium, High, Critical
- Status: Pending, In Progress, Completed, Overdue

### Documents
- Types: Contract, QBR Deck, Proposal, SOW, MOU, NDA, Invoice, Report
- File metadata (name, size, URL)

### DataLabs Reports
- Types: Usage Report, Health Report, Engagement Report, QBR Report, Custom Report
- Sent to customer contacts

## Notes

- All dates are in ISO format (UTC)
- CSM users are assigned randomly to customers
- Health scores determine health status automatically
- Some customers may not have all types of data (e.g., not all customers have risks or opportunities)
- The script uses existing CSM users if available, or creates dummy CSM users if none exist

## Troubleshooting

### If data doesn't appear in the dashboard:
1. Check MongoDB connection (verify `.env` file has correct `MONGO_URL`)
2. Verify database name matches (`DB_NAME` in `.env`)
3. Check that the backend server is running and can connect to MongoDB
4. Refresh the frontend dashboard

### If you want to recreate data:
1. First remove existing dummy data using `remove_dummy_data.py`
2. Then run `create_dummy_data.py` again

## Files

- `create_dummy_data.py` - Script to create dummy data
- `remove_dummy_data.py` - Script to remove dummy data
- `DUMMY_DATA_README.md` - This file


