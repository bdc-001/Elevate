## MongoDB Atlas (hosting your database)

MongoDB is a **document database**, so it uses **collections** instead of SQL “tables”.

### Collections used by this app

- `users`
- `customers`
- `activities`
- `risks`
- `opportunities`
- `tasks`
- `datalabs_reports`
- `documents` (document metadata + URLs)
- `settings` (singleton config doc)

### 1) Create the Atlas connection details

In MongoDB Atlas:
- Create a **Database User**
- Add **Network Access** (IP allowlist)
  - For quick testing: allow your current IP (recommended), or `0.0.0.0/0` (not recommended for production)
- Copy your **connection string** (MongoDB “Drivers” → Python)

### 2) Set environment variables for the backend

Set:
- `MONGO_URL` = your Atlas connection string
- `DB_NAME` = e.g. `elivate`

Example:

```bash
export MONGO_URL='mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority'
export DB_NAME='elivate'
```

### 3) Initialize the database (create indexes)

Run once:

```bash
python3 init_db.py
```

### Notes

- You **don’t host the app “on MongoDB”**. You host the **database** on Atlas, and host your **backend** (FastAPI) somewhere (Render/Fly/EC2/etc.) that connects to Atlas using `MONGO_URL`.
- The backend also ensures collections/indexes automatically on startup (idempotent), but running `init_db.py` once is still recommended for a fresh database.

