# Web Workflow Automation Engine

Built for **Ship and Earn Africa: Apify × SCA BuildHer Hackathon 2026**

Give the system a website and a task. It discovers how to perform the task using Playwright, converts what it learns into a reusable workflow, executes it, and returns structured results. The workflow can be replayed with new inputs, and repaired automatically when the website changes.

## How it works

```
Task/Demonstration → Discovery → Workflow Graph → Compilation → Execution → Structured Results
```

- **Discovery** — Playwright opens the site and identifies the elements needed to complete the task (search, filters, product cards, pagination, etc.)
- **Workflow** — the discovered steps are represented as a directed graph (nodes = actions/states, edges = transitions)
- **Compilation** — the workflow graph is compiled into executable Playwright code
- **Replay** — a saved workflow can be run again with new input values, without rediscovering the site
- **Self-healing** — if a selector breaks after a site change, the system searches for a valid replacement, validates it, and continues

## Monorepo structure

```
apps/
  web/                 # Next.js frontend
  api/                 # Express backend
services/
  data/                # Python workflow/data processing
actor/                 # Apify Actor
packages/
  workflow-schema/     # Shared workflow definitions
  types/                # Shared TypeScript types
docs/                  # Architecture and API notes
```

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, React Flow, TanStack Query |
| Backend | Node.js, Express, TypeScript, Zod, Drizzle ORM |
| Database | Neon (PostgreSQL) |
| Automation | Playwright |
| Data layer | Python, Pydantic, NetworkX |
| Platform | Apify Actors + Apify SDK |
| AI | External LLM API (used only for natural-language interpretation and ambiguous repair cases — not the core execution engine) |

## Getting started

This project uses **pnpm workspaces**.

### Prerequisites

- Node.js (LTS)
- [pnpm](https://pnpm.io/installation)
- Python 3.10+ (for `services/data`)
- A [Neon](https://neon.tech) PostgreSQL database
- An [Apify](https://apify.com) account (for Actor deployment)

### Install

```bash
pnpm install
```

This installs dependencies for every workspace package at once.

### Environment variables

Each app that needs secrets (database URL, LLM API key, Apify token) should have its own `.env` file. Copy `.env.example` in the relevant app folder and fill in the values. **Never commit `.env` files.**

### Run the backend (`apps/api`)

```bash
pnpm --filter api dev
```

### Run the frontend (`apps/web`)

```bash
pnpm --filter web dev
```

### Database

```bash
pnpm --filter api db:generate   # generate migrations from the Drizzle schema
pnpm --filter api db:push       # push schema to Neon
```

### Playwright

Chromium only is needed for this project:

```bash
pnpm exec playwright install chromium
```

## Team

| Role | Owns |
|---|---|
| Frontend | Dashboard, task input, workflow graph visualization, run results, generated-code viewer |
| Backend | Express APIs, Playwright orchestration, workflow execution, Apify integration, database access |
| Data Engineer | Workflow/state representation, extraction logic, workflow compilation support |

## Status

🚧 Actively being built during the hackathon build period. See `docs/` for architecture and API notes as they're added.