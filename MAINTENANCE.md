# Maintenance

## Local Development

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

The generated static files are in `frontend/dist`.

## Deployment

Upload `frontend/dist` to the website static hosting directory.

There is no backend process, PM2 service, local webhook server, or `/api` proxy required.

## Troubleshooting

- If a PayerMax request fails in the browser, check the website domain CORS allowlist.
- If a request signature fails, check the embedded demo merchant credentials in `frontend/src/services/payermaxClient.ts`.
- If callback/redirect pages appear blocked inside an iframe, it is usually browser security behavior around cross-origin or local-network navigation.
