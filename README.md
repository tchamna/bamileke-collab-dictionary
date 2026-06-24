# Collaborative Bamileke Dictionary

A simple contribution interface for translating a predefined French/Nufi word list into Bamileke and related languages.

## Setup

```powershell
npm install
npm run import:ready -- --dry-run "C:\Users\tcham\Wokspace\Dictionnaire-Bamileke-Collaboratif\nufi_dictionary_transformed - Current.xlsx"
npm run import:ready -- "C:\Users\tcham\Wokspace\Dictionnaire-Bamileke-Collaboratif\nufi_dictionary_transformed - Current.xlsx"
npm run verify:production -- https://bamileke-collab-dictionary.azurewebsites.net
npm run dev
```

The import is an upsert pipeline. It inserts new base words and updates existing French/English/Nufi references without deleting contributor translations.

Every real import creates a local JSON backup under `../db-backups` and then runs the GitHub Actions `postgres-backup.yml` workflow before changing the database. The GitHub workflow stores a compressed `pg_dump` as a downloadable Actions artifact. If either backup step fails, the import stops before any database write. Dry runs do not create backups.

## Environment

Set `DATABASE_URL` to your Neon pooled PostgreSQL connection string. Prefer the pooler host and `sslmode=verify-full` for deployment.

Admin access is controlled by environment variables:

- `ADMIN_EMAILS`: comma-separated list of emails allowed to use `/admin`
- `ADMIN_SESSION_SECRET`: long random value used to sign admin sessions
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials for admin sign-in
- `ADMIN_APP_URL`: public production origin, for example `https://bamileke-collab-dictionary.azurewebsites.net`

Admins create their own passwords after signing in with Google. Passwords are salted and hashed in PostgreSQL.

For production Google OAuth, add this authorized redirect URI in Google Cloud:

```text
https://bamileke-collab-dictionary.azurewebsites.net/api/admin/oauth/google/callback
```
