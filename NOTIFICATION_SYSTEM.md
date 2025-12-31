# Notification Center - Complete Implementation Guide

## 🎯 Overview

A comprehensive, role-aware notification system that ensures users never miss critical events across customers, risks, tasks, opportunities, reports, and system operations.

---

## ✅ What's Been Implemented

### 1. **Backend Infrastructure**

#### Database Schema (`db_schema.py`)
- ✅ `notifications` collection with validator
- ✅ Indexes for efficient querying
- ✅ Support for severity, module, status tracking

#### API Endpoints (`server.py`)
```
GET    /api/notifications              - Get filtered notifications
GET    /api/notifications/unread-count - Get unread count
PUT    /api/notifications/:id/mark-read   - Mark as read
PUT    /api/notifications/:id/mark-unread - Mark as unread
PUT    /api/notifications/:id/archive     - Archive notification
PUT    /api/notifications/:id/action      - Mark as actioned
PUT    /api/notifications/mark-all-read   - Bulk mark as read
POST   /api/notifications              - Create notification (admin only)
```

#### Notification Data Model
```python
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "message": "string",
  "severity": "Critical|High|Normal|Info",
  "module": "Customer|Activity|Risk|Opportunity|Task|Document|Report|System",
  "status": "Unread|Read|Archived|Actioned",
  "entity_type": "customer|task|risk|etc",
  "entity_id": "uuid",
  "entity_name": "string",
  "cta_text": "View Account|Complete Task|etc",
  "cta_url": "/customers/123|/tasks/456|etc",
  "metadata": {},
  "created_at": "datetime",
  "read_at": "datetime|null",
  "actioned_at": "datetime|null"
}
```

### 2. **Frontend Components**

#### NotificationBell (`NotificationBell.jsx`)
- ✅ Bell icon in header
- ✅ Red badge with unread count
- ✅ Auto-polling every 30 seconds
- ✅ Click to open notification center

#### NotificationCenter (`NotificationCenter.jsx`)
- ✅ Slide-in panel from right
- ✅ Filter by status, severity, module
- ✅ Mark as read/unread
- ✅ Archive notifications
- ✅ Bulk "mark all as read"
- ✅ Deep linking to entities
- ✅ Severity-based icons and colors
- ✅ Relative time display ("5m ago", "2h ago")
- ✅ Empty state handling

#### Integration (`EnhancedLayout.jsx`)
- ✅ Notification bell in header
- ✅ Positioned next to user info

---

## 🎨 UI/UX Features

### Visual Design

**Severity Colors:**
- 🔴 **Critical:** Red (AlertCircle icon)
- 🟠 **High:** Orange (AlertTriangle icon)
- 🔵 **Normal:** Blue (Info icon)
- ⚪ **Info:** Gray (Info icon)

**Notification States:**
- **Unread:** Blue background, blue left border, bold text
- **Read:** White background, normal weight
- **Archived:** Hidden from default view

**Panel Layout:**
```
┌─────────────────────────────────────┐
│  Notifications        [5 new]   [X] │  ← Header (gradient)
├─────────────────────────────────────┤
│  Filter by:                         │
│  [Status ▼] [Severity ▼] [Module ▼]│
│  [Mark all as read]                 │  ← Filters
├─────────────────────────────────────┤
│  🔴 Health Score Alert    2h ago    │
│  Acme Corp health dropped to 45     │
│  [View Account] [Mark read]         │
├─────────────────────────────────────┤
│  🟠 Task Overdue          5h ago    │
│  Prepare QBR for TechCo             │
│  [Complete Task] [Archive]          │
├─────────────────────────────────────┤
│  ...more notifications...           │
└─────────────────────────────────────┘
```

---

## 📋 Notification Types by Module

### Module 1: Customer / Account Management

#### Triggers:
- Account assigned / reassigned
- Health score crosses threshold
- Account enters "At Risk" or "Critical"
- Renewal window opens

#### Example Notifications:

**CSM:**
```javascript
{
  title: "New Account Assigned",
  message: "You've been assigned Acme Corp",
  severity: "Normal",
  module: "Customer",
  entity_type: "customer",
  entity_id: "cust-123",
  entity_name: "Acme Corp",
  cta_text: "View Account",
  cta_url: "/customers/cust-123"
}
```

**AM:**
```javascript
{
  title: "High-Value Account at Risk",
  message: "Globex ($120K ARR) moved to Critical health status",
  severity: "Critical",
  module: "Customer",
  entity_type: "customer",
  entity_id: "cust-456",
  entity_name: "Globex Inc",
  cta_text: "View Account",
  cta_url: "/customers/cust-456"
}
```

### Module 2: Activities & Follow-Ups

#### Triggers:
- Follow-up due / overdue
- Activity logged by teammate
- Customer sentiment = Negative

#### Example Notifications:

```javascript
{
  title: "Follow-up Due Today",
  message: "Follow-up meeting scheduled with TechNova",
  severity: "High",
  module: "Activity",
  cta_text: "Log Activity",
  cta_url: "/customers/cust-789#activities"
}
```

