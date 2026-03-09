# Computer Loop Implementation Plan

> **Execution note:** Use `executing-plans` to implement this plan task-by-task, or another equivalent execution workflow supported by the current agent runtime.

**Goal:** Add a first-party-style OpenAI `computer` loop to `mac-agent`, backed by a local macOS action runtime and safe-by-default CLI commands.

**Architecture:** Implement a dependency-injected loop core, a native macOS driver for screenshot and pointer actions, AppleScript-backed keyboard execution, and a CLI command group that wires these together with logging and confirmations.

**Tech Stack:** TypeScript, Node.js, OpenAI SDK, Vitest, Swift, AppleScript, Commander

---

### Task 1: Add the OpenAI and computer-loop foundations

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/computer/types.ts`
- Create: `src/computer/protocol.ts`
- Create: `src/computer/coordinates.ts`
- Create: `tests/computer/protocol.test.ts`
- Create: `tests/computer/coordinates.test.ts`

**Step 1: Write failing tests**

Add tests for:

- extracting a `computer_call`
- extracting final output text
- building a `computer_call_output` payload
- mapping screenshot coordinates to display coordinates

**Step 2: Run targeted tests to verify failure**

Run: `npm test`
Expected: the new test files fail because the implementation does not exist yet.

**Step 3: Implement the minimal protocol and coordinate modules**

Add strict local types and parsing helpers without depending on the full SDK response type system.

**Step 4: Run targeted tests to verify pass**

Run: `npm test`
Expected: all protocol and coordinate tests pass.

**Step 5: Commit**

Run: `git add package.json package-lock.json src/computer tests/computer && git commit -m "feat: add computer loop foundations"`

### Task 2: Add the local macOS runtime driver

**Files:**

- Create: `native/mac_agent_driver.swift`
- Create: `src/macos/native-driver.ts`
- Create: `src/macos/keyboard.ts`
- Create: `src/computer/executor.ts`
- Create: `tests/computer/executor.test.ts`
- Create: `tests/macos/keyboard.test.ts`

**Step 1: Write failing tests**

Cover:

- routing supported action types to the correct local executor path
- keypress parsing for basic modifier chords
- screenshot/display coordinate scaling usage

**Step 2: Run targeted tests to verify failure**

Run: `npm test`
Expected: new tests fail because the runtime modules do not exist yet.

**Step 3: Implement the minimal runtime**

Add the checked-in Swift helper and TypeScript wrappers for build, screenshot, pointer actions, and keyboard actions.

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: executor and keyboard tests pass.

**Step 5: Commit**

Run: `git add native src/macos src/computer tests && git commit -m "feat: add local macOS computer runtime"`

### Task 3: Add the loop orchestrator, logging, and CLI wiring

**Files:**

- Create: `src/computer/session.ts`
- Create: `src/computer/approval.ts`
- Create: `src/computer/openai-client.ts`
- Create: `src/computer/loop.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Create: `tests/computer/loop.test.ts`

**Step 1: Write failing tests**

Add loop tests using fake OpenAI client, fake screen capture, and fake executor to verify:

- screenshot-first loop behavior
- action execution + follow-up screenshot behavior
- stopping on final output
- enforcing max steps

**Step 2: Run targeted tests to verify failure**

Run: `npm test`
Expected: loop tests fail before implementation.

**Step 3: Implement the loop and CLI**

Add:

- `computer doctor`
- `computer install-driver`
- `computer run <task>`

Wire the CLI to the loop core, confirmations, session logging, and OpenAI client wrapper.

**Step 4: Run tests and targeted manual checks**

Run:

- `npm test`
- `npm run dev -- computer doctor`
- `npm run dev -- computer install-driver`

Expected: tests pass and the doctor/install commands succeed on a configured macOS machine.

**Step 5: Commit**

Run: `git add src tests && git commit -m "feat: add computer use CLI harness"`

### Task 4: Document the new harness and verify the repository

**Files:**

- Modify: `README.md`
- Modify: `docs/plans/2026-03-09-computer-loop-design.md`
- Modify: `docs/plans/2026-03-09-computer-loop-implementation.md`

**Step 1: Update docs honestly**

Document:

- required environment variables
- required macOS permissions
- the safety model
- current limitations
- example commands

**Step 2: Run full repository verification**

Run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run format`

Expected: all commands pass.

**Step 3: Commit**

Run: `git add README.md docs/plans && git commit -m "docs: document computer use harness"`
