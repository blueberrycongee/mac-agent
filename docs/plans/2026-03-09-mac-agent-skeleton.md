# mac-agent Skeleton Implementation Plan

> **Execution note:** Use `executing-plans` to implement this plan task-by-task, or another equivalent execution workflow supported by the current agent runtime.

**Goal:** Build an open-source-quality `mac-agent` repository skeleton for a local macOS desktop agent, with a minimal working CLI vertical slice and clean extension points for OpenAI computer-use integration.

**Architecture:** The repository uses TypeScript on Node.js with a small CLI entrypoint, a macOS adapter layer, and an agent/core layer that can later host OpenAI `computer` and higher-level tool orchestration. The first slice implements only honest, verifiable capabilities: environment checks, permission guidance, and focusing or launching a macOS app via system tools.

**Tech Stack:** TypeScript, Node.js, npm, Vitest, ESLint, Prettier, Commander

---

### Task 1: Initialize repository metadata and toolchain

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`

**Step 1: Create package metadata**

Define ESM TypeScript project metadata, scripts for build/lint/test/typecheck, and dependencies for CLI + testing.

**Step 2: Create TypeScript configs**

Add a strict development config and a build config that outputs `dist/`.

**Step 3: Create repo hygiene files**

Add `.gitignore`, `.editorconfig`, ESLint, and Prettier so the repository looks and behaves like a polished open-source project.

**Step 4: Install dependencies**

Run: `npm install`
Expected: install succeeds and lockfile is created.

**Step 5: Commit**

Run: `git add package.json package-lock.json tsconfig.json tsconfig.build.json .gitignore .editorconfig eslint.config.js .prettierrc.json && git commit -m "chore: initialize repository toolchain"`

### Task 2: Add the minimal working CLI vertical slice

**Files:**

- Create: `src/cli.ts`
- Create: `src/index.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/result.ts`
- Create: `src/macos/commands.ts`
- Create: `src/macos/apps.ts`
- Create: `src/macos/permissions.ts`
- Create: `src/macos/platform.ts`

**Step 1: Write failing tests for pure command-building behavior**

Cover app focus command construction, platform guards, and permission status formatting.

**Step 2: Run targeted tests and verify failure**

Run: `npm test -- --runInBand`
Expected: tests fail because implementation files do not exist yet.

**Step 3: Implement the smallest honest CLI**

Add commands that actually work on macOS:

- `mac-agent doctor`
- `mac-agent permissions`
- `mac-agent app focus <name>`

The app focus command should use `open -a` and AppleScript `activate`, and should fail loudly with actionable errors.

**Step 4: Run targeted tests again**

Run: `npm test`
Expected: tests pass.

**Step 5: Commit**

Run: `git add src tests && git commit -m "feat: add initial macOS CLI controls"`

### Task 3: Add project documentation and contributor-facing polish

**Files:**

- Create: `README.md`
- Create: `LICENSE`
- Create: `.github/workflows/ci.yml`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/pull_request_template.md`

**Step 1: Document scope honestly**

Write a README that explains current working capabilities, roadmap, safety model, and what is intentionally not implemented yet.

**Step 2: Add open-source polish**

Add MIT license, CI workflow, and basic GitHub community templates.

**Step 3: Run verification commands**

Run: `npm run lint && npm run typecheck && npm run build && npm test`
Expected: all commands pass.

**Step 4: Commit**

Run: `git add README.md LICENSE .github && git commit -m "docs: add open source project materials"`

### Task 4: Prepare remote publication

**Files:**

- Modify: `README.md`

**Step 1: Check GitHub CLI auth state**

Run: `gh auth status`
Expected: authenticated or a clear message that auth is required.

**Step 2: Create or attach remote**

If authenticated and user wants GitHub, run: `gh repo create ...` or `git remote add origin ...`

**Step 3: Push the repository**

Run: `git push -u origin main`
Expected: push succeeds.

**Step 4: Record final status**

If remote creation or push is blocked by missing auth or missing destination, report that clearly instead of implying success.
