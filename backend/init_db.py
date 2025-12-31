"""
MongoDB initialization for Convin Elevate (Atlas/local).

This project uses MongoDB collections (not SQL tables).
Run this once against a new database to create collections + indexes (and attempt validators).

Required env:
  - MONGO_URL  e.g. mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  - DB_NAME    e.g. elivate
"""

import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from db_schema import ensure_schema


async def main():
    # Load backend/.env if present (same behavior as server.py)
    root_dir = Path(__file__).parent
    load_dotenv(root_dir / ".env")

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    await ensure_schema(db)

    # Ping by writing a small marker doc (optional)
    await db["_meta"].update_one(
        {"id": "init"},
        {"$set": {"id": "init", "initialized_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    print(f"✅ Initialized MongoDB database '{db_name}' with indexes.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())


