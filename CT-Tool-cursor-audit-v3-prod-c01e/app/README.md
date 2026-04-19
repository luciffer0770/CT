# Cycle Time Analyzer — Industrial Edition

Desktop-only React web application for manufacturing engineers to analyze, optimize, and simulate production cycle time. Designed to feel like a Bosch / Siemens internal MES/SCADA tool — data-dense, engineering-first, zero ornament.

## Features

### Core engine
- DAG-based scheduling with **parallel `groupId`** (shared start, group end = max member end).
- **Critical path** walk + **bottleneck** identification (longest step on the critical path).
- **Wait / slack** calculation per step.
- **Cycle detection** + safe auto-break so authoring a loop never hangs.
- Local-only persistence with **undo / redo** (50-step history), **version control**, **multi-line snapshots**.
- **Hash routing** — browser back/forward and deep-link to any page.

### Pages
- **Dashboard** — KPI cards with sparkline trends, OEE cluster (Availability × Performance × Quality), live Gantt preview, bottleneck summary, activity feed.
- **Cycle Builder** — 3-column workspace with draggable step cards, inline-edit fields, Step Inspector (sliders, station, variability, **Muda / Mura / Muri** tagging, notes), smart next-step suggestions, validation warnings, **bulk-select toolbar** (batch-delete, batch-assign station, ±5 s nudges), Excel / CSV import, **project JSON import/export**, template download.
- **Schedule** (Gantt View) — three display modes:
  - **Gantt** (bars, dependency arrows, wait-severity heatmap, tick density)
  - **Swimlane** (grouped by station)
  - **DAG** (layered process-flow graph, clickable nodes)
  - Export as **SVG** or **PNG**.
- **Analytics** — **Pareto (80/20)**, **Yamazumi** (load per station vs takt), bottleneck contribution, VA/NVA donut, step impact, station balance, variation (min/avg/max/σ), waste tally (Muda/Mura/Muri), auto line-balance.
- **Simulation** — side-by-side BEFORE/AFTER Gantt, per-step machine/operator/setup sliders, what-if remove, **Monte-Carlo 1 000-trial** run using per-step variability, auto-balance, apply + save.
- **Industrial Tools** — **Takt calculator** (available time ÷ demand), **cost per unit** (labour + machine rate), **Kanban bin calculator** (reorder sizing), **SMED wizard** (split setup into internal / external so external is masked behind the previous cycle), 80/20 summary table.
- **Reports** — paper-style preview, KPI tiles, step-breakdown table, Gantt snapshot. PDF (jsPDF), browser Print (dedicated print CSS), Excel export.
- **Settings** — units/line/shift/refresh, theme (light/dark), accent, compact density, version control, multi-line comparison, pre-built process template library, labour/machine rates, Kanban defaults, Danger-zone full reset.

### Global productivity
- **Command palette** (Cmd / Ctrl + K) — navigation, step search, save, undo/redo, theme toggle, JSON export.
- **Undo** (Cmd/Ctrl + Z) and **redo** (Cmd/Ctrl + Shift + Z) for every mutation.
- **g d/b/g/a/s/r/t/,** jumps between pages (Vim-style).
- **?** opens shortcut help.
- **N** on the Cycle Builder adds a new step instantly.

## Stack
- React 19 + Vite (rolldown)
- Zustand + localStorage (with quota-error surfacing)
- SheetJS (`xlsx`) — **lazy-loaded on first use**
- jsPDF + jspdf-autotable — **lazy-loaded on first use**
- System fonts only — no external requests on first paint.

## Production essentials

- **Error boundary** wraps the app and every page, with a friendly recovery screen (Continue / Reload / Reset storage) that never trashes data.
- **Offline detection** banner.
- **SEO + Open Graph + PWA manifest** + installable icon.
- **SPA 404.html** emitted by the workflow so deep-links work on Pages.
- **Code split** — main bundle is 156 kB; Excel and PDF chunks load only when the user exports.
- **Storage quota warnings** surfaced as toasts if local-storage fills up.
- **Build metadata** (`__APP_VERSION__`, `__APP_BUILD__`) visible on the Settings → About card.
- **Profile** (name, initials, role, email, avatar colour) — drives sidebar, activity feed, and PDF report author line.

## Run locally

```bash
npm install
npm run dev
npm run build
npm run preview
```

## GitHub Pages deployment

A workflow at `.github/workflows/deploy-pages.yml` builds and deploys `app/` to GitHub Pages on every push to `main`. Published at `https://<user>.github.io/<repo>/`.