### Module 3: Risk Management

#### Triggers:
- New risk flagged
- Risk severity escalated
- SLA breach
- Risk auto-escalation

#### Example Notifications:

```javascript
{
  title: "Critical Risk Flagged",
  message: "Payment delay risk on RetailX account",
  severity: "Critical",
  module: "Risk",
  entity_type: "risk",
  entity_id: "risk-123",
  entity_name: "Payment Delay - RetailX",
  cta_text: "View Risk",
  cta_url: "/customers/cust-123#risks"
}
```

### Module 4: Opportunity & Renewals

#### Triggers:
- Opportunity created / stage change
- Renewal opportunity auto-created
- Deal marked Lost/Won

#### Example Notifications:

```javascript
{
  title: "Renewal Opportunity Created",
  message: "90-day renewal opportunity for FinServe ($80K)",
  severity: "Normal",
  module: "Opportunity",
  entity_type: "opportunity",
  entity_id: "opp-456",
  cta_text: "View Opportunity",
  cta_url: "/opportunities"
}
```

### Module 5: Tasks

#### Triggers:
- Task assigned
- Task due / overdue
- Task reassigned
- Bulk task creation

#### Example Notifications:

```javascript
{
  title: "Task Assigned to You",
  message: "Prepare QBR deck for Acme Corp",
  severity: "Normal",
  module: "Task",
  entity_type: "task",
  entity_id: "task-789",
  cta_text: "View Task",
  cta_url: "/tasks"
}
```

### Module 6: Documents

#### Triggers:
- Document uploaded
- New version added
- Document shared
- Document expiring

#### Example Notifications:

```javascript
{
  title: "Document Uploaded",
  message: "New QBR deck uploaded for Globex",
  severity: "Info",
  module: "Document",
  cta_text: "View Document",
  cta_url: "/customers/cust-456#documents"
}
```

### Module 7: Data Labs Reports

#### Triggers:
- Report due (recurring)
- Report marked Viewed / Acknowledged
- Report overdue

#### Example Notifications:

```javascript
{
  title: "Monthly Report Due",
  message: "Usage report due for Acme Corp",
  severity: "High",
  module: "Report",
  cta_text: "Add Report",
  cta_url: "/data-labs-reports"
}
```

### Module 8: System (CS Ops)

#### Triggers:
- Integration failure
- Bulk import/export completed
- Permission changes
- Audit anomalies

#### Example Notifications:

```javascript
{
  title: "Integration Failure",
  message: "HubSpot sync failed (last 15 mins)",
  severity: "Critical",
  module: "System",
  cta_text: "View Logs",
  cta_url: "/settings#integrations"
}
```

---

## 🔧 Helper Function for Creating Notifications

Use the `create_notification_for_user` helper in `server.py`:

```python
await create_notification_for_user(
    user_id="user-123",
    title="Health Score Alert",
    message="Acme Corp health dropped below 60",
    severity="Critical",
    module="Customer",
    entity_type="customer",
    entity_id="cust-123",
    entity_name="Acme Corp",
    cta_text="View Account",
    cta_url="/customers/cust-123",
    metadata={"health_score": 45, "previous_score": 75}
)
```

---

## 🚀 Integration Examples

### Example 1: Health Score Change (in customer update endpoint)

```python
@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, customer: CustomerUpdate, current_user: Dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"id": customer_id})
    
    # ... update logic ...
    
    # Check if health score crossed threshold
    old_health = existing.get('health_score', 100)
    new_health = customer.health_score
    
    if old_health >= 60 and new_health < 60:
        # Notify CSM
        csm_id = existing.get('csm_owner_id')
        if csm_id:
            await create_notification_for_user(
                user_id=csm_id,
                title="Health Score Alert",
                message=f"{existing['company_name']} health dropped to {new_health}",
                severity="Critical",
                module="Customer",
                entity_type="customer",
                entity_id=customer_id,
                entity_name=existing['company_name'],
                cta_text="View Account",
                cta_url=f"/customers/{customer_id}"
            )
```

### Example 2: Task Assignment

```python
@api_router.post("/tasks")
async def create_task(task: TaskCreate, current_user: Dict = Depends(get_current_user)):
    task_dict = task.model_dump()
    # ... create task ...
    
    # Notify assigned user
    if task.assigned_to_id:
        await create_notification_for_user(
            user_id=task.assigned_to_id,
            title="New Task Assigned",
            message=task.title,
            severity="Normal",
            module="Task",
            entity_type="task",
            entity_id=task_dict['id'],
            cta_text="View Task",
            cta_url="/tasks"
        )
```

### Example 3: Risk Escalation

