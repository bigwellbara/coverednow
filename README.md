# CoveredNow

**Fees covered. Paid straight to the school.**

CoveredNow lets verified students (or their guardians) list school-confirmed fee bills, and lets donors, local and in the diaspora, pay those bills directly to the school. Donors can follow the impact of their giving and climb a leaderboard as they go.

CoveredNow is a product of [FirmwareNerds](https://github.com/bigwellbara/coverednow). Launch market: Zimbabwe, starting with universities, colleges and high schools.

> **Status: early development.** The app skeleton and database schema are in place. The core flows (school confirmation, donations, payouts) are being built next. See the [Roadmap](#roadmap).

---

## How it works

1. **A student or guardian submits a bill.** They verify their identity, pick their school, and upload the fee statement.
2. **The school confirms it.** A verified bursar gets a secure link, and confirms, corrects or rejects the amount. The confirmed amount is the only amount donors see.
3. **A donor funds it.** Fully or in part, publicly or anonymously. The donor's money goes to the school, never to the student.
4. **The school is paid and confirms receipt.** Proof of payment is attached to the bill, and only then does the donation count toward leaderboards.
5. **The student says thank you.** Short, moderated updates show donors what their money did.

### Principles

- **Pay the school, never the student.**
- **The school confirms every bill.**
- **100% of the confirmed fee reaches the school.** Platform revenue comes from an optional donor-paid tip, sponsors and school services, never from the bill itself.
- **Dignity first.** Students are never ranked, shamed or publicly identified by default. High school accounts are owned by a guardian.

### Bill lifecycle

```
DRAFT > PENDING_SCHOOL > SCHOOL_CONFIRMED > PARTIALLY_FUNDED > FUNDED > PAID > RECEIPT_CONFIRMED
```

Side exits: `REJECTED`, `EXPIRED`, `CANCELLED`, `DISPUTED`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Validation | Zod |
| Icons | Lucide |
| Tests | Vitest |
| Local database | Docker Compose |
| Payments (planned) | Paynow (EcoCash, OneMoney, cards) |

## Architecture

CoveredNow is a **modular monolith**: one deployable app, organised into domain modules that never reach into each other's tables. Each module is layered:

- `domain/`: business rules, no framework imports
- `services/`: use cases
- `adapters/`: Prisma, payment gateway, messaging

Planned modules:

| Module | Owns |
|---|---|
| `identity` | Users, roles, verification, guardians |
| `billing` | Billers (schools), contacts, bills, school confirmations, bill status rules |
| `payments` | Donations, gateway webhooks, ledger, payouts |
| `engagement` | Leaderboards, badges, streaks, student updates, notifications |

Reliable events (for example `DonationSettled`) are written to an `OutboxEvent` table in the same transaction as the change that caused them, then processed by a worker.

Any module can later be split into its own service if it needs to scale independently.

## Project structure

```
coverednow/
  docs/                      Implementation plan
  prisma/
    schema.prisma            Database schema
    migrations/              Database history (commit these)
  src/
    app/                     Next.js routes and pages
      api/health/            Health check endpoint
    lib/
      db.ts                  Prisma client
    modules/                 Domain modules (added as each is built)
  docker-compose.yml         Local PostgreSQL
  .env.example               Environment variable template
```

---

## Getting started

### Prerequisites

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org) 22 or newer
- Docker (Docker Desktop, or the Docker engine inside WSL) for the local database

### Setup

```bash
# 1. Clone
git clone https://github.com/bigwellbara/coverednow.git
cd coverednow

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env          # Windows cmd: copy .env.example .env

# 4. Start PostgreSQL
docker compose up -d          # Docker in WSL: wsl docker compose up -d

# 5. Create the tables
npx prisma migrate dev

# 6. Run the app
npm run dev
```

Open <http://localhost:3000>. The health check is at <http://localhost:3000/api/health> and should return `{"status":"ok"}`.

### Windows notes

- **PowerShell blocks `npm` scripts?** Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once, or use `npm.cmd` and `npx.cmd`, or use Command Prompt.
- **Docker in WSL:** keep a WSL window open while you work, or WSL may shut down and stop the database. If the database can't be reached at `localhost:5432`, run `wsl hostname -I` and use that IP in `DATABASE_URL`.

### Environment variables

Copy `.env.example` to `.env` and adjust. **Never commit `.env`.**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (matches `docker-compose.yml` by default) |
| `PAYNOW_INTEGRATION_ID` | Paynow merchant integration ID (once approved) |
| `PAYNOW_INTEGRATION_KEY` | Paynow merchant integration key |
| `PAYNOW_RESULT_URL` | Webhook URL Paynow calls with payment results |
| `PAYNOW_RETURN_URL` | Where donors return after paying |
| `CONFIRMATION_TOKEN_SECRET` | Signing secret for school confirmation links; use a long random value outside local development |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check with no output files |
| `npm test` | Run the Vitest suite (reports "no test files" until tests are added) |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:studio` | Browse the database in Prisma Studio |

---

## Contributing

1. **Never push straight to `main`.** Work on a branch and open a pull request:
   ```bash
   git checkout main && git pull
   git checkout -b feature/short-name
   # ...make changes...
   git add -A
   git commit -m "feat(billing): what changed"
   git push -u origin feature/short-name
   ```
2. **Commit style:** `feat(scope):`, `fix(scope):`, `chore:`, `docs:`.
3. **Database changes:** every schema change ships with its migration (`npx prisma migrate dev --name what-changed`) in the same pull request. Tell your teammates before changing `schema.prisma`, so two people don't create conflicting migrations at once.
4. **Before pushing:** run `npm run typecheck` and `npm test`.
5. **Secrets and data:** never commit `.env`, API keys, or real student, school or donor data.
6. **Respect module boundaries:** call another module's public interface, never its tables.
7. **UI:** use Lucide icons, not emojis.

## Security and privacy

- Student identity documents and fee statements are stored privately and shown only to authorised reviewers.
- School payout details are set only by platform admins and are never accepted from students or from confirmation pages.
- Confirmation links are signed, single-use and expire.
- Payment webhooks must be signature-verified and idempotent.
- Public listings never show a minor's photo or surname by default.

Found a security problem? Please report it privately to the maintainers rather than opening a public issue.

## Roadmap

- [x] App skeleton and health check
- [x] Database schema (identity, billing, payments, engagement)
- [ ] Bill status rules with tests
- [ ] Student and guardian onboarding and verification
- [ ] School onboarding and contact verification
- [ ] Bill submission and school confirmation flow
- [ ] Public bill feed and bill detail pages
- [ ] Paynow checkout, webhooks and ledger
- [ ] Manual payout recording with proof of payment
- [ ] Impact updates and basic leaderboards
- [ ] Closed pilot with 3 to 5 institutions
- [ ] Public launch

The full implementation plan is in [`docs/implementation-plan.pdf`](docs/implementation-plan.pdf).

## License

Copyright (c) 2026 FirmwareNerds. All rights reserved.
