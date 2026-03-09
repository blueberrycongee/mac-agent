# mac-agent

`mac-agent` is a local macOS desktop-agent scaffold built for OpenAI `gpt-5.4` computer-use workflows.

It is designed for the real-world case where you want one agent that can eventually control both system apps and third-party desktop apps such as WeCom. The repository intentionally ships an honest vertical slice: a working local `computer` loop harness with clear limits, instead of pretending the whole desktop agent is already finished.

## What works today

- `mac-agent doctor` checks baseline macOS desktop-agent prerequisites.
- `mac-agent permissions` prints the key macOS permissions needed for local desktop control.
- `mac-agent app focus <name>` launches or focuses a macOS app using `open -a` and AppleScript activation.
- `mac-agent computer doctor` checks OpenAI and native runtime prerequisites for the built-in computer loop.
- `mac-agent computer install-driver` builds the local Swift pointer driver.
- `mac-agent computer run <task>` runs the official OpenAI `computer` loop against the local macOS desktop.

## What this repository is for

- A clean TypeScript foundation for a local macOS desktop agent.
- A real OpenAI Responses API + `gpt-5.4` built-in `computer` loop.
- A hybrid future path where structured macOS control can coexist with screenshot-driven control.

## Current architecture

`mac-agent` is currently shaped around four layers:

1. **CLI and session layer**: command entrypoints, session directories, screenshot storage, and JSONL event logs.
2. **OpenAI loop layer**: request/response orchestration for the built-in `computer` tool.
3. **macOS runtime layer**: screenshot capture via `screencapture`, pointer events via a local Swift helper, and keyboard input via AppleScript/System Events.
4. **Safety layer**: confirmation gates, max-step protection, and loud failures for missing runtime requirements.

This follows OpenAI's current `computer use` guidance: keep a human in the loop for risky actions, treat on-screen content as untrusted input, and keep the harness narrow before layering on more automation.

## Requirements

- macOS
- Node.js 20.11+
- npm 10+
- Xcode Command Line Tools (`xcrun swiftc`)
- `OPENAI_API_KEY` for `computer run`

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

Session artifacts are stored under `.mac-agent/sessions/` by default.

## What the harness does during `computer run`

1. Sends your task to `gpt-5.4` with `tools: [{ type: "computer" }]`.
2. Waits for a `computer_call` from the model.
3. Executes returned actions locally on macOS.
4. Captures a fresh screenshot.
5. Sends that screenshot back as `computer_call_output`.
6. Repeats until the model returns a final answer or the step cap is hit.

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
- Missing runtime pieces such as `OPENAI_API_KEY` or `xcrun` fail loudly instead of silently degrading.

## Current limitations

- No multi-display support yet.
- No WeCom-specific adapter yet.
- No Accessibility tree inspection yet.
- No semantic policy engine for high-risk actions beyond per-batch approval.
- The loop currently assumes the model gets screenshot context before attempting executable UI actions.

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
