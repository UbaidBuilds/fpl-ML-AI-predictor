# FPL AI Predictor — Frontend

Next.js 16 app providing the UI for the FPL AI Predictor platform.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Framer Motion, shadcn/ui
- TanStack Query v5 for server state, Axios for HTTP

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/dashboard` | Gameweek overview and predictions |
| `/players` | Player browser with filtering |
| `/player/[id]` | Player detail with prediction |
| `/my-team` | Squad viewer (football pitch layout) |
| `/captain-picker` | Captaincy recommendations |
| `/compare` | Side-by-side player comparison |
| `/fixtures` | Fixture difficulty overview |

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

See the root [README](../README.md) for full project setup.
