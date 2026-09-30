# AnemiaScan 🩸

Non-invasive anemia screening ecosystem. Estimate hemoglobin (g/dL) from a
smartphone photo of the lower eyelid or fingernail, then route moderate/severe
cases to a nearby hospital.

> **AnemiaScan is a screening aid, not a lab replacement.** Every result screen
> must carry that disclaimer.

## The three roles

| Role | Surface | What they do |
|---|---|---|
| **User** | Flutter app (offline-first) | Capture photo → on-device TFLite model → Hb estimate + severity + advice + nearby hospital. Optional login, local SQLite history. |
| **Hospital** | React web portal | See referrals, update case status, manage department / doctors / beds. |
| **Management / Admin** | React web panel | Full control: hospital & screening CRUD, dashboards, heat map, approvals, audit logs. |

## Repository layout

```
anemiscan/
├─ server/                     # Node.js + Express REST API
│  ├─ db/
│  │  ├─ schema.sql            # full PostgreSQL schema (ENUMs, triggers, views)
│  │  └─ seed.sql              # demo rows
│  ├─ scripts/
│  │  ├─ initDb.js             # create DB + apply schema (--seed to add demo data)
│  │  └─ seed.js               # insert demo accounts with hashed passwords
│  ├─ src/
│  │  ├─ config/               # env.js (all secrets) + db.js (pool)
│  │  ├─ middleware/           # auth/RBAC, validation, lockout, error handler
│  │  ├─ controllers/          # request/response layer
│  │  ├─ services/             # database logic
│  │  ├─ routes/               # auth (Stage 1) + admin/hospital/public (later stages)
│  │  ├─ utils/                # jwt, password, audit, ApiError
│  │  ├─ app.js                # Express app
│  │  └─ server.js             # entry point
│  └─ .env.example
├─ docs/
│  └─ ER-diagram.md            # data model + Mermaid ER diagram
└─ README.md
```

The React panels (`web-admin/`, `web-hospital/`) and the Flutter app
(`mobile/`) are added in Stages 2, 3 and 5.

## Quick start (Stage 1 backend)

```bash
cd server
cp .env.example .env          # then edit PG* values and JWT_SECRET

npm install
npm run db:init -- --seed     # create the DB, apply schema, load demo data
npm run dev                   # starts on http://localhost:4000
```

Check it is alive:

```bash
curl http://localhost:4000/health
```

Log in as the demo admin:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","identifier":"admin@anemiscan.in","password":"Admin@1234"}'
```

## API surface (Stage 1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/health` | public | liveness check |
| POST | `/api/auth/login` | public | login for all three roles |
| POST | `/api/auth/register/hospital` | public | hospital self-registration (needs approval) |
| POST | `/api/auth/register/user` | public | optional app account |
| GET  | `/api/auth/me` | any role | current account profile |

Admin, hospital and screening/stats endpoints are scaffolded and return
`501 Not implemented yet` until their stage is built.

## Security implemented in Stage 1

- JWT access tokens with a `role` claim; separate role gates per route.
- bcrypt password hashing (10 salt rounds) + password-strength policy.
- Per-account login lockout (5 failures → 15 min) plus a per-IP rate limit.
- `helmet` security headers, restricted CORS, JSON body-size limit.
- 100% parameterised SQL — no string-concatenated queries.
- Every login and (from Stage 2) every destructive action written to `audit_logs`.

## Build roadmap

- [x] **Stage 1** — project structure, PostgreSQL schema, Express backend, JWT auth + RBAC
- [ ] **Stage 2** — Admin web panel (dashboard, hospital CRUD + audit logs, screening table)
- [ ] **Stage 3** — Hospital portal (login, referral queue, status updates)
- [ ] **Stage 4** — AI model training + TFLite export (Colab notebook)
- [ ] **Stage 5** — Flutter mobile app (onboarding, camera guide, offline inference, history, hospital finder)
- [ ] **Stage 6** — final wiring, seed data, demo script, testing checklist
