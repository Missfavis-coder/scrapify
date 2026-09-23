# Product Requirements Document
## Web Workflow Automation Engine (working title)

Built for: Ship and Earn Africa — Apify × SCA BuildHer Hackathon 2026
Application deadline: Thursday, 17 September 2026, 11:59 PM WAT
Build window: ~1 week from hacking start to demo day

---

## 1. Problem Statement

Extracting structured, decision-ready information from websites — comparing prices, tracking listings, monitoring competitors, researching options — currently requires either manual work or custom-built scrapers that break the moment a site's layout changes. General AI browsing agents solve part of this, but they re-reason through the task every single time they run, which makes them slow and costly to run repeatedly (e.g. for monitoring/scheduled use cases).

Most people and small businesses don't have the engineering time or budget to build and maintain custom automation for occasional or recurring web tasks.

## 2. What We're Building

A user gives the system a website and a task, either by describing it in natural language or (stretch) demonstrating it once in a browser. The system:

1. Uses Playwright to **discover** the steps needed to complete the task on that site (navigate, search, filter, extract)
2. Converts what it learns into a **structured, reusable workflow** (a graph of actions, not a one-off script)
3. **Compiles** that workflow into executable Playwright code
4. **Executes** it and returns structured results
5. Can **replay** the same workflow with new input values (different query, filter, threshold) without rediscovering the site
6. (Stretch) Can be **scheduled** to run repeatedly (e.g. monitor a flight price, watch for new listings)
7. (Stretch) **Self-heals** if the target site's structure changes and a step breaks

The whole system is packaged and deployed as an Apify Actor, published on the Apify Store.

## 3. Competitive Landscape (checked on Apify Store)

We are not the first to combine "natural language + Playwright + structured output" on Apify. Closest existing Actors:

- **`solutionssmart/ai-web-task-runner`** — natural language task → Playwright automation → structured output, and exports a one-off reusable Playwright script from a successful run. Closest overlap to our "discover once, reuse" idea, but the "reuse" is a static script export, not a live re-runnable workflow inside a product.
- **`apify/ai-web-agent`** — natural language → browse/click/fill/extract via OpenAI API.
- **`apify/ai-web-scraper`** — markets "no hard-coded logic that breaks when a website changes" (always-AI-driven, not detect-and-repair).
- **`the.beast/workflow-orchestrator`** — natural language → AI decomposes into steps, chains existing Apify Actors together; explicitly advertises monitoring use cases (e.g. "Monitor Zillow for new listings under $500K").
- **`shelvick/stealth-browser-agent`** — natural language task → structured JSON, with anti-detection/proxy built in.

**None of these are consumer-facing products** — they are all raw, API-only Actors (send JSON, get JSON back). None have a visual interface, a workflow graph, saved/re-runnable workflows through a UI, visible self-healing, or a demonstration/teach-by-doing mode.

## 4. Differentiation Strategy

We do not claim to be first to the general idea. Our pitch: *"There are existing Actors that do AI-driven browser tasks — we're building the product layer on top: a visual, usable workflow builder with visible self-healing and reusable, schedulable workflows, not just another API you call blind."*

Concrete differentiators to build:

1. **Interactive correction on the workflow graph** — if discovery picks the wrong element, the user can click the node in the UI and manually correct it, instead of re-describing the whole task. No competitor Actor has a UI at all, so this is structurally unique to us.
2. **Visible cost/compute transparency per run** — show "0 AI calls, X seconds" on a replay vs. the cost of the original discovery run, to make the cheap-replay argument demonstrable rather than just claimed.
3. **Explicit "what changed" diff view** for monitoring runs — highlight exactly what changed between runs (e.g. price before/after), not just raw new output.
4. **Confidence-flagged self-healing** — repair attempts show a confidence score; low-confidence repairs are flagged "needs review" rather than silently guessed, which is both more honest and a good demo moment.

Priority for build time: (1) and (2) are cheap to add on top of UI work already planned and should be prioritized if time allows; (3) and (4) are dependent on monitoring/self-healing being built first.

## 5. MVP Scope — Must Have

The MVP proves one complete loop, on one demo site:

