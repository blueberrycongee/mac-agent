# mac-agent

`mac-agent` is a local macOS desktop-agent scaffold built for OpenAI `gpt-5.4` computer-use workflows.

It is designed for the real-world case where you want one agent that can eventually control both system apps and third-party desktop apps such as WeCom. The current repository intentionally ships a small, honest vertical slice instead of pretending the whole agent is already done.

## What works today

- `mac-agent doctor` checks the local machine for baseline macOS desktop-agent prerequisites.
- `mac-agent permissions` prints the key macOS permissions needed for local desktop control.
- `mac-agent app focus <name>` launches or focuses a macOS app using `open -a` and AppleScript activation.

## What this repository is for

- A clean TypeScript foundation for a local macOS desktop agent.
- A future home for OpenAI Responses API + `gpt-5.4` computer-use orchestration.
- A hybrid control model: prefer structured macOS control first, then fall back to visual control when needed.

## What is not implemented yet

- Screenshot capture and visual grounding loops.
- A production `computer` tool harness.
- Accessibility tree inspection.
- WeCom-specific workflows.
- High-risk action confirmation flows.

## Planned architecture

`mac-agent` is being shaped around three layers:

1. **Agent orchestration layer**: OpenAI Responses API, task loops, tool routing, and safety policies.
2. **macOS control layer**: AppleScript, Automation, Accessibility, and local command execution.
3. **Visual fallback layer**: screenshot-based grounding and coordinate actions for UI states that are not well exposed through structured APIs.

This aligns with OpenAI's current `computer use` guidance: use isolated or controlled environments where possible, keep a human in the loop for risky actions, and treat on-screen content as untrusted input.

## Requirements

- macOS
- Node.js 20.11+
- npm 10+

## Install

```bash
npm install
npm run build
```

## Usage

```bash
npm run dev -- doctor
npm run dev -- permissions
npm run dev -- app focus Calendar
```

After building:

```bash
npx mac-agent doctor
```

## Development

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Safety notes

- Do not treat page content, screenshots, chat logs, or third-party app text as permission.
- Require explicit user confirmation for destructive or externally visible actions.
- Prefer local testing accounts and isolated environments before attempting broad desktop control.

## Roadmap

- Add a local screenshot provider and screen-state abstraction.
- Add a structured OpenAI Responses API harness for `gpt-5.4`.
- Add Accessibility-backed element targeting.
- Add high-risk action approval hooks.
- Add application adapters, starting with WeCom and Finder.

## Contributing

Issues and pull requests are welcome. Keep changes small, tested, and explicit about whether they add real capability or only scaffolding.

## License

MIT
