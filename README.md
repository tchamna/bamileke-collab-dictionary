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
