# CoveredNow

**Fees covered. Paid straight to the school.**

CoveredNow lets verified students (or their guardians) list school-confirmed fee bills, and lets donors, local and in the diaspora, pay those bills directly to the school. Donors can follow the impact of their giving and climb a leaderboard as they go.

CoveredNow is a product of [FirmwareNerds](https://github.com/bigwellbara/coverednow). Launch market: Zimbabwe, starting with universities, colleges and high schools.

> **Status: early development.** Sign-up, identity verification, school management, bill submission and school confirmation are in place. Donations and payouts are being built next. See the [Roadmap](#roadmap).

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
| Styling | Tailwind CSS |
| Auth | NextAuth v4, phone number and one-time code |
| WhatsApp | Baileys (unofficial client), for sign-in codes |
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
      billing/               Bill status rules, schools, contacts
      identity/              Accounts, sign-in, verification
  scripts/                   Operational scripts
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

Before the first run, replace the `change-me` values in `.env` with random secrets. Run this once per value:

```bash
node -p "require('crypto').randomBytes(32).toString('base64')"
```

Open <http://localhost:3000>. The health check is at <http://localhost:3000/api/health> and should return `{"status":"ok"}`.

### Signing in during development

By default, sign-in codes and bursar confirmation links are printed in the terminal running `npm run dev`, so you don't need WhatsApp to work on the app. A production build refuses to send them unless WhatsApp is set up.

For ready-made test accounts and schools, run:

```bash
npm run db:seed-test
```

| Number | Account |
|---|---|
| `0771000001` | Admin |
| `0771000002` | Student who hasn't started |
| `0771000003` | Guardian who hasn't started |
| `0771000004` | Student waiting in the review queue |
| `0771000005` | Student whose application was sent back |
| `0771000006` | Verified student |
| `0771000007` | Verified guardian |

The script only runs against a local database and with WhatsApp delivery off, because these numbers are made up and may belong to real people. Running it again leaves existing data alone and clears the code limits for these numbers, which helps if you see "Too many codes requested".

To make your own admin instead, run `npm run admin:create -- +263771234567 "Your Name"`. Admins manage schools at `/admin/schools` and review applications at `/admin/verifications`.

### Sending messages over WhatsApp

Sign-in codes and bursar confirmation links are sent through [Baileys](https://github.com/WhiskeySockets/Baileys), which connects as a linked device on an ordinary WhatsApp account.

```bash
# 1. Stop the app, then link the account that will send codes
npm run whatsapp:pair -- 263771234567

# 2. In .env, set MESSAGE_DELIVERY="whatsapp", then start the app again
npm run dev
```

Things to know:

- **Use a dedicated number, never a personal one.** Baileys is unofficial and against WhatsApp's terms, so WhatsApp can ban the number without warning. If it does, nobody can sign in until another number is linked.
- **It needs a long-running server and exactly one running instance.** It holds a live connection, so it won't work on serverless hosting such as Vercel, and two instances would knock each other off.
- **Keep `WHATSAPP_AUTH_DIR` private and backed up.** It is stored unencrypted and gives access to the linked account. Losing it means linking again.
- If the link is lost, the logs say so and sending fails until you run the pairing script again. Restarting the app isn't needed.

### Windows notes

- **PowerShell blocks `npm` scripts?** Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once, or use `npm.cmd` and `npx.cmd`, or use Command Prompt.
- **Docker in WSL:** keep a WSL window open while you work, or WSL may shut down and stop the database. The container restarts by itself the next time WSL starts. If the database can't be reached at `localhost:5432`, run `wsl hostname -I` and use that IP in `DATABASE_URL`.

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
| `NEXTAUTH_URL` | The app's public URL |
| `NEXTAUTH_SECRET` | Signs session cookies |
| `OTP_SECRET` | Protects stored sign-in codes and hashed IP addresses |
| `DOCUMENT_STORAGE_DIR` | Private folder for uploaded documents; must not be served by the web server |
| `DOCUMENT_ENCRYPTION_KEY` | Base64 key that decodes to 32 bytes. Back it up: losing it makes stored documents unreadable |
| `PAYOUT_ENCRYPTION_KEY` | Base64 key that decodes to 32 bytes, for school payout details. Back it up: losing it means re-entering them |
| `MESSAGE_DELIVERY` | Set to `whatsapp` to send sign-in codes and bursar links over WhatsApp |
| `WHATSAPP_AUTH_DIR` | Folder for the linked WhatsApp session; keep it private |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check with no output files |
| `npm test` | Run the Vitest suite |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run db:seed-test` | Create test accounts and schools for local development |
| `npm run admin:create` | Create an admin, or promote an existing user |
| `npm run whatsapp:pair` | Link the WhatsApp account that sends sign-in codes |

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
- [x] Bill status rules with tests
- [x] Student and guardian onboarding and verification
- [x] School onboarding and contact verification
- [x] Bill submission and school confirmation flow
- [ ] Public bill feed and bill detail pages
- [ ] Paynow checkout, webhooks and ledger
- [ ] Manual payout recording with proof of payment
- [ ] Impact updates and basic leaderboards
- [ ] Closed pilot with 3 to 5 institutions
- [ ] Public launch

The full implementation plan is in [`docs/implementation-plan.pdf`](docs/implementation-plan.pdf).

## License

Copyright (c) 2026 FirmwareNerds. All rights reserved.
