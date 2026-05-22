# PayerMax Static Payment Demo

This project is a frontend-only PayerMax integration demo for website hosting.

## What Changed

- No Node/Express backend is required.
- Browser JavaScript builds and signs PayerMax requests directly.
- API request and response panels display the real PayerMax request body and response body.
- Standard acquiring, subscription debit, and pay-by-link demos continue to use the existing UI flow.

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Build static assets:

```bash
cd frontend
npm run build
```

Preview production build:

```bash
cd frontend
npm run preview
```

## Static Hosting

Deploy `frontend/dist` to the official website or any static hosting service.

PayerMax CORS must allow the website domain because requests are sent directly from the browser to PayerMax UAT endpoints.

## Important Security Note

The demo private key is embedded in frontend code so the website can run without a backend. This is acceptable only for UAT/demo presentation. Production merchant integrations should never expose private keys in browser code.
