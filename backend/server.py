from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
import traceback
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum
import secrets

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_schema import ensure_schema

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging setup (must be early for error handling)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    # unexpected errors often mean DB issues or code bugs
    logger.error(f"Global error on {request.url.path}: {error_msg}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": error_msg, "path": str(request.url.path)}
    )
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# MongoDB connection
# MongoDB connection
import certifi
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

client = None
db = None

if mongo_url and db_name:
    try:
        # Use certifi AND allow invalid certs to bypass Vercel environment issues
        client = AsyncIOMotorClient(
            mongo_url,
            tlsCAFile=certifi.where(),
            tls=True,
            tlsAllowInvalidCertificates=True,
            uuidRepresentation='standard'
        )
        db = client[db_name]
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
else:
    logging.warning("MONGO_URL or DB_NAME not set in environment variables.")

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "mongo_connected": client is not None,
        "env_vars_present": {
            "MONGO_URL": bool(mongo_url),
            "DB_NAME": bool(db_name),
            "JWT_SECRET": bool(os.environ.get("JWT_SECRET"))
        }
    }

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days




SETTINGS_CACHE = None
SETTINGS_CACHE_TIMESTAMP = 0
CACHE_TTL = 300  # 5 minutes

@app.get("/api/admin/init-db")
async def init_db_endpoint():
    """Manually trigger schema validation and settings initialization."""
    try:
        if db:
            await ensure_schema(db)
            await _ensure_settings(force_refresh=True)
            return {"status": "ok", "message": "Schema and settings initialized"}
        return {"status": "error", "message": "Database not connected"}
    except Exception as e:
        logging.exception("Init DB failed")
        raise HTTPException(status_code=500, detail=str(e))

async def _ensure_settings(force_refresh: bool = False) -> Dict[str, Any]:
    global SETTINGS_CACHE, SETTINGS_CACHE_TIMESTAMP
    
    now = datetime.now().timestamp()
    if not force_refresh and SETTINGS_CACHE and (now - SETTINGS_CACHE_TIMESTAMP < CACHE_TTL):
        return SETTINGS_CACHE

    existing = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if existing:
        # Backfill new fields (idempotent migrations)
        missing_updates: Dict[str, Any] = {}

        # role_permissions
        if ("role_permissions" not in existing) or (existing.get("role_permissions") is None) or (existing.get("role_permissions") == {}):
            missing_updates["role_permissions"] = _default_role_permissions()

        # roles
        try:
            existing_roles = list(existing.get("roles") or [])
            have = {r.get("role") for r in existing_roles if isinstance(r, dict)}
            to_add = []
            for rr in [
                {"role": "SALES", "name": "Sales (View Only)", "desc": "View customers and opportunities (read-only)"},
                {"role": "READ_ONLY", "name": "Read Only", "desc": "Read-only access within assigned scope"},
            ]:
                if rr["role"] not in have:
                    to_add.append(rr)
            if to_add:
                missing_updates["roles"] = existing_roles + to_add
        except Exception:
            pass

        if missing_updates:
            await db.settings.update_one({"id": "global"}, {"$set": missing_updates})
            existing = await db.settings.find_one({"id": "global"}, {"_id": 0}) or existing
        
        SETTINGS_CACHE = existing
        SETTINGS_CACHE_TIMESTAMP = now
        return existing

    # Default settings creation (trimmed for brevity, logic remains same but now cached)
    defaults = SettingsDoc(
        tags=[
            "Enterprise", "SMB", "Strategic", "High Touch", "Tech Touch",
            "At Risk", "Champion", "Expansion Ready", "Renewal Due", "Upsell Target"
        ],
        dropdowns=[
            DropdownDefinition(name="Activity Types", values=["Weekly Sync", "QBR", "MBR", "Phone Call", "Email"]),
            DropdownDefinition(name="Risk Categories", values=["Product Usage", "Onboarding", "Support", "Relationship", "Commercial/Billing"]),
            DropdownDefinition(name="Opportunity Stages", values=["Identified", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]),
            DropdownDefinition(name="Task Priorities", values=["Critical", "High", "Medium", "Low"]),
            DropdownDefinition(name="Industries", values=["Technology", "Banking", "Fintech", "E-commerce"]),
            DropdownDefinition(name="Regions", values=["South India", "West India", "North India", "East India", "Global"]),
        ],
        roles=[
            RoleDefinition(role="ADMIN", name="Administrator", desc="Full access to all features and settings"),
            RoleDefinition(role="CSM", name="Customer Success Manager", desc="Manage assigned customers, activities, tasks"),
            RoleDefinition(role="AM", name="Account Manager", desc="View customers, manage opportunities and renewals"),
            RoleDefinition(role="CS_LEADER", name="CS Leadership", desc="View all customers, reports, team performance"),
            RoleDefinition(role="CS_OPS", name="CS Operations", desc="Manage settings, configurations, reports"),
            RoleDefinition(role="SALES", name="Sales (View Only)", desc="View customers and opportunities (read-only)"),
            RoleDefinition(role="READ_ONLY", name="Read Only", desc="Read-only access within assigned scope"),
        ],
        role_permissions=_default_role_permissions(),
        field_configs={
            "customer": [
                FieldConfig(name="Company Name", type="Text", required=True, editable=False),
                FieldConfig(name="Industry", type="Dropdown", required=False, editable=True),
                FieldConfig(name="Region", type="Dropdown", required=False, editable=True),
                FieldConfig(name="ARR", type="Currency", required=False, editable=True),
                FieldConfig(name="One-time Setup Cost", type="Currency", required=False, editable=True),
                FieldConfig(name="Quarterly Consumption Cost", type="Currency", required=False, editable=True),
                FieldConfig(name="Health Score", type="Number", required=False, editable=True),
            ],
            "activity": [
                FieldConfig(name="Activity Type", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Title", type="Text", required=True, editable=True),
                FieldConfig(name="Summary", type="Long Text", required=True, editable=True),
                FieldConfig(name="Sentiment", type="Dropdown", required=False, editable=True),
            ],
            "risk": [
                FieldConfig(name="Category", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Severity", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Status", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Churn Probability", type="Percentage", required=False, editable=True),
            ],
            "opportunity": [
                FieldConfig(name="Type", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Stage", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Value", type="Currency", required=False, editable=True),
                FieldConfig(name="Probability", type="Percentage", required=True, editable=True),
            ],
            "task": [
                FieldConfig(name="Task Type", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Priority", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Status", type="Dropdown", required=True, editable=True),
                FieldConfig(name="Due Date", type="Date", required=True, editable=True),
            ],
        },
        templates=[
            TemplateGroup(name="Activity Templates", count=5, examples=["QBR Template", "Weekly Sync Notes", "Onboarding Call"]),
            TemplateGroup(name="Report Templates", count=3, examples=["Monthly Report", "QBR Deck", "Health Summary"]),
            TemplateGroup(name="Task Templates", count=4, examples=["Onboarding Checklist", "Renewal Prep", "Risk Mitigation"]),
            TemplateGroup(name="Document Templates", count=6, examples=["SOW Template", "NDA Template", "Contract Amendment"]),
        ],
    ).model_dump()

    await db.settings.insert_one(defaults)
    SETTINGS_CACHE = defaults
    SETTINGS_CACHE_TIMESTAMP = now
    return defaults

# Enums
class UserRole(str, Enum):
    CSM = "CSM"
    AM = "AM"
    ADMIN = "ADMIN"
    CS_LEADER = "CS_LEADER"
    CS_OPS = "CS_OPS"
    SALES = "SALES"
    READ_ONLY = "READ_ONLY"

class UserStatus(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"

class PlanType(str, Enum):
    HOURLY = "Hourly"
    LICENSE = "License"
    ENTERPRISE = "Enterprise"
    PROFESSIONAL = "Professional"
    STARTER = "Starter"
    PREMIUM = "Premium"
    CUSTOM = "Custom"

class ProductType(str, Enum):
    POST_CALL = "Post Call"
    RTA = "RTA"
    AI_PHONE_CALL = "AI Phone Call"
    CONVIN_SENSE = "Convin Sense"
    CRM_UPGRADE = "CRM Upgrade"
    STT_TTS_SOLUTION = "STT/TTS Solution"

class HealthStatus(str, Enum):
    HEALTHY = "Healthy"
    AT_RISK = "At Risk"
    CRITICAL = "Critical"

class OnboardingStatus(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"

class RiskSeverity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class RiskStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    MONITORING = "Monitoring"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    MITIGATED = "Mitigated"

class ActivityType(str, Enum):
    WEEKLY_SYNC = "Weekly Sync"
    QBR = "QBR"
    MBR = "MBR"
    IN_PERSON_VISIT = "In-Person Visit"
    PRODUCT_FEEDBACK = "Product Feedback"
    FEATURE_REQUEST = "Feature Request"
    TRAINING_SESSION = "Training Session"
    SUPPORT_ESCALATION = "Support Escalation"
    EMAIL_COMMUNICATION = "Email Communication"
    PHONE_CALL = "Phone Call"
    EXECUTIVE_BRIEFING = "Executive Briefing"
    ONBOARDING_SESSION = "Onboarding Session"
    RENEWAL_DISCUSSION = "Renewal Discussion"
    UPSELL_DISCUSSION = "Upsell/Cross-sell Discussion"
    OTHER = "Other"
    # Legacy / Simple types found in dummy data
    CALL = "Call"
    EMAIL = "Email"
    MEETING = "Meeting"
    TRAINING = "Training"
    SUPPORT = "Support"
    CHECK_IN = "Check-in"
    ONBOARDING = "Onboarding"

class TaskType(str, Enum):
    FOLLOW_UP_CALL = "Follow-up Call"
    FOLLOW_UP_EMAIL = "Follow-up Email"
    SCHEDULE_MEETING = "Schedule Meeting"
    SEND_DOCUMENT = "Send Document"
    REVIEW_ACCOUNT = "Review Account"
    PREPARE_QBR = "Prepare for QBR"
    TRAINING_SESSION = "Training Session"
    TECHNICAL_SETUP = "Technical Setup"
    RENEWAL_PREP = "Renewal Preparation"
    ONBOARDING_ACTIVITY = "Onboarding Activity"
    DOCUMENTATION = "Documentation"
    ESCALATION = "Escalation"
    OTHER = "Other"
    # Legacy / Simple types
    FOLLOW_UP = "Follow-up"
    SUPPORT = "Support"
    TRAINING = "Training"
    QBR_PREPARATION = "QBR Preparation"
    ONBOARDING = "Onboarding"

class TaskStatus(str, Enum):
    NOT_STARTED = "Not Started"
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    BLOCKED = "Blocked"
    WAITING_CUSTOMER = "Waiting on Customer"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    OVERDUE = "Overdue"

class TaskPriority(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

# Pydantic Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    # Back-compat: some older docs only have `role`
    role: Optional[UserRole] = None
    # New: multi-role users (preferred)
    roles: List[UserRole] = []
    status: UserStatus = UserStatus.ACTIVE
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    # Back-compat with old clients
    role: Optional[UserRole] = None
    roles: Optional[List[UserRole]] = None
    status: Optional[UserStatus] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class InviteAccept(BaseModel):
    token: str
    password: str
    name: Optional[str] = None

class InviteCreate(BaseModel):
    name: str
    email: EmailStr
    roles: List[UserRole] = [UserRole.CSM]
    status: UserStatus = UserStatus.INACTIVE
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None
    send_invite: bool = True

class InviteCreateResponse(BaseModel):
    user: User
    invite_token: Optional[str] = None
    message: str = "User created"

class UserUpdateAdmin(BaseModel):
    name: Optional[str] = None
    roles: Optional[List[UserRole]] = None
    status: Optional[UserStatus] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# Settings Models
class OrganizationSettings(BaseModel):
    company_name: str = "Convin.ai"
    domain: str = "convin.ai"
    default_currency: str = "INR"
    date_format: str = "DD/MM/YYYY"

class HealthThresholds(BaseModel):
    healthy_min: int = 80
    at_risk_min: int = 50

class NotificationSettings(BaseModel):
    health_status_changes: bool = True
    task_reminders: bool = True
    risk_alerts: bool = True
    renewal_reminders: bool = True

class DropdownDefinition(BaseModel):
    name: str
    values: List[str] = []

class FieldConfig(BaseModel):
    name: str
    type: str
    required: bool = False
    editable: bool = True

class RoleDefinition(BaseModel):
    role: str
    name: str
    desc: str

class TemplateGroup(BaseModel):
    name: str
    count: int = 0
    examples: List[str] = []

class SettingsDoc(BaseModel):
    id: str = "global"
    organization: OrganizationSettings = OrganizationSettings()
    health_thresholds: HealthThresholds = HealthThresholds()
    notifications: NotificationSettings = NotificationSettings()
    tags: List[str] = []
    dropdowns: List[DropdownDefinition] = []
    field_configs: Dict[str, List[FieldConfig]] = {}
    roles: List[RoleDefinition] = []
    templates: List[TemplateGroup] = []
    # Permission matrix: role -> { modules: {moduleKey: {enabled, scope, actions{...}}}}
    # Stored as a plain dict for flexibility; enforced by backend.
    role_permissions: Dict[str, Any] = {}

class SettingsUpdate(BaseModel):
    organization: Optional[OrganizationSettings] = None
    health_thresholds: Optional[HealthThresholds] = None
    notifications: Optional[NotificationSettings] = None
    tags: Optional[List[str]] = None
    dropdowns: Optional[List[DropdownDefinition]] = None
    field_configs: Optional[Dict[str, List[FieldConfig]]] = None
    roles: Optional[List[RoleDefinition]] = None
    templates: Optional[List[TemplateGroup]] = None
    role_permissions: Optional[Dict[str, Any]] = None

def _default_role_permissions() -> Dict[str, Any]:
    # Single source of truth for the default permission map.
    return {
        # Modules present in this app today:
        # customers, activities, risks, opportunities, tasks, datalabs_reports, documents, dashboard, exports, users, settings
        "ADMIN": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "activities": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "risks": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "opportunities": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "tasks": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "datalabs_reports": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "documents": {"enabled": True, "scope": "all", "actions": {"create": True, "delete": True}},
                "exports": {"enabled": True},
                "users": {"enabled": True},
                "settings": {"enabled": True},
            }
        },
        "CS_OPS": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "activities": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "risks": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "opportunities": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "tasks": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "datalabs_reports": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": True}},
                "documents": {"enabled": True, "scope": "all", "actions": {"create": True, "delete": True}},
                "exports": {"enabled": True},
                "users": {"enabled": True},
                "settings": {"enabled": True},
            }
        },
        "CS_LEADER": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": False}},
                "activities": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": False}},
                "risks": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": False}},
                "opportunities": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": False}},
                "tasks": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": True, "delete": False}},
                "datalabs_reports": {"enabled": True, "scope": "all", "actions": {"create": True, "edit": False, "delete": False}},
                "documents": {"enabled": True, "scope": "all", "actions": {"create": True, "delete": False}},
                "exports": {"enabled": True},
                "users": {"enabled": True},
                "settings": {"enabled": False},
            }
        },
        "CSM": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "own", "actions": {"create": True, "edit": True, "delete": False}},
                "activities": {"enabled": True, "scope": "own", "actions": {"create": True, "edit": True, "delete": False}},
                "risks": {"enabled": True, "scope": "own", "actions": {"create": True, "edit": True, "delete": False}},
                "opportunities": {"enabled": True, "scope": "own", "actions": {"create": True, "edit": True, "delete": False}},
                "tasks": {"enabled": True, "scope": "own", "actions": {"create": True, "edit": True, "delete": False}},
                "datalabs_reports": {"enabled": True, "scope": "own", "actions": {"create": True, "edit": False, "delete": False}},
                "documents": {"enabled": True, "scope": "own", "actions": {"create": True, "delete": True}},
                "exports": {"enabled": False},
                "users": {"enabled": False},
                "settings": {"enabled": False},
            }
        },
        "AM": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "team", "actions": {"create": True, "edit": True, "delete": False}},
                "activities": {"enabled": True, "scope": "team", "actions": {"create": True, "edit": True, "delete": False}},
                "risks": {"enabled": True, "scope": "team", "actions": {"create": True, "edit": True, "delete": False}},
                "opportunities": {"enabled": True, "scope": "team", "actions": {"create": True, "edit": True, "delete": False}},
                "tasks": {"enabled": True, "scope": "team", "actions": {"create": True, "edit": True, "delete": False}},
                "datalabs_reports": {"enabled": True, "scope": "team", "actions": {"create": True, "edit": False, "delete": False}},
                "documents": {"enabled": True, "scope": "team", "actions": {"create": True, "delete": True}},
                "exports": {"enabled": False},
                "users": {"enabled": True},
                "settings": {"enabled": False},
            }
        },
        "SALES": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "all", "actions": {"create": False, "edit": False, "delete": False}, "field_policy": "sales_limited"},
                "opportunities": {"enabled": True, "scope": "all", "actions": {"create": False, "edit": True, "delete": False}},
                "activities": {"enabled": False},
                "risks": {"enabled": False},
                "tasks": {"enabled": False},
                "datalabs_reports": {"enabled": False},
                "documents": {"enabled": False},
                "exports": {"enabled": False},
                "users": {"enabled": False},
                "settings": {"enabled": False},
            }
        },
        "READ_ONLY": {
            "modules": {
                "dashboard": {"enabled": True},
                "customers": {"enabled": True, "scope": "own", "actions": {"create": False, "edit": False, "delete": False}},
                "activities": {"enabled": True, "scope": "own", "actions": {"create": False, "edit": False, "delete": False}},
                "risks": {"enabled": True, "scope": "own", "actions": {"create": False, "edit": False, "delete": False}},
                "opportunities": {"enabled": True, "scope": "own", "actions": {"create": False, "edit": False, "delete": False}},
                "tasks": {"enabled": True, "scope": "own", "actions": {"create": False, "edit": False, "delete": False}},
                "datalabs_reports": {"enabled": True, "scope": "own", "actions": {"create": False, "edit": False, "delete": False}},
                "documents": {"enabled": True, "scope": "own", "actions": {"create": False, "delete": False}},
                "exports": {"enabled": False},
                "users": {"enabled": False},
                "settings": {"enabled": False},
            }
        },
    }



