# Directus Docker Setup

Directus CMS for Barkomas, backed by a **Neon serverless PostgreSQL** database and **S3-compatible
storage** — both external, so the Directus container itself is stateless. That's true whether it's
running locally via Docker Compose or hosted on Fly.io.

## Prerequisites
- Docker & Docker Compose (local dev)
- A Neon PostgreSQL connection string (shared — see note below)
- An S3-compatible bucket for file storage
- [`flyctl`](https://fly.io/docs/flyctl/install/) (only needed if you're deploying)

## Local Development

1. Copy the env file and fill in your values:
   ```bash
   cp .env.example .env
   # edit .env with your Neon connection string, secrets, and S3 credentials
   ```

2. Start the stack:
   ```bash
   docker compose up -d
   ```

3. Open Directus at **http://localhost:8055** and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   you set in `.env`.

> **Note:** local dev and the hosted Fly instance point at the **same Neon database** via
> `DB_CONNECTION_STRING`. Schema changes, content edits, and anything done through the Directus
> admin UI or MCP tools are live everywhere immediately — no deploy required. See
> [When do you actually need to redeploy?](#when-do-you-actually-need-to-redeploy) below.

## Services

| Service   | Where it runs | Description |
|-----------|----------------|-------------|
| Directus  | Local container / Fly machine | Headless CMS API + Studio, port 8055 |
| PostgreSQL | Neon (external, managed) | Database — not a local container |
| File storage | S3-compatible bucket (external) | `STORAGE_LOCATIONS=s3` — uploads never touch local disk in production |

## Useful Commands

```bash
# View logs
docker compose logs -f directus

# Stop everything
docker compose down

# Stop and remove volumes (⚠️ destroys local container state — Neon data is untouched)
docker compose down -v
```

## Directories

| Path         | Purpose                                |
|--------------|-----------------------------------------|
| `uploads/`   | Local-dev file uploads (gitignored). Only used if `STORAGE_LOCATIONS` isn't `s3`; production always uses S3. |
| `extensions/`| Custom Directus extensions — copied into the image by the `Dockerfile` and mounted locally by `docker-compose.yml` |
| `schema/`    | `product-catalog-schema.sql` — authoritative SQL DDL, see the project root `CLAUDE.md` |
| `seed-data/` | Seed data used by the Directus Template CLI (see `TEMPLATE_SETUP.md`) |

---

## Deploying to Fly.io

This project already runs a live Directus instance on Fly.io:

- **App**: `dev-tamim` (see `fly.toml`)
- **Region**: `sin` (Singapore)
- **URL**: https://dev-tamim.fly.dev
- **Machines**: `auto_stop_machines = "suspend"`, `min_machines_running = 0` — the machine suspends
  when idle and auto-starts on the next request. Expect a few seconds of cold-start latency after
  idle periods.

Directus is stateless on Fly: the database is Neon and uploads go straight to S3, so there's no
Fly volume to provision or back up. Machines can be destroyed and recreated freely.

### Prerequisites

```bash
flyctl auth login
```

You need access to the `dev-tamim` Fly org/app to deploy to the existing instance. To stand up a
**new** instance instead (e.g. for a separate environment), see
[First-time provisioning](#first-time-provisioning-new-instance-only) below.

### Deploying an update

Deploys are only needed for changes to the `Dockerfile`, the Directus image version, or
`extensions/` — **not** for schema or content changes (those go straight to Neon, see the note
above).

```bash
cd directus
fly deploy
```

This builds `Dockerfile` (via Fly's remote builder by default) and rolls out a new machine. Watch
the rollout:

```bash
fly status
fly logs
```

### Configuring secrets

Directus reads all configuration from environment variables. None of them are baked into the
image, so a fresh Fly app needs every variable from `.env.example` set as a secret:

```bash
cd directus
fly secrets set \
  SECRET="$(openssl rand -hex 32)" \
  DB_CLIENT="pg" \
  DB_CONNECTION_STRING="postgres://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require" \
  DB_SSL__REJECT_UNAUTHORIZED="false" \
  ADMIN_EMAIL="admin@example.com" \
  ADMIN_PASSWORD="a-strong-password" \
  PUBLIC_URL="https://dev-tamim.fly.dev" \
  CORS_ENABLED="true" \
  CORS_ORIGIN="https://your-frontend-domain.com" \
  IP_TRUST_PROXY="true" \
  STORAGE_LOCATIONS="s3" \
  STORAGE_S3_BUCKET="veribir-net-files" \
  STORAGE_S3_ROOT="dev-tamim" \
  STORAGE_S3_DRIVER="s3" \
  STORAGE_S3_KEY="your_s3_key" \
  STORAGE_S3_SECRET="your_s3_secret" \
  STORAGE_S3_ENDPOINT="your_s3_endpoint" \
  STORAGE_S3_REGION="your_s3_region"
```

`fly secrets set` triggers a rolling redeploy automatically. To stage multiple changes without
redeploying after each one, add `--stage` and finish with a plain `fly deploy`.

> **Tip:** values that aren't actually sensitive (`DB_CLIENT`, `CORS_ENABLED`, `IP_TRUST_PROXY`,
> `STORAGE_LOCATIONS`, `STORAGE_S3_BUCKET`, `STORAGE_S3_ROOT`, `STORAGE_S3_DRIVER`, `STORAGE_S3_REGION`,
> `PUBLIC_URL`) can be moved into a `[env]` block in `fly.toml` instead, so they're versioned and
> visible without a `fly secrets list`. Keep `SECRET`, `DB_CONNECTION_STRING`, `ADMIN_PASSWORD`,
> and the S3 key/secret as Fly secrets — never commit those.

### First-time provisioning (new instance only)

Skip this if you're deploying to the existing `dev-tamim` app.

1. Pick a new app name and update `app = '...'` in `fly.toml` (or run `fly apps create <name>`
   and point `fly.toml` at it).
2. Provision a Neon project and an S3-compatible bucket for the new instance.
3. Set secrets (see above) with the new instance's values.
4. Deploy:
   ```bash
   fly deploy
   ```
5. On first boot, Directus bootstraps the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` —
   those are only read once, on an empty database.

### Custom domain (optional)

```bash
fly certs create your-custom-domain.com
fly certs show your-custom-domain.com   # DNS records to add
```

Update `PUBLIC_URL` (and `CORS_ORIGIN` on the frontend side if this domain is user-facing) once the
cert is issued.

### Troubleshooting

```bash
fly logs                  # tail application logs
fly status                # machine state, health checks
fly ssh console           # shell into the running machine
fly secrets list          # confirm which secrets are set (values are hidden)
```

- **502 / connection refused right after a deploy**: the machine is still booting — check
  `fly logs` for the Directus bootstrap sequence.
- **Cold-start delay**: expected behaviour with `min_machines_running = 0`; raise it in
  `fly.toml` under `[http_service]` if the latency is a problem for editors.
- **`ECONNREFUSED` / DB errors**: verify `DB_CONNECTION_STRING` and that
  `DB_SSL__REJECT_UNAUTHORIZED="false"` is set — Neon requires SSL but its cert chain isn't in the
  base image's trust store.

### When do you actually need to redeploy?

| Change | Redeploy? |
|---|---|
| Directus schema (collections/fields/relations) via MCP or the admin UI | No — writes straight to Neon |
| Content/items (products, pages, etc.) | No — writes straight to Neon |
| File uploads | No — goes straight to S3 |
| Custom code in `extensions/` | **Yes** |
| `Dockerfile` / Directus image version bump | **Yes** |
| Environment variables (`fly secrets set`) | Automatic — Fly redeploys for you |
