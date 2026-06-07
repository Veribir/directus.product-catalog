# Directus Docker Setup

## Prerequisites
- Docker & Docker Compose

## Getting Started

1. Copy the env file and fill in your values:
   ```bash
   cp .env .env.local
   # edit .env.local with your secrets
   ```

2. Start the stack:
   ```bash
   docker compose up -d
   ```

3. Open Directus at **http://localhost:8055** and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

## Services

| Service   | Port | Description              |
|-----------|------|--------------------------|
| Directus  | 8055 | Headless CMS API + Studio|
| PostgreSQL | —   | Database (internal only) |
| Redis     | —    | Cache (internal only)    |

## Useful Commands

```bash
# View logs
docker compose logs -f directus

# Stop everything
docker compose down

# Stop and remove volumes (⚠️ destroys data)
docker compose down -v
```

## Directories

| Path         | Purpose                                |
|--------------|----------------------------------------|
| `uploads/`   | File uploads served by Directus        |
| `extensions/`| Custom Directus extensions             |