# --- Permissions evaluation (configurable via SettingsDoc.role_permissions) ---
def _scope_rank(scope: Optional[str]) -> int:
    # none < own < team < all
    m = {"none": 0, None: 0, "own": 1, "team": 2, "all": 3}
    return m.get(scope, 0)

def _merge_module_perms(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """
    OR booleans, choose widest scope.
    """
    out: Dict[str, Any] = {**(a or {})}
    if "enabled" in (b or {}):
        out["enabled"] = bool(out.get("enabled")) or bool(b.get("enabled"))

    sa = out.get("scope")
    sb = (b or {}).get("scope")
    out["scope"] = sa if _scope_rank(sa) >= _scope_rank(sb) else sb

    actions = {**(out.get("actions") or {})}
    for k, v in ((b or {}).get("actions") or {}).items():
        actions[k] = bool(actions.get(k)) or bool(v)
    if actions:
        out["actions"] = actions

    # keep extra policy fields (field_policy, etc.)
    for k, v in (b or {}).items():
        if k not in {"enabled", "scope", "actions"}:
            out[k] = v
    return out

async def _get_effective_permissions(current_user: Dict) -> Dict[str, Any]:
    """
    Returns: { modules: { moduleKey: {enabled, scope?, actions? ...} } }
    """
    settings = await _ensure_settings()
    role_perms: Dict[str, Any] = (settings or {}).get("role_permissions") or {}
    roles = _roles(current_user) or ["READ_ONLY"]

    effective: Dict[str, Any] = {"modules": {}}
    for r in roles:
        rp = role_perms.get(r) or {}
        for mod, mp in (rp.get("modules") or {}).items():
            cur = effective["modules"].get(mod) or {}
            effective["modules"][mod] = _merge_module_perms(cur, mp or {})
    return effective

def _has_perm(effective: Dict[str, Any], module_key: str, action: Optional[str] = None) -> bool:
    mod = (effective.get("modules") or {}).get(module_key) or {}
    if not mod.get("enabled"):
        return False
    if not action:
        return True
    return bool((mod.get("actions") or {}).get(action))

async def _check_db_connection():
    """Check if database connection is available."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection not available. Please check MongoDB connection settings."
        )

async def _require_perm(current_user: Dict, module_key: str, action: Optional[str] = None) -> Dict[str, Any]:
    eff = await _get_effective_permissions(current_user)
    if not _has_perm(eff, module_key, action):
        raise HTTPException(status_code=403, detail="Forbidden")
    return eff

# Alias for backward compatibility
_user_permissions = _get_effective_permissions

class Stakeholder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    role_type: Optional[str] = None
    is_primary: bool = False

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    plan_type: Optional[PlanType] = None
    arr: Optional[float] = None
    one_time_setup_cost: Optional[float] = None
    quarterly_consumption_cost: Optional[float] = None
    contract_start_date: Optional[str] = None
    contract_end_date: Optional[str] = None
    renewal_date: Optional[str] = None
    go_live_date: Optional[str] = None
    products_purchased: List[ProductType] = []
    onboarding_status: OnboardingStatus = OnboardingStatus.NOT_STARTED
    account_status: Optional[str] = "Live"  # POC/Pilot, Onboarding, UAT, Live, Hold, Churn
    health_score: float = 50.0
    health_status: HealthStatus = HealthStatus.AT_RISK
    risk_level: Optional[str] = None
    primary_objective: Optional[str] = None
    calls_processed: int = 0
    active_users: int = 0
    total_licensed_users: int = 0
    csm_owner_id: Optional[str] = None
    csm_owner_name: Optional[str] = None
    am_owner_id: Optional[str] = None
    am_owner_name: Optional[str] = None
    tags: List[str] = []
    stakeholders: List[Stakeholder] = []
    last_activity_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    plan_type: Optional[PlanType] = None
    arr: Optional[float] = None
    one_time_setup_cost: Optional[float] = None
    quarterly_consumption_cost: Optional[float] = None
    contract_start_date: Optional[str] = None
    contract_end_date: Optional[str] = None
    renewal_date: Optional[str] = None
    go_live_date: Optional[str] = None
    products_purchased: List[ProductType] = []
    onboarding_status: OnboardingStatus = OnboardingStatus.NOT_STARTED
    primary_objective: Optional[str] = None
    calls_processed: int = 0
    active_users: int = 0
    total_licensed_users: int = 0
    csm_owner_id: Optional[str] = None
    am_owner_id: Optional[str] = None
    tags: List[str] = []
    stakeholders: List[Stakeholder] = []
    health_status: Optional[str] = None
    health_score: Optional[float] = None

class AccountStatusUpdate(BaseModel):
    account_status: str

class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = None
    activity_type: ActivityType
    activity_date: datetime
    title: str
    summary: str
    internal_notes: Optional[str] = None
    sentiment: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[str] = None
    follow_up_status: Optional[str] = None
    csm_id: str
    csm_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityCreate(BaseModel):
    customer_id: str
    activity_type: ActivityType
    activity_date: datetime
    title: str
    summary: str
    internal_notes: Optional[str] = None
    sentiment: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[str] = None

class Risk(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    severity: RiskSeverity
    status: RiskStatus
    title: str
    description: str
    impact_description: Optional[str] = None
    mitigation_plan: Optional[str] = None
    revenue_impact: Optional[float] = None
    churn_probability: Optional[int] = None
    identified_date: str
    target_resolution_date: Optional[str] = None
    resolution_date: Optional[str] = None
    assigned_to_id: str
    assigned_to_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskCreate(BaseModel):
    customer_id: str
    category: str
    subcategory: Optional[str] = None
    severity: RiskSeverity
    title: str
    description: str
    impact_description: Optional[str] = None
    mitigation_plan: Optional[str] = None
    revenue_impact: Optional[float] = None
    churn_probability: Optional[int] = None
    identified_date: str
    target_resolution_date: Optional[str] = None
    assigned_to_id: str

class Opportunity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = None
    opportunity_type: str
    title: str
    description: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    stage: str
    expected_close_date: Optional[str] = None
    owner_id: str
    owner_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OpportunityCreate(BaseModel):
    customer_id: str
    opportunity_type: str
    title: str
    description: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    stage: str = "Identified"
    expected_close_date: Optional[str] = None
    owner_id: str

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = None
    task_type: TaskType
    title: str
    description: Optional[str] = None
    priority: TaskPriority
    status: TaskStatus
    assigned_to_id: str
    assigned_to_name: Optional[str] = None
    due_date: str
    completed_date: Optional[str] = None
    created_by_id: str
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(BaseModel):
    customer_id: str
    task_type: TaskType
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.NOT_STARTED
    assigned_to_id: str
    due_date: str

class DataLabsReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = None
    report_date: str
    report_title: str
    report_link: str
    report_type: str
    description: Optional[str] = None
    sent_to: List[str] = []
    created_by_id: str
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DataLabsReportCreate(BaseModel):
    customer_id: str
    report_date: str
    report_title: str
    report_link: str
    report_type: str
    description: Optional[str] = None
    sent_to: List[str] = []

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str, roles: List[str]) -> str:
    roles = [(r.value if isinstance(r, Enum) else str(r)) for r in (roles or [])]
    primary_role = roles[0] if roles else "READ_ONLY"
    payload = {
        'user_id': user_id,
        'email': email,
        # Back-compat: keep `role` for older frontend code paths
        'role': primary_role,
        'roles': roles,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- RBAC helpers (backend enforcement + data scoping) ---
ROLE_ADMINISH: set[str] = {"ADMIN", "CS_OPS", "CS_LEADER"}
ROLE_SETTINGS_ADMIN: set[str] = {"ADMIN", "CS_OPS"}
ROLE_EXPORTS: set[str] = {"ADMIN", "CS_OPS", "CS_LEADER"}
ROLE_OPPORTUNITIES: set[str] = {"AM", "ADMIN", "CS_OPS", "CS_LEADER", "SALES"}

def _enum_value(x: Any) -> str:
    return x.value if isinstance(x, Enum) else str(x)

def _roles(current_user: Dict) -> List[str]:
    rs = current_user.get("roles")
    if isinstance(rs, list) and rs:
        return [_enum_value(x) for x in rs if x]
    r = current_user.get("role")
    return [_enum_value(r)] if r else []

def _user_id(current_user: Dict) -> str:
    return str(current_user.get("user_id") or "")

def _require_roles(current_user: Dict, allowed: set[str]) -> None:
    if not set(_roles(current_user)).intersection(allowed):
        raise HTTPException(status_code=403, detail="Forbidden")

async def _customer_scope_query(current_user: Dict) -> Dict[str, Any]:
    """
    Data scoping:
    - ADMIN/CS_OPS/CS_LEADER => all customers
    - CSM => customers where csm_owner_id == current_user
    - AM => customers where am_owner_id == current_user
    """
    roles = set(_roles(current_user))
    uid = _user_id(current_user)
    # Leadership/admin/ops => all
    if roles.intersection(ROLE_ADMINISH):
        return {}

    # Use configured scope (if present)
    try:
        eff = await _get_effective_permissions(current_user)
        customer_mod = (eff.get("modules") or {}).get("customers") or {}
        configured_scope = customer_mod.get("scope")
    except Exception:
        configured_scope = None

    # Sales can see all customers (but field-level restrictions apply in handlers)
    if "SALES" in roles:
        return {} if configured_scope in (None, "all") else {"id": "__none__"}

    # Read-only falls back to same scope rules as CSM/AM if they also have those roles.
    if configured_scope == "own" or ("CSM" in roles and "AM" not in roles):
        return {"csm_owner_id": uid}

    if configured_scope == "team" or ("AM" in roles):
        # AM can see:
        # - customers they own as AM
        # - customers owned by CSMs who report to them (manager_id == AM user id)
        managed_csms = await db.users.find(
            {
                "manager_id": uid,
                "$or": [{"role": "CSM"}, {"roles": {"$in": ["CSM"]}}],
            },
            {"_id": 0, "id": 1},
        ).to_list(5000)
        managed_csm_ids = [u.get("id") for u in managed_csms if u.get("id")]
        return {"$or": [{"am_owner_id": uid}, {"csm_owner_id": {"$in": managed_csm_ids}}]}

    if configured_scope == "all":
        return {}

    # Default: no access (empty scope => nothing)
    return {"id": "__none__"}

async def _get_customer_or_404(customer_id: str, current_user: Dict) -> Dict[str, Any]:
    query: Dict[str, Any] = {"id": customer_id}
    query.update(await _customer_scope_query(current_user))
    customer = await db.customers.find_one(query, {"_id": 0})
    if not customer:
        # 404 avoids leaking existence outside the caller's scope
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

async def _accessible_customer_ids(current_user: Dict) -> Optional[List[str]]:
    scope = await _customer_scope_query(current_user)
    if not scope:
        return None
    docs = await db.customers.find(scope, {"_id": 0, "id": 1}).to_list(5000)
    return [d["id"] for d in docs if d.get("id")]

def calculate_health_score(customer: Dict) -> float:
    score = 50.0
    
    # Usage score (40% weight)
    if customer.get('active_users', 0) > 0 and customer.get('total_licensed_users', 0) > 0:
        usage_rate = customer['active_users'] / customer['total_licensed_users']
        if usage_rate >= 0.7:
            score += 15
        elif usage_rate >= 0.5:
            score += 10
        elif usage_rate >= 0.3:
            score += 5
    
    if customer.get('calls_processed', 0) > 1000:
        score += 10
    elif customer.get('calls_processed', 0) > 500:
        score += 5
    
    # Engagement score (25% weight)
    last_activity = customer.get('last_activity_date')
    if last_activity:
        try:
            days_since = (datetime.now(timezone.utc) - datetime.fromisoformat(last_activity)).days
            if days_since < 7:
                score += 15
            elif days_since < 14:
                score += 10
            elif days_since < 30:
                score += 5
        except:
            pass
    
    # Onboarding status (10% weight)
    if customer.get('onboarding_status') == 'Completed':
        score += 10
    elif customer.get('onboarding_status') == 'In Progress':
        score += 5
    
    return min(100, max(0, score))

def determine_health_status(score: float) -> str:
    if score >= 80:
        return "Healthy"
    elif score >= 50:
        return "At Risk"
    else:
        return "Critical"

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Normalize roles (new) + role (legacy)
    roles: List[str] = []
    if user_data.roles:
        roles = [_enum_value(r) for r in user_data.roles]
    elif user_data.role:
        roles = [_enum_value(user_data.role)]
    else:
        roles = [UserRole.CSM.value]
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=UserRole(roles[0]) if roles else UserRole.READ_ONLY,
        roles=[UserRole(r) for r in roles],
        status=user_data.status or UserStatus.ACTIVE,
        phone=user_data.phone,
        avatar_url=user_data.avatar_url,
        job_title=user_data.job_title,
        department=user_data.department,
        manager_id=user_data.manager_id,
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token(user.id, user.email, [_enum_value(r) for r in user.roles] or [_enum_value(user.role or UserRole.READ_ONLY)])
    
    return Token(access_token=token, user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    try:
        user_dict = await db.users.find_one({"email": credentials.email})
        
        if not user_dict or not verify_password(credentials.password, user_dict['password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Block login when not Active
        status_val = (user_dict.get("status") or UserStatus.ACTIVE.value)
        if status_val != UserStatus.ACTIVE.value:
            raise HTTPException(status_code=403, detail=f"User is {status_val}")
        
        if isinstance(user_dict.get('created_at'), str):
            user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
        if isinstance(user_dict.get('last_login_at'), str):
            try:
                user_dict['last_login_at'] = datetime.fromisoformat(user_dict['last_login_at'])
            except Exception:
                user_dict['last_login_at'] = None

        # Track login timestamp (live audit)
        now = datetime.now(timezone.utc)
        await db.users.update_one({"id": user_dict["id"]}, {"$set": {"last_login_at": now.isoformat()}})
        user_dict["last_login_at"] = now
    
        user = User(**{k: v for k, v in user_dict.items() if k != 'password'})
        token = create_access_token(user.id, user.email, [_enum_value(r) for r in user.roles] or [_enum_value(user.role or UserRole.READ_ONLY)])
    
        return Token(access_token=token, user=user)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@api_router.post("/auth/accept-invite", response_model=Token)
async def accept_invite(payload: InviteAccept):
    token = (payload.token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user_dict = await db.users.find_one({"invite_token": token}, {"_id": 0})
    if not user_dict:
        raise HTTPException(status_code=400, detail="Invalid invite token")

    exp = user_dict.get("invite_expires_at")
    if isinstance(exp, str):
        try:
            exp = datetime.fromisoformat(exp)
        except Exception:
            exp = None
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite expired")

    updates: Dict[str, Any] = {
        "password": hash_password(payload.password),
        "status": UserStatus.ACTIVE.value,
        "invite_token": None,
        "invite_expires_at": None,
    }
    if payload.name:
        updates["name"] = payload.name

    await db.users.update_one({"id": user_dict["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user_dict["id"]}, {"_id": 0, "password": 0})
    if not updated:
        raise HTTPException(status_code=500, detail="Invite accept failed")

    # Fix timestamps types for response model
    if isinstance(updated.get("created_at"), str):
        try:
            updated["created_at"] = datetime.fromisoformat(updated["created_at"])
        except Exception:
            pass

    user = User(**updated)
    token_jwt = create_access_token(user.id, user.email, [_enum_value(r) for r in user.roles] or [_enum_value(user.role or UserRole.READ_ONLY)])
    return Token(access_token=token_jwt, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: Dict = Depends(get_current_user)):
    user_dict = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password": 0})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_dict.get('created_at'), str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    if isinstance(user_dict.get('last_login_at'), str):
        try:
            user_dict['last_login_at'] = datetime.fromisoformat(user_dict['last_login_at'])
        except Exception:
            user_dict['last_login_at'] = None
    
    return User(**user_dict)

@api_router.get("/auth/permissions")
async def get_my_permissions(current_user: Dict = Depends(get_current_user)):
    """
    Returns the effective permission matrix for the current user,
    without exposing full Settings to non-admin users.
    """
    eff = await _get_effective_permissions(current_user)
    return eff

# User Routes
@api_router.get("/users", response_model=List[User])
async def get_users(
    current_user: Dict = Depends(get_current_user),
    role: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    q: Optional[str] = None,
):
    await _check_db_connection()
    # View rules:
    # - ADMIN/CS_OPS: all users
    # - CS_LEADER: all users (read-only)
    # - AM: only team members (users where manager_id == AM) + self
    # - others: forbidden
    allowed = {"ADMIN", "CS_OPS", "CS_LEADER", "AM"}
    _require_roles(current_user, allowed)

    query: Dict[str, Any] = {}
    roles = set(_roles(current_user))
    uid = _user_id(current_user)
    if roles == {"AM"} or ("AM" in roles and not roles.intersection(ROLE_ADMINISH)):
        query = {"$or": [{"manager_id": uid}, {"id": uid}]}

    # Optional filters (used by User Management UI)
    if role:
        role_clause = {"$or": [{"role": role}, {"roles": {"$in": [role]}}]}
        query = {"$and": [query, role_clause]} if query else role_clause
    if status:
        query = {"$and": [query, {"status": status}]} if query else {"status": status}
    if department:
        query = {"$and": [query, {"department": department}]} if query else {"department": department}
    if q:
        rx = {"$regex": q, "$options": "i"}
        query = {"$and": [query, {"$or": [{"name": rx}, {"email": rx}]}]} if query else {"$or": [{"name": rx}, {"email": rx}]}

    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(2000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('last_login_at'), str):
            try:
                user['last_login_at'] = datetime.fromisoformat(user['last_login_at'])
            except Exception:
                user['last_login_at'] = None
    return users

@api_router.post("/users", response_model=User)
async def create_user(payload: InviteCreate, current_user: Dict = Depends(get_current_user)):
    # Only ADMIN/CS_OPS can create users
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)

    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    invite_token = secrets.token_urlsafe(24) if payload.send_invite else None
    invite_expires = datetime.now(timezone.utc) + timedelta(days=7) if invite_token else None
    creator = await db.users.find_one({"id": _user_id(current_user)}, {"_id": 0})

    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.roles[0] if payload.roles else UserRole.READ_ONLY,
        roles=payload.roles or [UserRole.READ_ONLY],
        status=payload.status,
        phone=payload.phone,
        avatar_url=payload.avatar_url,
        job_title=payload.job_title,
        department=payload.department,
        manager_id=payload.manager_id,
        created_by_id=_user_id(current_user),
        created_by_name=(creator or {}).get("name"),
    )
    doc = user.model_dump()
    doc["password"] = hash_password(secrets.token_urlsafe(18))  # unusable random; invite must set real password
    doc["created_at"] = doc["created_at"].isoformat()
    doc["last_login_at"] = None
    doc["invite_token"] = invite_token
    doc["invite_expires_at"] = invite_expires.isoformat() if invite_expires else None

    await db.users.insert_one(doc)

    # Response model (no password)
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    doc.pop("password", None)
    doc.pop("_id", None)
    return User(**doc)

@api_router.post("/users/create-with-invite", response_model=InviteCreateResponse)
async def create_user_with_invite(payload: InviteCreate, current_user: Dict = Depends(get_current_user)):
    """
    Convenience endpoint for the UI:
    - creates the user
    - always returns invite_token (if send_invite=true)
    """
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)

    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    invite_token = secrets.token_urlsafe(24) if payload.send_invite else None
    invite_expires = datetime.now(timezone.utc) + timedelta(days=7) if invite_token else None
    creator = await db.users.find_one({"id": _user_id(current_user)}, {"_id": 0})

    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.roles[0] if payload.roles else UserRole.READ_ONLY,
        roles=payload.roles or [UserRole.READ_ONLY],
        status=payload.status,
        phone=payload.phone,
        avatar_url=payload.avatar_url,
        job_title=payload.job_title,
        department=payload.department,
        manager_id=payload.manager_id,
        created_by_id=_user_id(current_user),
        created_by_name=(creator or {}).get("name"),
    )
    doc = user.model_dump()
    doc["password"] = hash_password(secrets.token_urlsafe(18))  # unusable random; invite must set real password
    doc["created_at"] = doc["created_at"].isoformat()
    doc["last_login_at"] = None
    doc["invite_token"] = invite_token
    doc["invite_expires_at"] = invite_expires.isoformat() if invite_expires else None

    await db.users.insert_one(doc)

    # Response
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    doc.pop("password", None)
    doc.pop("_id", None)
    return InviteCreateResponse(user=User(**doc), invite_token=invite_token)

@api_router.post("/users/{user_id}/resend-invite")
async def resend_invite(user_id: str, current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    invite_token = secrets.token_urlsafe(24)
    invite_expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"invite_token": invite_token, "invite_expires_at": invite_expires.isoformat(), "status": UserStatus.INACTIVE.value}},
    )
    return {"message": "Invite generated", "invite_token": invite_token}

class PasswordReset(BaseModel):
    password: str

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdateAdmin, current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    update = {k: v for k, v in user_update.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    # keep legacy role in sync for older UI
    if "roles" in update and update["roles"]:
        update["role"] = update["roles"][0]
    if "status" in update and isinstance(update["status"], Enum):
        update["status"] = update["status"].value

    await db.users.update_one({"id": user_id}, {"$set": update})
    user_dict = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")

    if isinstance(user_dict.get("created_at"), str):
        user_dict["created_at"] = datetime.fromisoformat(user_dict["created_at"])
    if isinstance(user_dict.get("last_login_at"), str):
        try:
            user_dict["last_login_at"] = datetime.fromisoformat(user_dict["last_login_at"])
        except Exception:
            user_dict["last_login_at"] = None
    return User(**user_dict)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    # prevent deleting yourself
    if user_id == current_user.get("user_id"):
        raise HTTPException(status_code=400, detail="Cannot delete your own user")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, payload: PasswordReset, current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    result = await db.users.update_one({"id": user_id}, {"$set": {"password": hash_password(payload.password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password reset successfully"}

# Settings Routes
@api_router.get("/settings", response_model=SettingsDoc)
async def get_settings(current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    settings = await _ensure_settings()
    return SettingsDoc(**settings)

@api_router.put("/settings", response_model=SettingsDoc)
async def update_settings(payload: SettingsUpdate, current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    existing = await _ensure_settings()
    update_dict = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    merged = {**existing, **update_dict}
    await db.settings.update_one({"id": "global"}, {"$set": merged}, upsert=True)
    stored = await db.settings.find_one({"id": "global"}, {"_id": 0})
    return SettingsDoc(**stored)

@api_router.post("/settings/tags")
async def add_tag(tag: Dict[str, str], current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    value = (tag.get("tag") or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="tag is required")
    await _ensure_settings()
    await db.settings.update_one({"id": "global"}, {"$addToSet": {"tags": value}})
    return {"message": "Tag added", "tag": value}

@api_router.delete("/settings/tags/{tag_value}")
async def remove_tag(tag_value: str, current_user: Dict = Depends(get_current_user)):
    _require_roles(current_user, ROLE_SETTINGS_ADMIN)
    await _ensure_settings()
    await db.settings.update_one({"id": "global"}, {"$pull": {"tags": tag_value}})
    return {"message": "Tag removed", "tag": tag_value}

# Export / Dump Routes
def _csv_value(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (list, dict)):
        return json.dumps(v, ensure_ascii=False)
    return str(v)

async def _export_collection(collection_name: str, query: Dict[str, Any], exclude_fields: Optional[Dict[str, int]] = None) -> List[Dict[str, Any]]:
    projection = {"_id": 0}
    if exclude_fields:
        projection.update(exclude_fields)
    return await db[collection_name].find(query, projection).to_list(50000)

@api_router.get("/exports/{entity}")
async def export_entity(
    entity: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    customer_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user),
):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("exports", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Exports module not accessible")
    
    entity_map = {
        "customers": ("customers", {}),
        "users": ("users", {"password": 0}),
        "activities": ("activities", {}),
        "risks": ("risks", {}),
        "opportunities": ("opportunities", {}),
        "tasks": ("tasks", {}),
        "datalabs-reports": ("datalabs_reports", {}),
        "documents": ("documents", {}),
    }
    if entity not in entity_map:
        raise HTTPException(status_code=404, detail="Unknown export entity")

    collection_name, exclude = entity_map[entity]
    query: Dict[str, Any] = {}
    if customer_id and entity in ["activities", "risks", "opportunities", "documents", "tasks"]:
        if entity == "tasks":
            query["customer_id"] = customer_id
        else:
            query["customer_id"] = customer_id

    rows = await _export_collection(collection_name, query, exclude_fields=exclude)

    filename_base = entity.replace("/", "-")
    if customer_id:
        filename_base += f"-{customer_id}"

    if format == "json":
        return JSONResponse(
            content=rows,
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.json"'},
        )

    # CSV
    output = io.StringIO()
    fieldnames: List[str] = []
    for r in rows:
        for k in r.keys():
            if k not in fieldnames:
                fieldnames.append(k)

    writer = csv.DictWriter(output, fieldnames=fieldnames or ["id"])
    writer.writeheader()
    for r in rows:
        writer.writerow({k: _csv_value(r.get(k)) for k in (fieldnames or ["id"])})

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'},
    )

@api_router.get("/exports/dump")
async def export_dump(current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("exports", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Exports module not accessible")
    
    # Full JSON dump across collections + computed stats
    users = await _export_collection("users", {}, exclude_fields={"password": 0})
    customers = await _export_collection("customers", {})
    activities = await _export_collection("activities", {})
    risks = await _export_collection("risks", {})
    opportunities = await _export_collection("opportunities", {})
    tasks = await _export_collection("tasks", {})
    datalabs_reports = await _export_collection("datalabs_reports", {})
    documents = await _export_collection("documents", {})

    # reuse existing stats endpoint logic inline by counting
    total_customers = len(customers)
    total_arr = sum((c.get("arr") or 0) for c in customers)
    healthy_count = sum(1 for c in customers if c.get("health_status") == "Healthy")
    at_risk_count = sum(1 for c in customers if c.get("health_status") == "At Risk")
    critical_count = sum(1 for c in customers if c.get("health_status") == "Critical")
    open_risks = sum(1 for r in risks if r.get("status") == "Open")
    critical_risks = sum(1 for r in risks if r.get("severity") == "Critical")
    active_opportunities = sum(1 for o in opportunities if o.get("stage") != "Closed Won")
    pipeline_value = sum((o.get("value") or 0) for o in opportunities if o.get("stage") != "Closed Won")

    dump = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "total_customers": total_customers,
            "total_arr": total_arr,
            "healthy_customers": healthy_count,
            "at_risk_customers": at_risk_count,
            "critical_customers": critical_count,
            "open_risks": open_risks,
            "critical_risks": critical_risks,
            "active_opportunities": active_opportunities,
            "pipeline_value": pipeline_value,
        },
        "users": users,
        "customers": customers,
        "activities": activities,
        "risks": risks,
        "opportunities": opportunities,
        "tasks": tasks,
        "datalabs_reports": datalabs_reports,
        "documents": documents,
    }

    return JSONResponse(
        content=dump,
        headers={"Content-Disposition": 'attachment; filename="elivate-dump.json"'},
    )

# Customer Routes
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: Dict = Depends(get_current_user)):
    await _require_perm(current_user, "customers", "create")
    # Auto-map AM owner from the CSM's mapped AM (users.manager_id) if not explicitly set
    effective = customer_data.model_dump()
    # If scope is own for this role, force CSM ownership to self
    try:
        eff = await _get_effective_permissions(current_user)
        cust_scope = ((eff.get("modules") or {}).get("customers") or {}).get("scope")
        if cust_scope == "own":
            effective["csm_owner_id"] = _user_id(current_user)
    except Exception:
        pass
    if effective.get("csm_owner_id") and not effective.get("am_owner_id"):
        csm_user = await db.users.find_one({"id": effective["csm_owner_id"]}, {"_id": 0, "manager_id": 1})
        if csm_user and csm_user.get("manager_id"):
            effective["am_owner_id"] = csm_user["manager_id"]

    # Get CSM details if provided
    csm_name = None
    if effective.get("csm_owner_id"):
        csm = await db.users.find_one({"id": effective["csm_owner_id"]}, {"_id": 0})
        if csm:
            csm_name = csm['name']
    
    am_name = None
    if effective.get("am_owner_id"):
        am = await db.users.find_one({"id": effective["am_owner_id"]}, {"_id": 0})
        if am:
            am_name = am['name']
    
    customer = Customer(
        **effective,
        csm_owner_name=csm_name,
        am_owner_name=am_name
    )
    
    # Calculate health score
    customer_dict = customer.model_dump()
    customer_dict['health_score'] = calculate_health_score(customer_dict)
    customer_dict['health_status'] = determine_health_status(customer_dict['health_score'])
    customer_dict['created_at'] = customer_dict['created_at'].isoformat()
    customer_dict['updated_at'] = customer_dict['updated_at'].isoformat()
    
    await db.customers.insert_one(customer_dict)
    
    if isinstance(customer_dict['created_at'], str):
        customer_dict['created_at'] = datetime.fromisoformat(customer_dict['created_at'])
    if isinstance(customer_dict['updated_at'], str):
        customer_dict['updated_at'] = datetime.fromisoformat(customer_dict['updated_at'])
    
    return Customer(**customer_dict)

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: Dict = Depends(get_current_user)):
    try:
        await _check_db_connection()
        eff = await _require_perm(current_user, "customers")
        scope = await _customer_scope_query(current_user)

        # Sales field restriction
        projection = {"_id": 0}
        customer_mod = (eff.get("modules") or {}).get("customers") or {}
        if customer_mod.get("field_policy") == "sales_limited":
            projection = {
                "_id": 0,
                "id": 1,
                "company_name": 1,
                "arr": 1,
                "renewal_date": 1,
                "health_score": 1,
                "health_status": 1,
                "account_status": 1,
                "csm_owner_name": 1,
                "am_owner_name": 1,
                "region": 1,
                "industry": 1,
            }

        customers = await db.customers.find(scope, projection).to_list(1000)
        for customer in customers:
            if isinstance(customer.get('created_at'), str):
                customer['created_at'] = datetime.fromisoformat(customer['created_at'])
            if isinstance(customer.get('updated_at'), str):
                customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
        return customers
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customers: {e}")
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: Dict = Depends(get_current_user)):
    eff = await _require_perm(current_user, "customers")
    customer = await _get_customer_or_404(customer_id, current_user)

    # Sales field restriction
    customer_mod = (eff.get("modules") or {}).get("customers") or {}
    if customer_mod.get("field_policy") == "sales_limited":
        allowed = {
            "id",
            "company_name",
            "arr",
            "renewal_date",
            "health_score",
            "health_status",
            "account_status",
            "csm_owner_name",
            "am_owner_name",
            "region",
            "industry",
        }
        customer = {k: v for k, v in customer.items() if k in allowed}
    
    if isinstance(customer.get('created_at'), str):
        customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    if isinstance(customer.get('updated_at'), str):
        customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
    
    return Customer(**customer)

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate, current_user: Dict = Depends(get_current_user)):
    await _require_perm(current_user, "customers", "edit")
    existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    effective = customer_data.model_dump()
    # If scope is own, do not allow reassigning away from self
    try:
        eff = await _get_effective_permissions(current_user)
        cust_scope = ((eff.get("modules") or {}).get("customers") or {}).get("scope")
        if cust_scope == "own":
            effective["csm_owner_id"] = _user_id(current_user)
    except Exception:
        pass
    # Auto-map AM owner from the CSM's mapped AM (users.manager_id) if not explicitly set
    if effective.get("csm_owner_id") and not effective.get("am_owner_id"):
        csm_user = await db.users.find_one({"id": effective["csm_owner_id"]}, {"_id": 0, "manager_id": 1})
        if csm_user and csm_user.get("manager_id"):
            effective["am_owner_id"] = csm_user["manager_id"]
    
    # Get CSM/AM details
    csm_name = None
    if effective.get("csm_owner_id"):
        csm = await db.users.find_one({"id": effective["csm_owner_id"]}, {"_id": 0})
        if csm:
            csm_name = csm['name']
    
    am_name = None
    if effective.get("am_owner_id"):
        am = await db.users.find_one({"id": effective["am_owner_id"]}, {"_id": 0})
        if am:
            am_name = am['name']
    
    update_dict = effective
    update_dict['csm_owner_name'] = csm_name
    update_dict['am_owner_name'] = am_name
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Maintain health info if provided or already exists, otherwise compute
    if update_dict.get('health_score') is None:
        update_dict['health_score'] = existing.get('health_score')
    if update_dict.get('health_status') is None:
        update_dict['health_status'] = existing.get('health_status')
    
    # Still if both are None, compute it
    if update_dict.get('health_score') is None:
        update_dict['health_score'] = calculate_health_score({**existing, **update_dict})
    if update_dict.get('health_status') is None:
        update_dict['health_status'] = determine_health_status(update_dict['health_score'])
    
    await db.customers.update_one({"id": customer_id}, {"$set": update_dict})
    
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Customer(**updated)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: Dict = Depends(get_current_user)):
    await _require_perm(current_user, "customers", "delete")
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

# Health Status Update with optional risk creation
class HealthStatusUpdate(BaseModel):
    health_status: str

@api_router.put("/customers/{customer_id}/health")
async def update_customer_health(customer_id: str, health_update: HealthStatusUpdate, current_user: Dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Map health status to score range
    health_score_map = {
        "Healthy": 85,
        "At Risk": 65,
        "Critical": 35
    }
    
    new_health_score = health_score_map.get(health_update.health_status, existing.get('health_score', 50))
    
    update_dict = {
        'health_status': health_update.health_status,
        'health_score': new_health_score,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.update_one({"id": customer_id}, {"$set": update_dict})
    
    return {"message": "Health status updated", "health_status": health_update.health_status, "health_score": new_health_score}

@api_router.put("/customers/{customer_id}/account-status", response_model=Customer)
async def update_customer_account_status(customer_id: str, payload: AccountStatusUpdate, current_user: Dict = Depends(get_current_user)):
    allowed = {"POC/Pilot", "Onboarding", "UAT", "Live", "Hold", "Churn"}
    value = (payload.account_status or "").strip()
    if value not in allowed:
        raise HTTPException(status_code=400, detail="Invalid account_status")

    existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"account_status": value, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if isinstance(updated.get("updated_at"), str):
        updated["updated_at"] = datetime.fromisoformat(updated["updated_at"])
    return Customer(**updated)

# Bulk Upload Response Model
class BulkUploadResult(BaseModel):
    success_count: int
    error_count: int
    total_rows: int
    errors: List[Dict[str, Any]] = []

@api_router.post("/customers/bulk-upload", response_model=BulkUploadResult)
async def bulk_upload_customers(file: UploadFile = File(...), current_user: Dict = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    success_count = 0
    error_count = 0
    errors = []
    total_rows = 0
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
        total_rows += 1
        try:
            # Validate required field
            if not row.get('company_name'):
                errors.append({"row": row_num, "error": "Missing company_name"})
                error_count += 1
                continue
            
            # Check for existing customer
            existing = await db.customers.find_one({"company_name": row['company_name']})
            if existing:
                errors.append({"row": row_num, "error": f"Customer '{row['company_name']}' already exists"})
                error_count += 1
                continue
            
            # Get CSM owner ID from email if provided
            csm_owner_id = None
            csm_owner_name = None
            if row.get('csm_email'):
                csm = await db.users.find_one({"email": row['csm_email']}, {"_id": 0})
                if csm:
                    csm_owner_id = csm['id']
                    csm_owner_name = csm['name']
            
            # Auto-map AM owner from mapped CSM->AM relationship if available
            am_owner_id = None
            am_owner_name = None
            if csm_owner_id:
                csm_user = await db.users.find_one({"id": csm_owner_id}, {"_id": 0, "manager_id": 1})
                if csm_user and csm_user.get("manager_id"):
                    am_owner_id = csm_user["manager_id"]
                    am_user = await db.users.find_one({"id": am_owner_id}, {"_id": 0, "name": 1})
                    if am_user and am_user.get("name"):
                        am_owner_name = am_user["name"]
            
            # Create customer
            customer_dict = {
                "id": str(uuid.uuid4()),
                "company_name": row['company_name'],
                "website": row.get('website', ''),
                "industry": row.get('industry', ''),
                "region": row.get('region', ''),
                "plan_type": row.get('plan_type', 'License'),
                "arr": float(row['arr']) if row.get('arr') else 0,
                "renewal_date": row.get('renewal_date', ''),
                "onboarding_status": "Not Started",
                "health_score": 75,
                "health_status": "Healthy",
                "csm_owner_id": csm_owner_id,
                "csm_owner_name": csm_owner_name,
                "am_owner_id": am_owner_id,
                "am_owner_name": am_owner_name,
                "products_purchased": [],
                "active_users": 0,
                "total_licensed_users": 0,
                "tags": [],
                "stakeholders": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.customers.insert_one(customer_dict)
            success_count += 1
            
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})
            error_count += 1
    
    return BulkUploadResult(
        success_count=success_count,
        error_count=error_count,
        total_rows=total_rows,
        errors=errors
    )

# Activity Routes
@api_router.post("/activities", response_model=Activity)
async def create_activity(activity_data: ActivityCreate, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("activities", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Activities module not accessible")
    if not perms.get("modules", {}).get("activities", {}).get("actions", {}).get("create"):
        raise HTTPException(status_code=403, detail="No permission to create activities")
    
    # Get customer name
    customer = await db.customers.find_one({"id": activity_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get CSM name
    csm = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    
    activity = Activity(
        **activity_data.model_dump(),
        customer_name=customer.get('company_name'),
        csm_id=current_user['user_id'],
        csm_name=csm.get('name') if csm else None
    )
    
    activity_dict = activity.model_dump()
    activity_dict['activity_date'] = activity_dict['activity_date'].isoformat()
    activity_dict['created_at'] = activity_dict['created_at'].isoformat()
    
    await db.activities.insert_one(activity_dict)
    
    # Update customer last activity date
    await db.customers.update_one(
        {"id": activity_data.customer_id},
        {"$set": {"last_activity_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    if isinstance(activity_dict['activity_date'], str):
        activity_dict['activity_date'] = datetime.fromisoformat(activity_dict['activity_date'])
    if isinstance(activity_dict['created_at'], str):
        activity_dict['created_at'] = datetime.fromisoformat(activity_dict['created_at'])
    
    return Activity(**activity_dict)

@api_router.get("/activities", response_model=List[Activity])
async def get_activities(customer_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    try:
        await _check_db_connection()
        # Permission check
        perms = await _user_permissions(current_user)
        if not perms.get("modules", {}).get("activities", {}).get("enabled"):
            raise HTTPException(status_code=403, detail="Activities module not accessible")
        
        query = {}
        if customer_id:
            query['customer_id'] = customer_id
    
        # Apply data scoping
        scope = perms.get("modules", {}).get("activities", {}).get("scope", "all")
        if scope == "own":
            # Own activities: created by the user
            query["csm_id"] = current_user['user_id']
        elif scope == "team":
            # Team: get customers managed by CSMs reporting to this AM
            team_csm_ids = await _get_team_csm_ids(current_user['user_id'])
            team_customer_ids = await _get_customer_ids_for_csms(team_csm_ids + [current_user['user_id']])
            query["customer_id"] = {"$in": team_customer_ids}
        
        activities = await db.activities.find(query, {"_id": 0}).sort("activity_date", -1).to_list(1000)
        for activity in activities:
            if isinstance(activity['activity_date'], str):
                activity['activity_date'] = datetime.fromisoformat(activity['activity_date'])
            if isinstance(activity['created_at'], str):
                activity['created_at'] = datetime.fromisoformat(activity['created_at'])
        return activities
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching activities: {e}")
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

@api_router.put("/activities/{activity_id}")
async def update_activity(activity_id: str, activity_data: dict, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("activities", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Activities module not accessible")
    if not perms.get("modules", {}).get("activities", {}).get("actions", {}).get("edit"):
        raise HTTPException(status_code=403, detail="No permission to edit activities")
    
    existing = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_dict = {k: v for k, v in activity_data.items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.activities.update_one({"id": activity_id}, {"$set": update_dict})
    return {"message": "Activity updated successfully"}

# Risk Routes
@api_router.post("/risks", response_model=Risk)
async def create_risk(risk_data: RiskCreate, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("risks", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Risks module not accessible")
    if not perms.get("modules", {}).get("risks", {}).get("actions", {}).get("create"):
        raise HTTPException(status_code=403, detail="No permission to create risks")
    
    # Get customer name
    customer = await db.customers.find_one({"id": risk_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get assigned user name
    assigned_user = await db.users.find_one({"id": risk_data.assigned_to_id}, {"_id": 0})
    
    risk = Risk(
        **risk_data.model_dump(),
        customer_name=customer.get('company_name'),
        assigned_to_name=assigned_user.get('name') if assigned_user else None,
        status=RiskStatus.OPEN
    )
    
    risk_dict = risk.model_dump()
    risk_dict['created_at'] = risk_dict['created_at'].isoformat()
    risk_dict['updated_at'] = risk_dict['updated_at'].isoformat()
    
    await db.risks.insert_one(risk_dict)
    
    if isinstance(risk_dict['created_at'], str):
        risk_dict['created_at'] = datetime.fromisoformat(risk_dict['created_at'])
    if isinstance(risk_dict['updated_at'], str):
        risk_dict['updated_at'] = datetime.fromisoformat(risk_dict['updated_at'])
    
    return Risk(**risk_dict)

@api_router.get("/risks", response_model=List[Risk])
async def get_risks(customer_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    try:
        await _check_db_connection()
        # Permission check
        perms = await _user_permissions(current_user)
        if not perms.get("modules", {}).get("risks", {}).get("enabled"):
            raise HTTPException(status_code=403, detail="Risks module not accessible")
        
        query = {}
        if customer_id:
            query['customer_id'] = customer_id
        
        # Apply data scoping
        scope = perms.get("modules", {}).get("risks", {}).get("scope", "all")
        if scope == "own":
            # Own risks: assigned to the user
            query["assigned_to_id"] = current_user['user_id']
        elif scope == "team":
            # Team: get customers managed by CSMs reporting to this AM
            team_csm_ids = await _get_team_csm_ids(current_user['user_id'])
            team_customer_ids = await _get_customer_ids_for_csms(team_csm_ids + [current_user['user_id']])
            query["customer_id"] = {"$in": team_customer_ids}
        
        risks = await db.risks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        for risk in risks:
            if isinstance(risk['created_at'], str):
                risk['created_at'] = datetime.fromisoformat(risk['created_at'])
            if isinstance(risk['updated_at'], str):
                risk['updated_at'] = datetime.fromisoformat(risk['updated_at'])
        return risks
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching risks: {e}")
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

@api_router.put("/risks/{risk_id}", response_model=Risk)
async def update_risk(risk_id: str, risk_data: RiskCreate, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("risks", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Risks module not accessible")
    if not perms.get("modules", {}).get("risks", {}).get("actions", {}).get("edit"):
        raise HTTPException(status_code=403, detail="No permission to edit risks")
    
    existing = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    update_dict = risk_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.risks.update_one({"id": risk_id}, {"$set": update_dict})
    
    updated = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Risk(**updated)

# Opportunity Routes
@api_router.post("/opportunities", response_model=Opportunity)
async def create_opportunity(opp_data: OpportunityCreate, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("opportunities", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Opportunities module not accessible")
    if not perms.get("modules", {}).get("opportunities", {}).get("actions", {}).get("create"):
        raise HTTPException(status_code=403, detail="No permission to create opportunities")
    
    # Get customer name
    customer = await db.customers.find_one({"id": opp_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get owner name
    owner = await db.users.find_one({"id": opp_data.owner_id}, {"_id": 0})
    
    opportunity = Opportunity(
        **opp_data.model_dump(),
        customer_name=customer.get('company_name'),
        owner_name=owner.get('name') if owner else None
    )
    
    opp_dict = opportunity.model_dump()
    opp_dict['created_at'] = opp_dict['created_at'].isoformat()
    opp_dict['updated_at'] = opp_dict['updated_at'].isoformat()
    
    await db.opportunities.insert_one(opp_dict)
    
    if isinstance(opp_dict['created_at'], str):
        opp_dict['created_at'] = datetime.fromisoformat(opp_dict['created_at'])
    if isinstance(opp_dict['updated_at'], str):
        opp_dict['updated_at'] = datetime.fromisoformat(opp_dict['updated_at'])
    
    return Opportunity(**opp_dict)

@api_router.get("/opportunities", response_model=List[Opportunity])
async def get_opportunities(customer_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    await _check_db_connection()
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("opportunities", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Opportunities module not accessible")
    
    query = {}
    if customer_id:
        query['customer_id'] = customer_id
    
    # Apply data scoping
    scope = perms.get("modules", {}).get("opportunities", {}).get("scope", "all")
    if scope == "own":
        # Own opportunities: owned by the user
        query["owner_id"] = current_user['user_id']
    elif scope == "team":
        # Team: get customers managed by CSMs reporting to this AM
        team_csm_ids = await _get_team_csm_ids(current_user['user_id'])
        team_customer_ids = await _get_customer_ids_for_csms(team_csm_ids + [current_user['user_id']])
        query["customer_id"] = {"$in": team_customer_ids}
    
    opportunities = await db.opportunities.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for opp in opportunities:
        if isinstance(opp['created_at'], str):
            opp['created_at'] = datetime.fromisoformat(opp['created_at'])
        if isinstance(opp['updated_at'], str):
            opp['updated_at'] = datetime.fromisoformat(opp['updated_at'])
    return opportunities

@api_router.put("/opportunities/{opportunity_id}")
async def update_opportunity(opportunity_id: str, opp_data: dict, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("opportunities", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Opportunities module not accessible")
    if not perms.get("modules", {}).get("opportunities", {}).get("actions", {}).get("edit"):
        raise HTTPException(status_code=403, detail="No permission to edit opportunities")
    
    existing = await db.opportunities.find_one({"id": opportunity_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    update_dict = {k: v for k, v in opp_data.items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.opportunities.update_one({"id": opportunity_id}, {"$set": update_dict})
    return {"message": "Opportunity updated successfully"}

@api_router.delete("/opportunities/{opportunity_id}")
async def delete_opportunity(opportunity_id: str, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("opportunities", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Opportunities module not accessible")
    if not perms.get("modules", {}).get("opportunities", {}).get("actions", {}).get("delete"):
        raise HTTPException(status_code=403, detail="No permission to delete opportunities")
    
    result = await db.opportunities.delete_one({"id": opportunity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return {"message": "Opportunity deleted successfully"}

@api_router.put("/risks/{risk_id}")
async def update_risk(risk_id: str, risk_data: dict, current_user: Dict = Depends(get_current_user)):
    existing = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    update_dict = {k: v for k, v in risk_data.items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.risks.update_one({"id": risk_id}, {"$set": update_dict})
    return {"message": "Risk updated successfully"}

# Stakeholder Routes
@api_router.post("/customers/{customer_id}/stakeholders")
async def add_stakeholder(customer_id: str, stakeholder: dict, current_user: Dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    stakeholder['id'] = str(uuid.uuid4())
    stakeholder['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$push": {"stakeholders": stakeholder}}
    )
    return {"message": "Stakeholder added successfully", "id": stakeholder['id']}

@api_router.put("/customers/{customer_id}/stakeholders/{stakeholder_id}")
async def update_stakeholder(customer_id: str, stakeholder_id: str, stakeholder: dict, current_user: Dict = Depends(get_current_user)):
    result = await db.customers.update_one(
        {"id": customer_id, "stakeholders.id": stakeholder_id},
        {"$set": {"stakeholders.$": {**stakeholder, "id": stakeholder_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    return {"message": "Stakeholder updated successfully"}

# Document Routes
class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    document_type: str
    title: str
    description: Optional[str] = None
    document_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/customers/{customer_id}/documents")
async def add_document(customer_id: str, document: dict, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("documents", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Documents module not accessible")
    if not perms.get("modules", {}).get("documents", {}).get("actions", {}).get("create"):
        raise HTTPException(status_code=403, detail="No permission to create documents")
    
    existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    
    doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "document_type": document.get('document_type'),
        "title": document.get('title'),
        "description": document.get('description'),
        "document_url": document.get('document_url'),
        "file_name": document.get('file_name'),
        "file_size": document.get('file_size'),
        "created_by_id": current_user['user_id'],
        "created_by_name": user.get('name') if user else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc)
    return {"message": "Document added successfully", "id": doc['id']}

@api_router.get("/customers/{customer_id}/documents")
async def get_documents(customer_id: str, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("documents", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Documents module not accessible")
    
    documents = await db.documents.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return documents

@api_router.delete("/customers/{customer_id}/documents/{document_id}")
async def delete_document(customer_id: str, document_id: str, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("documents", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Documents module not accessible")
    if not perms.get("modules", {}).get("documents", {}).get("actions", {}).get("delete"):
        raise HTTPException(status_code=403, detail="No permission to delete documents")
    
    result = await db.documents.delete_one({"id": document_id, "customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

# Task Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("tasks", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Tasks module not accessible")
    if not perms.get("modules", {}).get("tasks", {}).get("actions", {}).get("create"):
        raise HTTPException(status_code=403, detail="No permission to create tasks")
    
    # Get customer name
    customer = await db.customers.find_one({"id": task_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get assigned user name
    assigned_user = await db.users.find_one({"id": task_data.assigned_to_id}, {"_id": 0})
    created_by = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    
    task = Task(
        **task_data.model_dump(),
        customer_name=customer.get('company_name'),
        assigned_to_name=assigned_user.get('name') if assigned_user else None,
        created_by_id=current_user['user_id'],
        created_by_name=created_by.get('name') if created_by else None
    )
    
    task_dict = task.model_dump()
    task_dict['created_at'] = task_dict['created_at'].isoformat()
    task_dict['updated_at'] = task_dict['updated_at'].isoformat()
    
    await db.tasks.insert_one(task_dict)
    
    if isinstance(task_dict['created_at'], str):
        task_dict['created_at'] = datetime.fromisoformat(task_dict['created_at'])
    if isinstance(task_dict['updated_at'], str):
        task_dict['updated_at'] = datetime.fromisoformat(task_dict['updated_at'])
    
    return Task(**task_dict)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(customer_id: Optional[str] = None, assigned_to_id: Optional[str] = None, status: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    await _check_db_connection()
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("tasks", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Tasks module not accessible")
    
    query = {}
    if customer_id:
        query['customer_id'] = customer_id
    if assigned_to_id:
        query['assigned_to_id'] = assigned_to_id
    if status:
        query['status'] = status
    
    # Apply data scoping
    scope = perms.get("modules", {}).get("tasks", {}).get("scope", "all")
    if scope == "own":
        # Own tasks: assigned to or created by the user
        query["$or"] = [
            {"assigned_to_id": current_user['user_id']},
            {"created_by_id": current_user['user_id']}
        ]
    elif scope == "team":
        # Team: get customers managed by CSMs reporting to this AM
        team_csm_ids = await _get_team_csm_ids(current_user['user_id'])
        team_customer_ids = await _get_customer_ids_for_csms(team_csm_ids + [current_user['user_id']])
        query["customer_id"] = {"$in": team_customer_ids}
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    for task in tasks:
        if isinstance(task['created_at'], str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if isinstance(task['updated_at'], str):
            task['updated_at'] = datetime.fromisoformat(task['updated_at'])
    return tasks

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: dict, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("tasks", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Tasks module not accessible")
    if not perms.get("modules", {}).get("tasks", {}).get("actions", {}).get("edit"):
        raise HTTPException(status_code=403, detail="No permission to edit tasks")
    
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = {k: v for k, v in task_data.items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # If status changed to Completed, set completed_date
    if task_data.get('status') == 'Completed' and existing.get('status') != 'Completed':
        update_dict['completed_date'] = datetime.now(timezone.utc).date().isoformat()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Task(**updated)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("tasks", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="Tasks module not accessible")
    if not perms.get("modules", {}).get("tasks", {}).get("actions", {}).get("delete"):
        raise HTTPException(status_code=403, detail="No permission to delete tasks")
    
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Data Labs Reports Routes
@api_router.post("/datalabs-reports", response_model=DataLabsReport)
async def create_datalabs_report(report_data: DataLabsReportCreate, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("datalabs_reports", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="DataLabs Reports module not accessible")
    if not perms.get("modules", {}).get("datalabs_reports", {}).get("actions", {}).get("create"):
        raise HTTPException(status_code=403, detail="No permission to create DataLabs reports")
    
    # Get customer name
    customer = await db.customers.find_one({"id": report_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get created by user name
    created_by = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    
    report = DataLabsReport(
        **report_data.model_dump(),
        customer_name=customer.get('company_name'),
        created_by_id=current_user['user_id'],
        created_by_name=created_by.get('name') if created_by else None
    )
    
    report_dict = report.model_dump()
    report_dict['created_at'] = report_dict['created_at'].isoformat()
    
    await db.datalabs_reports.insert_one(report_dict)
    
    if isinstance(report_dict['created_at'], str):
        report_dict['created_at'] = datetime.fromisoformat(report_dict['created_at'])
    
    return DataLabsReport(**report_dict)

@api_router.get("/datalabs-reports", response_model=List[DataLabsReport])
async def get_datalabs_reports(customer_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    await _check_db_connection()
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("datalabs_reports", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="DataLabs Reports module not accessible")
    
    query = {}
    if customer_id:
        query['customer_id'] = customer_id
    
    # Apply data scoping
    scope = perms.get("modules", {}).get("datalabs_reports", {}).get("scope", "all")
    if scope == "own":
        # Own reports: created by the user
        query["created_by_id"] = current_user['user_id']
    elif scope == "team":
        # Team: get customers managed by CSMs reporting to this AM
        team_csm_ids = await _get_team_csm_ids(current_user['user_id'])
        team_customer_ids = await _get_customer_ids_for_csms(team_csm_ids + [current_user['user_id']])
        query["customer_id"] = {"$in": team_customer_ids}
    
    reports = await db.datalabs_reports.find(query, {"_id": 0}).sort("report_date", -1).to_list(1000)
    for report in reports:
        if isinstance(report['created_at'], str):
            report['created_at'] = datetime.fromisoformat(report['created_at'])
    return reports

@api_router.delete("/datalabs-reports/{report_id}")
async def delete_datalabs_report(report_id: str, current_user: Dict = Depends(get_current_user)):
    # Permission check
    perms = await _user_permissions(current_user)
    if not perms.get("modules", {}).get("datalabs_reports", {}).get("enabled"):
        raise HTTPException(status_code=403, detail="DataLabs Reports module not accessible")
    if not perms.get("modules", {}).get("datalabs_reports", {}).get("actions", {}).get("delete"):
        raise HTTPException(status_code=403, detail="No permission to delete reports")
    
    result = await db.datalabs_reports.delete_one({"id": report_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    try:
        await _check_db_connection()
        total_customers = await db.customers.count_documents({})
        total_arr = await db.customers.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$arr"}}}
        ]).to_list(1)
        
        healthy_count = await db.customers.count_documents({"health_status": "Healthy"})
        at_risk_count = await db.customers.count_documents({"health_status": "At Risk"})
        critical_count = await db.customers.count_documents({"health_status": "Critical"})
        
        open_risks = await db.risks.count_documents({"status": "Open"})
        critical_risks = await db.risks.count_documents({"severity": "Critical"})
        
        active_opportunities = await db.opportunities.count_documents({"stage": {"$ne": "Closed Won"}})
        pipeline_value = await db.opportunities.aggregate([
            {"$match": {"stage": {"$ne": "Closed Won"}}},
            {"$group": {"_id": None, "total": {"$sum": "$value"}}}
        ]).to_list(1)
        
        # Task stats
        my_tasks = await db.tasks.count_documents({"assigned_to_id": current_user['user_id'], "status": {"$ne": "Completed"}})
        overdue_tasks = await db.tasks.count_documents({
            "assigned_to_id": current_user['user_id'],
            "status": {"$ne": "Completed"},
            "due_date": {"$lt": datetime.now(timezone.utc).date().isoformat()}
        })
        
        return {
            "total_customers": total_customers,
            "total_arr": total_arr[0]['total'] if total_arr and total_arr[0].get('total') else 0,
            "healthy_customers": healthy_count,
            "at_risk_customers": at_risk_count,
            "critical_customers": critical_count,
            "open_risks": open_risks,
            "critical_risks": critical_risks,
            "active_opportunities": active_opportunities,
            "pipeline_value": pipeline_value[0]['total'] if pipeline_value and pipeline_value[0].get('total') else 0,
            "my_tasks": my_tasks,
            "overdue_tasks": overdue_tasks
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

# Reports Analytics
@api_router.get("/reports/analytics")
async def get_reports_analytics(current_user: Dict = Depends(get_current_user)):
    """Calculate dynamic trends, CSM performance, and forecasts from database"""
    await _check_db_connection()
    from dateutil.relativedelta import relativedelta
    from collections import defaultdict
    
    try:
        now = datetime.now(timezone.utc)
        current_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        last_month_start = current_month_start - relativedelta(months=1)
        
        def safe_dt(val):
            if not val: return None
            if isinstance(val, datetime): return val
            try: return datetime.fromisoformat(val).replace(tzinfo=timezone.utc)
            except: return None

        def safe_date_str(val):
            if not val: return ""
            if isinstance(val, datetime): return val.date().isoformat()
            return str(val)

        # Get all customers and tasks
        all_customers = await db.customers.find({}).to_list(None)
        all_tasks = await db.tasks.find({}).to_list(None)
        today_str = now.date().isoformat()
        
        # --- Month-over-Month Trends ---
        current_month_customers = [c for c in all_customers if safe_dt(c.get('created_at')) and safe_dt(c.get('created_at')) >= current_month_start]
        
        # Calculate last month ARR
        total_customers_now = len(all_customers)
        customers_before_current_month = total_customers_now - len(current_month_customers)
        customer_growth_pct = round(((len(current_month_customers) / customers_before_current_month) * 100) if customers_before_current_month > 0 else 0, 1)
        
        current_total_arr = sum(float(c.get('arr') or 0) for c in all_customers)
        last_month_arr = sum(float(c.get('arr') or 0) for c in all_customers if safe_dt(c.get('created_at')) and safe_dt(c.get('created_at')) < current_month_start)
        arr_growth_pct = round(((current_total_arr - last_month_arr) / last_month_arr * 100) if last_month_arr > 0 else 0, 1)
        
        health_score_change = 0 # Future: track historical
        
        # --- Monthly Trend (Last 6 Months) ---
        monthly_trend = []
        for i in range(5, -1, -1):
            m_start = current_month_start - relativedelta(months=i)
            m_end = m_start + relativedelta(months=1)
            
            new_c = sum(1 for c in all_customers if safe_dt(c.get('created_at')) and m_start <= safe_dt(c.get('created_at')) < m_end)
            churn_in_m = sum(1 for c in all_customers if c.get('account_status') == 'Churn' and safe_dt(c.get('churn_date')) and m_start <= safe_dt(c.get('churn_date')) < m_end)
            arr_at_m_end = sum(float(c.get('arr') or 0) for c in all_customers if safe_dt(c.get('created_at')) and safe_dt(c.get('created_at')) < m_end and c.get('account_status') != 'Churn')
            
            monthly_trend.append({
                'month': m_start.strftime('%b'),
                'newCustomers': new_c,
                'churn': churn_in_m,
                'arr': arr_at_m_end
            })
        
        # --- CSM Performance ---
        csms = await db.users.find({"$or": [{"roles": "CSM"}, {"role": "CSM"}]}).to_list(None)
        csm_perf = []
        
        for csm in csms:
            csm_customers = [c for c in all_customers if c.get('csm_owner_id') == csm['id']]
            csm_tasks = [t for t in all_tasks if t.get('assigned_to_id') == csm['id']]
            if not csm_customers and not csm_tasks: continue
            
            acc_count = len(csm_customers)
            h_count = sum(1 for c in csm_customers if c.get('health_status') == 'Healthy')
            r_count = sum(1 for c in csm_customers if c.get('health_status') == 'At Risk')
            t_arr = sum(float(c.get('arr') or 0) for c in csm_customers)
            
            t_total = len(csm_tasks)
            t_on_time = sum(1 for t in csm_tasks if t.get('status') == 'Completed' and safe_date_str(t.get('completed_date')) <= safe_date_str(t.get('due_date')))
            t_late = sum(1 for t in csm_tasks if t.get('status') == 'Completed' and safe_date_str(t.get('completed_date')) > safe_date_str(t.get('due_date')) and t.get('due_date'))
            t_overdue = sum(1 for t in csm_tasks if t.get('status') != 'Completed' and safe_date_str(t.get('due_date')) < today_str and t.get('due_date'))
            t_upcoming = sum(1 for t in csm_tasks if t.get('status') != 'Completed' and safe_date_str(t.get('due_date')) >= today_str)

            csm_perf.append({
                'name': csm.get('name', 'Unknown'),
                'accounts': acc_count,
                'healthyPct': round((h_count / acc_count) * 100) if acc_count > 0 else 0,
                'atRiskPct': round((r_count / acc_count) * 100) if acc_count > 0 else 0,
                'arr': t_arr,
                'tasks': {
                    'total': t_total,
                    'completed_on_time': t_on_time,
                    'completed_late': t_late,
                    'overdue': t_overdue,
                    'upcoming': t_upcoming
                }
            })
        
        csm_perf.sort(key=lambda x: x['arr'], reverse=True)
        
        # --- Renewal Forecast ---
        renewal_forecast = []
        for q in range(4):
            q_start = current_month_start + relativedelta(months=q*3)
            q_end = q_start + relativedelta(months=3)
            
            q_renewals = [c for c in all_customers if c.get('renewal_date') and q_start.date() <= safe_dt(c.get('renewal_date')).date() < q_end.date()]
            renewal_forecast.append({
                'quarter': f"Q{((q_start.month - 1) // 3) + 1} {q_start.year}",
                'renewals': len(q_renewals),
                'value': sum(float(c.get('arr') or 0) for c in q_renewals),
                'atRisk': sum(1 for c in q_renewals if c.get('health_status') in ['At Risk', 'Critical'])
            })
        
        # --- NRR ---
        year_ago = current_month_start - relativedelta(months=12)
        old_customers = [c for c in all_customers if safe_dt(c.get('created_at')) and safe_dt(c.get('created_at')) < year_ago and c.get('account_status') != 'Churn']
        arr_year_ago = sum(float(c.get('arr') or 0) for c in old_customers)
        nrr = round((sum(float(c.get('arr') or 0) for c in old_customers) / arr_year_ago * 100) if arr_year_ago > 0 else 100, 0)
        
        return {
            "customer_growth_pct": customer_growth_pct,
            "arr_growth_pct": arr_growth_pct,
            "health_score_change": health_score_change,
            "monthly_trend": monthly_trend,
            "csm_performance": csm_perf,
            "renewal_forecast": renewal_forecast,
            "nrr": nrr,
            "nrr_target": 100,
            "nrr_status": "Above target" if nrr >= 100 else "Below target"
        }
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating analytics: {str(e)}")


# ============================================================================
# NOTIFICATIONS
# ============================================================================

class NotificationSeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    NORMAL = "Normal"
    INFO = "Info"

class NotificationStatus(str, Enum):
    UNREAD = "Unread"
    READ = "Read"
    ARCHIVED = "Archived"
    ACTIONED = "Actioned"

class NotificationModule(str, Enum):
    CUSTOMER = "Customer"
    ACTIVITY = "Activity"
    RISK = "Risk"
    OPPORTUNITY = "Opportunity"
    TASK = "Task"
    DOCUMENT = "Document"
    REPORT = "Report"
    SYSTEM = "System"

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    severity: NotificationSeverity = NotificationSeverity.NORMAL
    module: NotificationModule
    status: NotificationStatus = NotificationStatus.UNREAD
    entity_type: Optional[str] = None  # "customer", "task", "risk", etc.
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    cta_text: Optional[str] = None  # "View Account", "Complete Task", etc.
    cta_url: Optional[str] = None  # "/customers/123", "/tasks/456", etc.
    metadata: Optional[Dict[str, Any]] = None  # Additional context
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None
    actioned_at: Optional[datetime] = None

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    severity: NotificationSeverity = NotificationSeverity.NORMAL
    module: NotificationModule
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@api_router.get("/notifications")
async def get_notifications(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    module: Optional[str] = None,
    limit: int = 50,
    current_user: Dict = Depends(get_current_user)
):
    """Get notifications for current user"""
    try:
        query = {"user_id": current_user['user_id']}
        
        if status:
            query["status"] = status
        if severity:
            query["severity"] = severity
        if module:
            query["module"] = module
        
        notifications = await db.notifications.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Convert datetime to ISO string
        for notif in notifications:
            if notif.get('created_at'):
                notif['created_at'] = notif['created_at'].isoformat()
            if notif.get('read_at'):
                notif['read_at'] = notif['read_at'].isoformat()
            if notif.get('actioned_at'):
                notif['actioned_at'] = notif['actioned_at'].isoformat()
        
        return notifications
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=503, detail=f"Database connection error: {str(e)}")

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: Dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    try:
        count = await db.notifications.count_documents({
            "user_id": current_user['user_id'],
            "status": "Unread"
        })
        return {"count": count}
    except Exception as e:
        logger.error(f"Error fetching unread count: {e}")
        # Return 0 on error so UI doesn't break
        return {"count": 0}

@api_router.put("/notifications/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user['user_id']},
        {
            "$set": {
                "status": "Read",
                "read_at": datetime.now(timezone.utc)
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "ok"}

@api_router.put("/notifications/{notification_id}/mark-unread")
async def mark_notification_unread(
    notification_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Mark notification as unread"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user['user_id']},
        {
            "$set": {
                "status": "Unread",
                "read_at": None
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "ok"}

@api_router.put("/notifications/{notification_id}/archive")
async def archive_notification(
    notification_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Archive notification"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user['user_id']},
        {"$set": {"status": "Archived"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "ok"}

@api_router.put("/notifications/{notification_id}/action")
async def mark_notification_actioned(
    notification_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Mark notification as actioned"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user['user_id']},
        {
            "$set": {
                "status": "Actioned",
                "actioned_at": datetime.now(timezone.utc)
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "ok"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_read(current_user: Dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    result = await db.notifications.update_many(
        {"user_id": current_user['user_id'], "status": "Unread"},
        {
            "$set": {
                "status": "Read",
                "read_at": datetime.now(timezone.utc)
            }
        }
    )
    return {"count": result.modified_count}

@api_router.post("/notifications")
async def create_notification(
    notification: NotificationCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new notification (admin/system only)"""
    # Only admins or system can create notifications
    roles = _roles(current_user)
    if not roles.intersection({'ADMIN', 'CS_OPS'}):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    notif_dict = notification.model_dump()
    notif_dict['id'] = str(uuid.uuid4())
    notif_dict['created_at'] = datetime.now(timezone.utc)
    notif_dict['status'] = 'Unread'
    
    await db.notifications.insert_one(notif_dict)
    return {"id": notif_dict['id'], "status": "created"}

# Helper function to create notifications
async def create_notification_for_user(
    user_id: str,
    title: str,
    message: str,
    severity: str,
    module: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
    metadata: Optional[Dict] = None
):
    """Helper to create notification"""
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "severity": severity,
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "cta_text": cta_text,
        "cta_url": cta_url,
        "metadata": metadata or {},
        "status": "Unread",
        "created_at": datetime.now(timezone.utc),
        "read_at": None,
        "actioned_at": None
    }
    await db.notifications.insert_one(notif)
    return notif['id']

# Include router
app.include_router(api_router)

# CORS
origins_str = os.environ.get('CORS_ORIGINS', '*')
allow_origins = [origin.strip() for origin in origins_str.split(',')] if origins_str else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging already configured at top of file

@app.on_event("startup")
async def startup_db():
    """Initialize database connection and schema on startup."""
    global db, client
    try:
        if db is not None:
            await ensure_schema(db)
            logger.info("Database schema initialized successfully")
        else:
            logger.warning("Database connection not available on startup")
    except Exception as e:
        logger.error(f"Failed to initialize database on startup: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
