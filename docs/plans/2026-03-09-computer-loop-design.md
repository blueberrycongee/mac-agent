# mac-agent Computer Loop Design

## Goal

Add the first real OpenAI `gpt-5.4` computer-use harness to `mac-agent` using the official built-in `computer` tool pattern. The first version should be honest, locally runnable on macOS, and safe by default.

## Chosen approach

This design follows OpenAI's built-in `computer` loop instead of starting with a wide custom tool surface.

1. Send a plain-language task to `gpt-5.4` with `tools: [{ type: "computer" }]`.
2. Read any returned `computer_call` action batch.
3. Execute the action batch locally on macOS.
4. Capture a new screenshot and send it back as `computer_call_output`.
5. Repeat until the model stops returning `computer_call`.

The local harness adds only a thin safety and observability layer:

- explicit environment checks
- session logging
- batch approval by default
- deterministic coordinate mapping
- loud failures when required runtime pieces are missing

## Why this approach

This is the closest match to the official OpenAI guidance and keeps the first implementation narrow. It avoids a premature explosion of custom tools while still leaving room to add higher-level adapters later.

Compared with a custom-tool-first design, this approach has a smaller product surface and better matches the model's native training for `computer` use. Compared with a pure demo, it adds enough project structure to remain useful as a real open-source base.

## Architecture

The implementation is split into five layers.

### 1. CLI layer

Add a `computer` command group to the existing CLI.

- `mac-agent computer doctor`
- `mac-agent computer install-driver`
- `mac-agent computer run <task>`

### 2. OpenAI loop layer

A dedicated loop module owns the official request/response cycle.

Responsibilities:

- create the first `responses.create` request
- detect `computer_call` items
- send `computer_call_output` follow-ups
- stop on final non-tool output
- cap runaway loops with a max-step limit

### 3. Screen and action layer

A local macOS runtime adapter provides:

- full-screen capture via `screencapture`
- coordinate normalization between screenshot pixels and display points
- action execution for official action types

The first version supports:

- `click`
- `double_click`
- `move`
- `drag`
- `scroll`
- `type`
- `keypress`
- `wait`
- `screenshot` (handled as capture, not an OS-side action)

### 4. Native driver layer

Because macOS does not expose reliable coordinate mouse control directly through Node.js alone, the repository includes a small checked-in Swift helper.

The helper handles:

- display metrics
- mouse move/click/double-click/drag
- scroll wheel events

Keyboard typing and keypress chords are executed through AppleScript/System Events from the TypeScript layer, because that path is smaller and easier to audit for the first version.

### 5. Safety and logging layer

The first version is safe by default.

- action batches require approval unless `--auto-approve` is set
- every step is logged to a timestamped session directory
- screenshots and action metadata are persisted for debugging
- missing permissions or missing toolchain pieces fail loudly

## Data flow

1. User runs `mac-agent computer run "...task..."`.
2. The harness ensures the native driver exists.
3. The harness sends the first OpenAI request.
4. If the model returns a `computer_call`, the harness logs it.
5. If the batch contains non-screenshot actions and approval is enabled, the user is prompted once for that batch.
6. The harness executes actions in order.
7. The harness captures a fresh screenshot.
8. The screenshot is logged and returned as `computer_call_output`.
9. The loop continues until the model returns a final answer.

## Error handling

The harness must fail honestly.

- missing `OPENAI_API_KEY` -> actionable configuration error
- unsupported platform -> explicit macOS-only error
- missing `swiftc` -> actionable install error for Xcode Command Line Tools
- native driver build failure -> surface compiler stderr
- unsupported keypress or malformed action -> explicit runtime error with logged action payload
- max-step exhaustion -> explicit loop-limit error with session path

## Testing strategy

The first version uses TDD for pure logic and the dependency-injected loop.

Unit tests cover:

- extracting `computer_call` items from API-like responses
- building `computer_call_output` payloads
- coordinate mapping from screenshot pixels to display points
- routing supported action types to the right local executor
- loop orchestration with mocked OpenAI client, screenshot provider, and executor

Manual verification covers:

- driver build command
- `computer doctor`
- `computer install-driver`
- CLI argument parsing
- a non-destructive local run only if credentials are available

## Out of scope for this slice

- WeCom-specific workflows
- Accessibility tree inspection
- multi-display support
- OCR or text-targeted clicking
- autonomous confirmation policies based on semantic risk detection
- hosted browser or VM environments

## Follow-up direction

Once this slice works, the next sensible layer is a hybrid mode that can mix the built-in `computer` loop with higher-level macOS actions such as app focusing and app-specific adapters.
