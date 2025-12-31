"""
MongoDB "schema" for this app (collections + indexes + optional JSONSchema validators).

MongoDB is schemaless by default, but Atlas supports per-collection JSON Schema validators
and indexes. We keep this module as the single source of truth so both:
  - startup initialization (server.py)
  - one-off init (init_db.py)
stay consistent.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple, Union

from pymongo.errors import CollectionInvalid, OperationFailure

logger = logging.getLogger(__name__)

IndexKeys = Union[str, List[Tuple[str, int]]]


def _dt_or_str() -> List[str]:
    # Many writes store timestamps as ISO strings today; allow both to avoid breaking.
    return ["date", "string"]

def _dt_or_str_or_null() -> List[str]:
    return ["date", "string", "null"]


VALIDATORS: Dict[str, Dict[str, Any]] = {
    "users": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "email", "name", "password", "created_at"],
            # Allow legacy `role` or new `roles`
            "anyOf": [{"required": ["role"]}, {"required": ["roles"]}],
            "properties": {
                "id": {"bsonType": "string"},
                "email": {"bsonType": "string"},
                "name": {"bsonType": "string"},
                "role": {"bsonType": ["string", "null"]},
                "roles": {"bsonType": "array"},
                "status": {"bsonType": ["string", "null"]},
                "phone": {"bsonType": ["string", "null"]},
                "avatar_url": {"bsonType": ["string", "null"]},
                "job_title": {"bsonType": ["string", "null"]},
                "department": {"bsonType": ["string", "null"]},
                "manager_id": {"bsonType": ["string", "null"]},
                "last_login_at": {"bsonType": _dt_or_str_or_null()},
                "created_by_id": {"bsonType": ["string", "null"]},
                "created_by_name": {"bsonType": ["string", "null"]},
                "invite_token": {"bsonType": ["string", "null"]},
                "invite_expires_at": {"bsonType": _dt_or_str_or_null()},
                "password": {"bsonType": "string"},
                "created_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "customers": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "company_name", "created_at", "updated_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "company_name": {"bsonType": "string"},
                "website": {"bsonType": ["string", "null"]},
                "industry": {"bsonType": ["string", "null"]},
                "region": {"bsonType": ["string", "null"]},
                "plan_type": {"bsonType": ["string", "null"]},
                "arr": {"bsonType": ["double", "int", "long", "decimal", "null"]},
                "one_time_setup_cost": {"bsonType": ["double", "int", "long", "decimal", "null"]},
                "quarterly_consumption_cost": {"bsonType": ["double", "int", "long", "decimal", "null"]},
                "contract_start_date": {"bsonType": ["string", "null"]},
                "contract_end_date": {"bsonType": ["string", "null"]},
                "renewal_date": {"bsonType": ["string", "null"]},
                "go_live_date": {"bsonType": ["string", "null"]},
                "products_purchased": {"bsonType": "array"},
                "onboarding_status": {"bsonType": "string"},
                "account_status": {"bsonType": ["string", "null"]},
                "health_score": {"bsonType": ["double", "int", "long", "decimal"]},
                "health_status": {"bsonType": "string"},
                "risk_level": {"bsonType": ["string", "null"]},
                "primary_objective": {"bsonType": ["string", "null"]},
                "calls_processed": {"bsonType": ["int", "long"]},
                "active_users": {"bsonType": ["int", "long"]},
                "total_licensed_users": {"bsonType": ["int", "long"]},
                "csm_owner_id": {"bsonType": ["string", "null"]},
                "csm_owner_name": {"bsonType": ["string", "null"]},
                "am_owner_id": {"bsonType": ["string", "null"]},
                "am_owner_name": {"bsonType": ["string", "null"]},
                "tags": {"bsonType": "array"},
                "stakeholders": {"bsonType": "array"},
                "last_activity_date": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
                "updated_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "activities": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "customer_id", "activity_type", "activity_date", "title", "summary", "csm_id", "created_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "customer_id": {"bsonType": "string"},
                "customer_name": {"bsonType": ["string", "null"]},
                "activity_type": {"bsonType": "string"},
                "activity_date": {"bsonType": _dt_or_str()},
                "title": {"bsonType": "string"},
                "summary": {"bsonType": "string"},
                "internal_notes": {"bsonType": ["string", "null"]},
                "sentiment": {"bsonType": ["string", "null"]},
                "follow_up_required": {"bsonType": "bool"},
                "follow_up_date": {"bsonType": ["string", "null"]},
                "follow_up_status": {"bsonType": ["string", "null"]},
                "csm_id": {"bsonType": "string"},
                "csm_name": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "risks": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "customer_id", "category", "severity", "status", "title", "description", "identified_date", "assigned_to_id", "created_at", "updated_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "customer_id": {"bsonType": "string"},
                "customer_name": {"bsonType": ["string", "null"]},
                "category": {"bsonType": "string"},
                "subcategory": {"bsonType": ["string", "null"]},
                "severity": {"bsonType": "string"},
                "status": {"bsonType": "string"},
                "title": {"bsonType": "string"},
                "description": {"bsonType": "string"},
                "impact_description": {"bsonType": ["string", "null"]},
                "mitigation_plan": {"bsonType": ["string", "null"]},
                "revenue_impact": {"bsonType": ["double", "int", "long", "decimal", "null"]},
                "churn_probability": {"bsonType": ["int", "long", "null"]},
                "identified_date": {"bsonType": "string"},
                "target_resolution_date": {"bsonType": ["string", "null"]},
                "resolution_date": {"bsonType": ["string", "null"]},
                "assigned_to_id": {"bsonType": "string"},
                "assigned_to_name": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
                "updated_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "opportunities": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "customer_id", "opportunity_type", "title", "stage", "owner_id", "created_at", "updated_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "customer_id": {"bsonType": "string"},
                "customer_name": {"bsonType": ["string", "null"]},
                "opportunity_type": {"bsonType": "string"},
                "title": {"bsonType": "string"},
                "description": {"bsonType": ["string", "null"]},
                "value": {"bsonType": ["double", "int", "long", "decimal", "null"]},
                "probability": {"bsonType": ["int", "long", "null"]},
                "stage": {"bsonType": "string"},
                "expected_close_date": {"bsonType": ["string", "null"]},
                "owner_id": {"bsonType": "string"},
                "owner_name": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
                "updated_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "tasks": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "customer_id", "task_type", "title", "priority", "status", "assigned_to_id", "due_date", "created_by_id", "created_at", "updated_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "customer_id": {"bsonType": "string"},
                "customer_name": {"bsonType": ["string", "null"]},
                "task_type": {"bsonType": "string"},
                "title": {"bsonType": "string"},
                "description": {"bsonType": ["string", "null"]},
                "priority": {"bsonType": "string"},
                "status": {"bsonType": "string"},
                "assigned_to_id": {"bsonType": "string"},
                "assigned_to_name": {"bsonType": ["string", "null"]},
                "due_date": {"bsonType": "string"},
                "completed_date": {"bsonType": ["string", "null"]},
                "created_by_id": {"bsonType": "string"},
                "created_by_name": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
                "updated_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "datalabs_reports": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "customer_id", "report_date", "report_title", "report_link", "report_type", "created_by_id", "created_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "customer_id": {"bsonType": "string"},
                "customer_name": {"bsonType": ["string", "null"]},
                "report_date": {"bsonType": "string"},
                "report_title": {"bsonType": "string"},
                "report_link": {"bsonType": "string"},
                "report_type": {"bsonType": "string"},
                "description": {"bsonType": ["string", "null"]},
                "sent_to": {"bsonType": "array"},
                "created_by_id": {"bsonType": "string"},
                "created_by_name": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "documents": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "customer_id", "document_type", "title", "created_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "customer_id": {"bsonType": "string"},
                "document_type": {"bsonType": "string"},
                "title": {"bsonType": "string"},
                "description": {"bsonType": ["string", "null"]},
                "document_url": {"bsonType": ["string", "null"]},
                "file_name": {"bsonType": ["string", "null"]},
                "file_size": {"bsonType": ["int", "long", "null"]},
                "created_by_id": {"bsonType": ["string", "null"]},
                "created_by_name": {"bsonType": ["string", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
            },
        }
    },
    "settings": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id"],
            "properties": {
                "id": {"bsonType": "string"},
                "organization": {"bsonType": ["object", "null"]},
                "health_thresholds": {"bsonType": ["object", "null"]},
                "notifications": {"bsonType": ["object", "null"]},
                "tags": {"bsonType": "array"},
                "dropdowns": {"bsonType": "array"},
                "field_configs": {"bsonType": ["object", "null"]},
                "roles": {"bsonType": "array"},
                "templates": {"bsonType": "array"},
                "role_permissions": {"bsonType": ["object", "null"]},
            },
        }
    },
    "_meta": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id"],
            "properties": {
                "id": {"bsonType": "string"},
                "initialized_at": {"bsonType": ["string", "null"]},
            },
        }
    },
    "notifications": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "user_id", "title", "message", "severity", "module", "status", "created_at"],
            "properties": {
                "id": {"bsonType": "string"},
                "user_id": {"bsonType": "string"},
                "title": {"bsonType": "string"},
                "message": {"bsonType": "string"},
                "severity": {"enum": ["Critical", "High", "Normal", "Info"]},
                "module": {"enum": ["Customer", "Activity", "Risk", "Opportunity", "Task", "Document", "Report", "System"]},
                "status": {"enum": ["Unread", "Read", "Archived", "Actioned"]},
                "entity_type": {"bsonType": ["string", "null"]},
                "entity_id": {"bsonType": ["string", "null"]},
                "entity_name": {"bsonType": ["string", "null"]},
                "cta_text": {"bsonType": ["string", "null"]},
                "cta_url": {"bsonType": ["string", "null"]},
                "metadata": {"bsonType": ["object", "null"]},
                "created_at": {"bsonType": _dt_or_str()},
                "read_at": {"bsonType": _dt_or_str_or_null()},
                "actioned_at": {"bsonType": _dt_or_str_or_null()},
            },
        }
    },
}


INDEXES: Dict[str, List[Tuple[IndexKeys, Dict[str, Any]]]] = {
    "users": [
        ("email", {"unique": True}),
        ("id", {"unique": True}),
        ("role", {}),
        ("status", {}),
        ("department", {}),
        ("manager_id", {}),
    ],
    "customers": [
        ("id", {"unique": True}),
        ("company_name", {"unique": True}),
        ("csm_owner_id", {}),
        ("am_owner_id", {}),
        ("health_status", {}),
        ("account_status", {}),
        ("renewal_date", {}),
        ("region", {}),
    ],
    "activities": [
        ("id", {"unique": True}),
        ("customer_id", {}),
        ("activity_date", {}),
        ([("customer_id", 1), ("activity_date", -1)], {}),
    ],
    "risks": [
        ("id", {"unique": True}),
        ("customer_id", {}),
        ("status", {}),
        ("severity", {}),
    ],
    "opportunities": [
        ("id", {"unique": True}),
        ("customer_id", {}),
        ("stage", {}),
    ],
    "tasks": [
        ("id", {"unique": True}),
        ("customer_id", {}),
        ("assigned_to_id", {}),
        ("status", {}),
        ("due_date", {}),
    ],
    "datalabs_reports": [
        ("id", {"unique": True}),
        ("customer_id", {}),
        ("report_date", {}),
    ],
    "documents": [
        ("id", {"unique": True}),
        ("customer_id", {}),
        ("created_at", {}),
    ],
    "settings": [
        ("id", {"unique": True}),
    ],
    "_meta": [
        ("id", {"unique": True}),
    ],
    "notifications": [
        ("id", {"unique": True}),
        ("user_id", {}),
        ("status", {}),
        ("severity", {}),
        ("module", {}),
        ([("user_id", 1), ("created_at", -1)], {}),
        ([("user_id", 1), ("status", 1)], {}),
    ],
}


async def ensure_schema(db) -> None:
    """
    Idempotently ensure collections exist, optional validators are applied, and indexes are present.
    Safe to run on every startup.
    """
    existing = set(await db.list_collection_names())

    # Create collections (so validators can be attached at create-time).
    for name, validator in VALIDATORS.items():
        if name not in existing:
            try:
                await db.create_collection(
                    name,
                    validator=validator,
                    validationLevel="moderate",
                )
                logger.info("Created collection %s with validator", name)
            except CollectionInvalid:
                # Someone created it concurrently.
                pass
            except OperationFailure as e:
                # Some Atlas tiers/roles may not permit validators; continue with indexes.
                logger.warning("Could not create collection %s with validator (%s)", name, e)

    # Try to apply/update validators for existing collections.
    for name, validator in VALIDATORS.items():
        try:
            await db.command({"collMod": name, "validator": validator, "validationLevel": "moderate"})
        except OperationFailure:
            # Ignore if not authorized / not supported. Indexes still enforce uniqueness etc.
            pass

    # Ensure indexes
    for name, idx_list in INDEXES.items():
        coll = db[name]
        for keys, kwargs in idx_list:
            try:
                await coll.create_index(keys, **kwargs)
            except OperationFailure as e:
                logger.warning("Could not create index on %s (%s, %s): %s", name, keys, kwargs, e)

