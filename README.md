# NEU ORG

A mobile app and web dashboard for discovering, joining and following student organizations at the New Era University Main Campus.

- **Mobile app** (React Native / Expo): students and officers browse orgs, apply for membership, and see events and announcements.
- **Web dashboard** (React / Vite): officers manage their org and event posts; admins (OSAS) approve events and manage orgs and accounts.
- **Backend** (Supabase): auth, Postgres database with row-level security, file storage, and Edge Functions.

## Project structure

```
NEU-ORG/
├── apps/
│   ├── mobile/          Expo app (students + officers)
│   └── web/             React dashboard (officers + admins)
├── supabase/
│   ├── migrations/      Database changes (SQL), applied with "supabase db push"
│   └── scripts/         Seed script for the test accounts
├── package.json         Root scripts (seed:users)
└── .env.example         Template for the root .env (project owner only)
```

Each app is its own project with its own `package.json` and `node_modules`.

## What you need

- [Node.js](https://nodejs.org) 22 or newer
- [Git](https://git-scm.com)
- The **Expo Go** app on your Android phone, to run the mobile app
- The Supabase URL and publishable key. **Ask Russell** for them; they are never committed to GitHub.

## Setup

1. Clone the repo and install each app's packages:

   ```powershell
   git clone https://github.com/KyooRuss/NEU-ORG.git
   Set-Location NEU-ORG/apps/mobile
   npm install
   Set-Location ../web
   npm install
   Set-Location ../..
   ```

2. Create the two app `.env` files. In each folder, copy `.env.example` to a new file named `.env` and paste in the values Russell sent you.

   `apps/mobile/.env`

   ```
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

   `apps/web/.env`

   ```
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

   The values are the same in both files; only the prefix differs, because Expo only reads `EXPO_PUBLIC_` variables and Vite only reads `VITE_` ones.

## Running the apps

**Web dashboard**

```powershell
Set-Location apps/web
npm run dev
```

Open http://localhost:5173.

**Mobile app**

```powershell
Set-Location apps/mobile
npx expo start
```

Scan the QR code with Expo Go (your phone and laptop must be on the same Wi-Fi). If it can't connect, use `npx expo start --tunnel`. Press `w` for a quick preview in the browser, but always check finished screens on a phone.

## Test accounts

All three of us share one Supabase database, so everyone uses the same test accounts. Ask Russell for the passwords.

| Email | Role | Logs in to |
|---|---|---|
| `admin@neuorg.test` | admin | Web dashboard |
| `officer@neuorg.test` | officer | Web dashboard and mobile app |
| `student@neuorg.test` | student | Mobile app |

Students are blocked from the web dashboard, and admins are blocked from the mobile app.

## Team rules

**Keep secrets out of Git.** Never commit a `.env` file; `.gitignore` already blocks them. Share keys privately, not in GitHub issues or commits. The Supabase **secret key** and **database password** stay with the project owner and never go into the apps.

**Work on a branch, then open a Pull Request.**

```powershell
git checkout main
git pull
git checkout -b feature/org-directory
# ...work and commit...
git push -u origin feature/org-directory
```

Then open a Pull Request on GitHub and ask a groupmate to review it before merging. Name branches `feature/...` for new features and `fix/...` for bug fixes.

**Pull before you start working.** Run `git pull` on `main` at the start of each session. If someone added packages, run `npm install` in that app's folder.

**Write clear commit messages** that say what changed, for example `Add org directory screen with category filter`, not `update`.

**Install packages the right way.**

- Mobile: `npx expo install <package>` (not `npm install`), so versions match the Expo SDK.
- Web: `npm install <package>`.
- Commit both `package.json` and `package-lock.json`.

## Changing the database

Change tables, columns and security rules **only through migrations**, never by editing them in the Supabase Table Editor. Otherwise the change exists only in Supabase, and nobody else knows about it.

1. Create a migration file on your branch:

   ```powershell
   npx supabase migration new create_events
   ```

2. Write the SQL in the new file in `supabase/migrations/`. Every new table needs RLS enabled and policies, or the apps will get empty results.
3. Commit it and open a Pull Request.
4. After it's merged, **Russell** applies it to the shared database with `npx supabase db push`.

Adding test rows in the Supabase dashboard is fine; it's structural changes that need a migration.

## For the project owner

The root `.env` (copied from `.env.example`) holds the Supabase secret key, the database password and the test account passwords. It's used for:

```powershell
npm install               # once, for the seed script
npx supabase db push      # apply new migrations to the shared database (run this first)
npm run seed:users        # create or reset the demo organizations and accounts
```

`npm run seed:users` is safe to run again: it updates existing records instead of duplicating them, and puts the demo accounts back to their starting state. It creates:

| Account | Role | Password from `.env` | Notes |
|---|---|---|---|
| `admin@neuorg.test` | Admin | `SEED_ADMIN_PASSWORD` | |
| `officer@neuorg.test` | Officer | `SEED_OFFICER_PASSWORD` | President of Cybersecurity Alliance |
| `officer2@neuorg.test` | Officer | `SEED_OFFICER_PASSWORD` | President of Code Innovators Guild |
| `student@neuorg.test` – `student4@neuorg.test` | Student | `SEED_STUDENT_PASSWORD` | `student4` is suspended |
| `professor@neuorg.test`, `professor2@neuorg.test` | Professor (student access) | `SEED_PROFESSOR_PASSWORD`, or `SEED_STUDENT_PASSWORD` if it's empty | Professor numbers P0001 and P0002 |

It also creates three organizations if they don't exist. NEU Debate Society is left without a president, for demoing **Assign president**. If an organization already has a real president, the seeder leaves them in place and doesn't link the demo officer.

Real users will sign in with Google instead. They start as students, and an admin makes them a president under Users > Admin Officers.
