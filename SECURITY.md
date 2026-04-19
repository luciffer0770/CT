# Security model — Cycle Time Analyzer (static site)

This repository ships a **client-only** React app. Understanding what is and is not possible helps set expectations.

## What random visitors cannot do

- **They cannot delete or modify the website on GitHub.** The published HTML, JS, and assets are served read-only from GitHub Pages (or your CDN). Changing what *other people* see requires **write access to this Git repository** (or a supply-chain compromise of your build).
- **They cannot alter your production bundle in the browser** in a way that persists for other users; each visitor loads the same files from the server.

## What is still under the user’s control (by design)

- Anyone using the app in **their** browser can **clear site data**, **edit localStorage**, or **import a file**. That only affects **their** device. This is normal for local-first tools.
- **No authentication** means there is no server-side “owner” of data; backup is **Export JSON**.

## Hardening included in the app

- **Content-Security-Policy** (meta tag): restricts script, connect, frame, and object sources. GitHub Pages does not support custom HTTP response headers for arbitrary repos; meta CSP is the practical approach.
- **Strict JSON import validation** before project data is applied to the store.
- **No third-party analytics** in the default build (no external tracking requests).
- **CI**: lint, engine sanity tests, and production build must pass before deploy.

## Dependency scanning

- **Dependabot** is configured for `CT-Tool-cursor-audit-v3-prod-c01e/app`.
- `npm audit` may report issues in **xlsx** (SheetJS) with **no fix** in the community package; the library is loaded only when the user imports a spreadsheet, not on first paint. Consider migrating to a maintained fork or server-side conversion if your threat model requires it.

## GitHub Pages deployment

- Enable **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- The workflow sets **`VITE_BASE=/<repository>/`** so asset URLs match project site paths (`https://<user>.github.io/<repo>/`).

## If you need stronger guarantees

- **Branch protection** and **required reviews** on `main` prevent unauthorized changes to what gets deployed.
- For **audit trails, multi-user access control, or immutable records**, you need a **backend** and authentication — not something a static Pages site can provide by itself.