```python
@api_router.post("/risks")
async def create_risk(risk: RiskCreate, current_user: Dict = Depends(get_current_user)):
    # ... create risk ...
    
    if risk.severity == "Critical":
        # Notify CSM
        customer = await db.customers.find_one({"id": risk.customer_id})
        csm_id = customer.get('csm_owner_id')
        
        if csm_id:
            await create_notification_for_user(
                user_id=csm_id,
                title="Critical Risk Flagged",
                message=f"{risk.title} on {customer['company_name']}",
                severity="Critical",
                module="Risk",
                entity_type="risk",
                entity_id=risk_dict['id'],
                entity_name=risk.title,
                cta_text="View Risk",
                cta_url=f"/customers/{risk.customer_id}#risks"
            )
        
        # Also notify AM if exists
        am_id = customer.get('am_owner_id')
        if am_id:
            await create_notification_for_user(
                user_id=am_id,
                title="Critical Risk on Team Account",
                message=f"{customer['company_name']}: {risk.title}",
                severity="Critical",
                module="Risk",
                entity_type="risk",
                entity_id=risk_dict['id'],
                entity_name=risk.title,
                cta_text="View Risk",
                cta_url=f"/customers/{risk.customer_id}#risks"
            )
```

---

## 📊 Role-Based Notification Scoping

### CSM (Customer Success Manager)
- Receives notifications for **own accounts only**
- Notified about: assignments, health changes, task assignments, follow-ups

### AM (Account Manager)
- Receives notifications for **all team accounts**
- Notified about: critical risks, team escalations, CSM reassignments

### CS Leadership
- Receives notifications for **portfolio-level events**
- Notified about: major health changes, ARR at risk, critical unresolved risks

### CS Operations
- Receives notifications for **system events**
- Notified about: integration failures, bulk operations, data hygiene issues

### Sales (View-Only)
- Receives notifications for **opportunities and renewals**
- Notified about: opportunity stage changes, deal closures

---

## 🔄 Next Steps: Auto-Notification Triggers

### Immediate Priority:
1. **Health Score Changes** - Notify on threshold crossing
2. **Task Assignments** - Notify on new task
3. **Task Overdue** - Daily check for overdue tasks
4. **Risk Creation** - Notify CSM and AM on critical risks

### Medium Priority:
5. **Renewal Window** - 90/60/30 day alerts
6. **Activity Follow-ups** - Remind on follow-up dates
7. **Document Uploads** - Notify stakeholders
8. **Opportunity Stage Changes** - Notify on progression

### Advanced:
9. **Scheduled Reports** - Weekly/monthly summaries
10. **Integration Failures** - Real-time CS Ops alerts
11. **Bulk Operations** - Completion notifications
12. **Audit Anomalies** - Security/compliance alerts

---

## 🧪 Testing Guide

### 1. Manual Testing (Create Notification via API)

```bash
# As admin/CS Ops, create a test notification
curl -X POST http://localhost:8000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "title": "Test Notification",
    "message": "This is a test notification",
    "severity": "Normal",
    "module": "Customer",
    "entity_type": "customer",
    "entity_id": "cust-123",
    "entity_name": "Acme Corp",
    "cta_text": "View Account",
    "cta_url": "/customers/cust-123"
  }'
```

### 2. Frontend Testing

1. **View Notification Bell:**
   - Log in to the platform
   - Check header for bell icon
   - Verify red badge appears with count

2. **Open Notification Center:**
   - Click bell icon
   - Verify panel slides in from right
   - Check that notifications load

3. **Filter Notifications:**
   - Try filtering by status (Unread/Read)
   - Try filtering by severity
   - Try filtering by module

4. **Mark as Read:**
   - Click "Mark read" on a notification
   - Verify badge count decreases
   - Verify notification styling changes

5. **Deep Linking:**
   - Click "View Account" on a customer notification
   - Verify it navigates to the correct page

6. **Bulk Actions:**
   - Click "Mark all as read"
   - Verify all notifications marked
   - Verify badge goes to 0

---

## 🎯 Future Enhancements

### User Preferences (To Be Implemented)
- Toggle notification types on/off
- Severity filters (e.g., only show Critical/High)
- Quiet hours (mute during specific times)
- Digest vs real-time mode

### Admin Configuration (To Be Implemented)
- Role-level notification defaults
- SLA threshold configuration
- Auto-escalation rules
- Bundling/deduplication logic

### Additional Features
- Email digest notifications
- Slack integration
- Push notifications (browser)
- Notification templates
- Scheduled notifications
- Recurring reminders

---

## ✅ Summary

**Backend:**
- ✅ Notification schema and indexes
- ✅ 8 REST API endpoints
- ✅ Helper function for creating notifications
- ✅ Role-based access control

**Frontend:**
- ✅ Notification bell with badge
- ✅ Comprehensive notification center
- ✅ Filtering and bulk actions
- ✅ Deep linking to entities
- ✅ Auto-refresh polling

**Ready for Integration:**
- Customer health changes
- Task assignments
- Risk escalations
- Opportunity updates
- And more...

The notification system is now **fully functional** and ready to be integrated with all business logic triggers across the platform! 🎉

