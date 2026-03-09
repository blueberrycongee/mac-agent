# Computer Harness Efficiency Implementation Plan

> **Execution note:** Use `executing-plans` to implement this plan task-by-task, or another equivalent execution workflow supported by the current agent runtime.

**Goal:** Improve `mac-agent`'s built-in OpenAI `computer` harness so it manipulates the local macOS desktop more efficiently without adding a broad new tool surface.

**Architecture:** Keep the official built-in `computer` loop, but add a small efficiency layer: prompt steering, prepared runtime caching, canonical screenshot sizing, one post-batch settle delay, and richer step metrics.

**Tech Stack:** TypeScript, Node.js, OpenAI SDK, Swift, Vitest, Commander, macOS system tools

---

### Task 1: Add prompt and run-profile efficiency policies

**Files:**
- Create: `src/computer/prompt-policy.ts`
- Create: `src/computer/run-profile.ts`
- Create: `tests/computer/prompt-policy.test.ts`
- Create: `tests/computer/run-profile.test.ts`

**Step 1: Write failing tests**

Cover:
- prompt scaffold content for screenshot-first, batching, and stop behavior
- default run profile values for vision size and UI settle delay

**Step 2: Run tests to verify failure**

Run: `npm test`
Expected: new test files fail because the modules do not exist yet.

**Step 3: Implement minimal policy modules**

Add small, explicit helpers only.

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: prompt and run-profile tests pass.

**Step 5: Commit**

Run: `git add src/computer tests/computer docs/plans && git commit -m "feat: add computer efficiency policies"`

### Task 2: Add prepared runtime and canonical screenshot sizing

**Files:**
- Modify: `src/macos/native-driver.ts`
- Create: `tests/macos/native-driver.test.ts`

**Step 1: Write failing tests**

Cover:
- prepared runtime handle shape
- no repeated rebuild checks when a prepared handle is reused
- screenshot resize decision behavior

**Step 2: Run tests to verify failure**

Run: `npm test`
Expected: the new tests fail until the runtime changes are implemented.

**Step 3: Implement the prepared runtime**

Build the native driver once, cache display metrics once, and support resized model-visible screenshots.

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: new runtime tests pass.

**Step 5: Commit**

Run: `git add src/macos tests/macos && git commit -m "feat: optimize computer runtime preparation"`

### Task 3: Add settle-delay handling and metrics to the loop

**Files:**
- Create: `src/computer/metrics.ts`
- Modify: `src/computer/loop.ts`
- Modify: `src/computer/session.ts`
- Create: `tests/computer/metrics.test.ts`
- Modify: `tests/computer/loop.test.ts`

**Step 1: Write failing tests**

Cover:
- settle delay only after non-screenshot action batches
- metric event creation for response, execution, capture, and settle timings

**Step 2: Run tests to verify failure**

Run: `npm test`
Expected: loop or metric tests fail before implementation.

**Step 3: Implement minimal loop instrumentation**

Add timing measurements and a configurable post-batch settle delay.

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: loop and metrics tests pass.

**Step 5: Commit**

Run: `git add src/computer tests/computer && git commit -m "feat: instrument computer loop efficiency"`

### Task 4: Wire the efficient defaults into the CLI and docs

**Files:**
- Modify: `src/cli.ts`
- Modify: `README.md`
- Modify: `docs/plans/2026-03-09-computer-efficiency-design.md`
- Modify: `docs/plans/2026-03-09-computer-efficiency-implementation.md`

**Step 1: Update CLI behavior**

Add the minimal new flags and use the prompt/run-profile/runtime helpers in `computer run`.

**Step 2: Update docs honestly**

Explain:
- why the harness downsizes screenshots
- how prompt steering works
- what `--vision-width`, `--vision-height`, and `--ui-settle-ms` do

**Step 3: Run full verification**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run format`
- `npm run dev -- computer install-driver`
- `npm run dev -- computer doctor`

Expected: all repository checks pass, install-driver succeeds, and doctor reports actual environment state.

**Step 4: Commit**

Run: `git add src/cli.ts README.md docs/plans && git commit -m "docs: document computer efficiency improvements"`
