# Collaborative Bamileke Dictionary

A simple contribution interface for translating a predefined French/Nufi word list into Bamileke and related languages.

## Setup

```powershell
npm install
npm run import:ready -- "C:\Users\tcham\Wokspace\Dictionnaire-Bamileke-Collaboratif\nufi_dictionary_transformed - Copy.xlsx"
npm run dev
```

The app stores predefined words and community contributions in `data/collaborative-dictionary.sqlite`.

## Environment

Set `DATABASE_URL` to your Neon pooled PostgreSQL connection string. Prefer the pooler host and `sslmode=verify-full` for deployment.

Admin access is controlled by environment variables:

- `ADMIN_EMAILS`: comma-separated list of emails allowed to use `/admin`
- `ADMIN_PASSWORD`: temporary admin login password
- `ADMIN_SESSION_SECRET`: long random value used to sign admin sessions
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials for admin sign-in
- `ADMIN_APP_URL`: public production origin, for example `https://bamileke-collab-dictionary.azurewebsites.net`

For production Google OAuth, add this authorized redirect URI in Google Cloud:

```text
https://bamileke-collab-dictionary.azurewebsites.net/api/admin/oauth/google/callback
```
