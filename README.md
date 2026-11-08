# Nutri

A nutrition tracking mobile app (React Native, Android first). Log what you eat by scanning barcodes (Open Food Facts), searching the Japanese food composition table (MEXT) or chain restaurant menus, or photographing a product label. Track daily totals against goals and review weekly and monthly charts.

Japanese version: [README.ja.md](README.ja.md) · Design documents: [Docs/](Docs/)

## What is in this repository

| Directory | Contents                                                                  |
| --------- | ------------------------------------------------------------------------- |
| `App`     | React Native (Expo) app                                                   |
| `Server`  | Cloudflare Worker: chain menus, not-found requests, Open Food Facts relay |
| `Shared`  | Types, Zod schemas and text normalization shared by `App` and `Server`    |
| `Docs`    | Requirements and design documents (English primary, `*.ja.md` Japanese)   |

The server costs nothing to run (Cloudflare free tier). Photo reading uses the user's own OpenAI API key, which is stored only on their device.

## Setup (first time)

Requirements: Node.js 22+ and pnpm 10+.

```bash
git clone <this repository>
cd <repository>
pnpm install

# Server: create the local database and start the worker
cd Server
pnpm migrate:local
cp .dev.vars.example .dev.vars        # optional: OFF_PASSWORD for the Open Food Facts relay
pnpm dev                              # http://localhost:8787

# App (in another terminal)
cd App
cp .env.example .env                  # set EXPO_PUBLIC_SERVER_URL (use your PC's LAN IP for a real phone)
pnpm start
```

Press `a` in the Expo terminal to open an Android emulator, or scan the QR code with a development build. `pnpm web` opens a browser version that is handy for debugging (the browser needs cross-origin isolation for expo-sqlite; Metro's dev server alone does not send those headers, so put a proxy that adds `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` in front of it).

## Running again

```bash
cd Server && pnpm dev     # worker
cd App && pnpm start      # app
```

## Important commands

| Command                                   | Where    | What it does                                                              |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `pnpm test`                               | root     | Run all tests (Shared, Server, App)                                       |
| `pnpm typecheck`                          | root     | Type-check all packages                                                   |
| `pnpm format`                             | root     | Format everything with Prettier                                           |
| `pnpm build:mext [file.xlsx]`             | `App`    | Regenerate `assets/Mext/MextFoods.json` from the official MEXT Excel file |
| `pnpm requests:export out.csv [--remote]` | `Server` | Export open not-found requests, most requested first                      |
| `pnpm menus:import menus.csv [--remote]`  | `Server` | Register researched menu items and resolve matching requests              |
| `pnpm migrate:remote`                     | `Server` | Apply database migrations to the deployed D1 database                     |

## Developer batch for chain menus

1. `pnpm requests:export open.csv --remote` lists what users looked for and did not find.
2. Research the nutrition values (per serving) and write them to a CSV with the columns `chain, aliases, name, servingG, energyKcal, proteinG, fatG, carbohydrateG, fiberG, saltG, sourceUrl`.
3. `pnpm menus:import menus.csv --remote` registers them. Apps pick the new data up on their next sync.

## Deploying the server

```bash
cd Server
pnpm exec wrangler d1 create nutri-db      # copy the database_id into wrangler.toml
pnpm migrate:remote
pnpm exec wrangler secret put OFF_PASSWORD # shared Open Food Facts account password
# set OFF_USER_ID in wrangler.toml [vars]
pnpm deploy
```

Then set `EXPO_PUBLIC_SERVER_URL` in `App/.env` to the deployed URL.

## Data sources

- Standard Tables of Food Composition in Japan (8th revised, Supplement 2023), MEXT.
- Open Food Facts (ODbL). Contributions go through the shared app account.
