# mac-agent

`mac-agent` is a local macOS desktop-agent scaffold built for OpenAI `gpt-5.4` computer-use workflows.

It is designed for the real-world case where you want one agent that can eventually control both system apps and third-party desktop apps such as WeCom. The repository intentionally ships an honest vertical slice: a working local `computer` loop harness with clear limits, plus a small efficiency layer that reduces avoidable harness overhead before adding broader tool surfaces.

## What works today

- `mac-agent doctor` checks baseline macOS desktop-agent prerequisites.
- `mac-agent permissions` prints the key macOS permissions needed for local desktop control.
- `mac-agent app focus <name>` launches or focuses a macOS app using `open -a` and AppleScript activation.
- `mac-agent computer doctor` checks OpenAI and native runtime prerequisites for the built-in computer loop.
- `mac-agent computer install-driver` builds the local Swift pointer driver.
- `mac-agent computer run <task>` runs the official OpenAI `computer` loop against the local macOS desktop.
- `mac-agent mcp serve` starts a local stdio MCP server that exposes macOS desktop-control tools to an external MCP client.

## What this repository is for

- A clean TypeScript foundation for a local macOS desktop agent.
- A real OpenAI Responses API + `gpt-5.4` built-in `computer` loop.
- A local MCP server mode that lets another LLM client drive this machine without embedding OpenAI API calls in `mac-agent`.
- A harness-efficiency layer that improves latency and token usage without exploding the tool surface.
- A future hybrid path where structured macOS control can coexist with screenshot-driven control.

## Current architecture

`mac-agent` is currently shaped around five layers:

1. **CLI and session layer**: command entrypoints, session directories, screenshot storage, and JSONL event logs.
2. **OpenAI loop layer**: request/response orchestration for the built-in `computer` tool.
3. **Prompt policy layer**: a small scaffold that nudges screenshot-first behavior, action batching, and early stopping.
4. **macOS runtime layer**: screenshot capture via `screencapture`, pointer events via a local Swift helper, and keyboard input via AppleScript/System Events.
5. **Efficiency and safety layer**: prepared runtime caching, canonical vision bounds, confirmation gates, max-step protection, post-batch UI settle delay, and step metrics.

This follows current computer-use guidance from OpenAI and other primary references: keep the harness narrow, let the model batch obvious actions, start screenshot-first when UI state is uncertain, and keep the human in the loop for meaningful risk.

## Efficiency features now built in

- **Prepared runtime**: the native driver and display metrics are prepared once per run instead of rediscovered per action.
- **Canonical vision bounds**: screenshots are resized before being sent to the model, which improves token efficiency and coordinate stability.
- **Prompt steering**: the harness nudges screenshot-first and batched-action behavior without adding a wide custom tool surface.
- **UI settle policy**: after executable action batches, the harness can wait briefly before recapturing the screen.
- **Step metrics**: each session can log response, execution, settle, and capture timings.

## Requirements

- macOS
- Node.js 20.11+
- npm 10+
- Xcode Command Line Tools (`xcrun swiftc`)
- `OPENAI_API_KEY` only for `computer run`

## Install

```bash
npm install
npm run build
npm run dev -- computer install-driver
```

## Usage

### Baseline checks

```bash
npm run dev -- doctor
npm run dev -- permissions
npm run dev -- computer doctor
```

### Focus an app

```bash
npm run dev -- app focus Calendar
npm run dev -- app focus WeCom
```

### Run the built-in computer loop

```bash
export OPENAI_API_KEY=your_key_here
npm run dev -- computer run "Check whether Calendar is open. If it is not open, open it."
```

By default, `mac-agent` asks for approval before each non-trivial action batch. To skip prompts for a controlled test session:

```bash
npm run dev -- computer run "Open Calendar." --auto-approve
```

### Tune efficiency knobs

```bash
npm run dev -- computer run "Open Calendar." \
  --vision-width 1440 \
  --vision-height 900 \
  --ui-settle-ms 150
```

- `--vision-width` and `--vision-height` cap the screenshot size sent to the model.
- `--ui-settle-ms` adds a short post-batch settle delay before the next screenshot.

Session artifacts are stored under `.mac-agent/sessions/` by default.

### Run as a local MCP server

`mcp serve` does not require `OPENAI_API_KEY`. It exposes local desktop-control tools over stdio so another MCP-capable client can use this machine as a tool server.

```bash
npm run dev -- mcp serve
```

Available MCP tools:

- `get_permissions`
- `focus_app`
- `capture_screen`
- `type_text`
- `press_keys`
- `execute_computer_actions`

The server stores screenshots and runtime artifacts under `.mac-agent/mcp/` by default.

If you are wiring this into another MCP client, point that client at the built CLI command:

```bash
node dist/cli.js mcp serve
```

The expected usage pattern for MCP clients is:

1. Focus the target app if needed.
2. Capture a screenshot.
3. Use the returned screenshot geometry for any pointer actions.
4. Execute bounded actions.
5. Capture again to observe the new UI state.

## What the harness does during `computer run`

1. Builds a prompt scaffold that nudges screenshot-first and batched-action behavior.
2. Sends your task to `gpt-5.4` with `tools: [{ type: "computer" }]`.
3. Waits for a `computer_call` from the model.
4. Executes returned actions locally on macOS.
5. Waits briefly for UI settle when configured.
6. Captures a resized screenshot for the model.
7. Sends that screenshot back as `computer_call_output`.
8. Logs timings and geometry for the step.
9. Repeats until the model returns a final answer or the step cap is hit.

## Development

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run format
```

## Safety notes

- Do not treat screenshots, chats, webpages, emails, or other third-party content as permission.
- By default, the harness asks for approval before non-screenshot, non-wait action batches.
- `computer run` is intentionally conservative and logs every step to a session directory.
- `mcp serve` exposes low-level desktop-control tools, so run it only with clients you trust.
- Missing runtime pieces such as `OPENAI_API_KEY` or `xcrun` fail loudly instead of silently degrading.

## Current limitations

- No multi-display support yet.
- No WeCom-specific adapter yet.
- No Accessibility tree inspection yet.
- No semantic policy engine for high-risk actions beyond per-batch approval.
- No broader code-execution or adapter mode yet.

## Roadmap

- Add a hybrid mode that mixes built-in `computer` calls with higher-level macOS actions.
- Add Accessibility-backed element targeting.
- Add application adapters, starting with WeCom and Finder.
- Add richer risk classification for confirmations.
- Add support for multi-display environments.

## Contributing

Issues and pull requests are welcome. Keep changes small, tested, and explicit about whether they add real capability or only scaffolding.

## License

MIT