1. User enters a URL + a task description (text box only — no "Describe vs Demonstrate" toggle for MVP; demonstration mode is cut)
2. Playwright discovers the relevant elements (search, filters, fields to extract)
3. Discovery is represented as a workflow graph (can be a simple linear graph — no LOOP/CONDITION node types needed for MVP)
4. Workflow compiles to Playwright code and actually runs, returning structured results
5. The saved workflow can be re-run to prove replay works without rediscovering
6. Packaged as a working Apify Actor that runs standalone (not just from the frontend) — non-negotiable, since the hackathon requires Apify as a core component
7. **Apify Pay-Per-Event (PPE) monetization implemented and configured — mandatory hackathon requirement, not a stretch item.** The Actor must have PPE set up in the Apify Console and actual `Actor.charge()` calls in the code for at least the core chargeable events (see section 5a).

## 5a. Monetization Design (PPE)

Required, not optional, per hackathon rules. Proposed chargeable events, priced to cover the underlying compute cost of each (see TDD section 9 for cost notes) plus margin:

| Event name | Fires when | Rationale |
|---|---|---|
| `discovery_completed` | A new workflow is successfully discovered on a site | Highest-cost step (full browser session, possible LLM calls) — priced highest |
| `workflow_run` | A saved workflow is replayed | Cheap to run (no rediscovery), priced lower — this is the event that demonstrates the "cheap replay" differentiation story directly in the pricing itself |
| `repair_performed` (if self-healing is built) | Self-healing successfully repairs a broken step | Priced to reflect the extra LLM-assisted matching work involved |

Revenue split: 80% to the team, 20% to Apify (per Apify's PPE model). Profit = (0.8 × revenue) − platform costs, so event prices must be set to comfortably exceed the actual compute cost of that event, not just cover it exactly.

## 6. Explicitly Out of Scope for MVP

- User accounts / login / authentication of any kind (no "my workflows" scoped to a user — a single shared view of all workflows is fine for the demo)
- Authenticated browser sessions for sites requiring login
- Cross-site generalization (a workflow is discovered per-site; it does not transfer to a different website)
- Demonstration mode (teach by doing) — describe-only for MVP
- Structural workflow adaptation to a materially different task (only parameterized reuse — same workflow shape, different input values — is MVP; regenerating the workflow shape for a new task requires re-discovery and is a stretch case)

## 7. Stretch Features, in Priority Order (build only after MVP is solid)

1. Save workflow / list saved workflows
2. Scheduling (via Apify's native Schedules — recurring runs, e.g. hourly flight-price checks)
3. Self-healing (selector fails → inspect page → find candidate replacement → validate → continue, with confidence flagging)
4. Workflow monitoring "what changed" diff view + notification (webhook)
5. Interactive graph correction
6. Cost/compute transparency display
7. Authenticated sessions
8. Demonstration mode
9. Structural workflow adaptation, multi-site support, advanced semantic reasoning

## 8. User Interface

Single-page dashboard, top to bottom:

**Task input (top)**
- URL field
- Task description text box (plain English)
- "Run Discovery" button

**Workflow visualization (middle)**
- Live discovery status text while running
- Rendered workflow graph (React Flow) once discovery completes — nodes like NAVIGATE, SEARCH, FILTER, EXTRACT, connected by arrows
- (Stretch) clicking a node shows/edits its detail

**Run / results panel (bottom)**
- "Run Workflow" button
- Live step status while executing
- Structured results table
- "Run Again" button (proves replay)

**Optional, only if time allows**
- Generated Playwright code viewer
- Self-healing repair visualization (before/after)
- Cost transparency readout per run

No login screens, no account pages, no multi-page navigation.

## 9. Demo Site

Candidates under evaluation: an e-commerce site (Temu was considered, but flagged as high-risk due to aggressive anti-bot defenses — a less-defended e-commerce site is the safer fallback) and a flight booking site (also flagged as high-risk — heavy JS, multi-step search flows, anti-bot measures; likely to be described as a future use case rather than fully demoed unless a specific cooperative site is found during testing). Decision should be locked early and not changed once testing begins.

## 10. Team & Ownership

| Role | Owns |
|---|---|
| Backend (Becca) | Express API, workflow execution orchestration, Apify Actor integration, database access — familiar with Neon and Express, learning the rest of the stack as needed |
| Frontend | Dashboard UI, task input, workflow graph visualization (React Flow), results display — familiar with Next.js |
| Data Engineer | Discovery/automation logic in Python, workflow/state representation — familiar with Python |

## 11. Success Criteria for the Hackathon

- A judge can watch: task entered → discovery runs → workflow graph appears → execution runs → structured results appear → re-run proves replay, all live, on the chosen demo site
- The system runs as an actual deployed Apify Actor (Dataset output, not just a local demo)
- At least one stretch feature (ideally self-healing or monitoring) demonstrated, but not required if core loop isn't fully solid first
