# Securing AI Agents

Interactive reference architecture for securing AI agents across Microsoft Copilot, Copilot Studio,
Azure AI Foundry, third-party AI, Shadow AI and local agents — with agent-flow views, defense-in-depth
mapping and links to the supporting Microsoft Learn documentation.

> Architecture applicability only. A control shown here does not mean it is enabled in any specific tenant.
> Preview features are called out with their documented scope limits.

## Live site

Published with GitHub Pages: `https://<your-user>.github.io/secure-ai/`

## Run locally

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Deploy

Every push to `main` builds and deploys automatically through
`.github/workflows/deploy-pages.yml`. One-time setup: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

## Stack

React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · shadcn/ui
