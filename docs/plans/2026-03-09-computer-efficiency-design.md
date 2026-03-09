# mac-agent Computer Harness Efficiency Design

## Assumption

The user asked for a direct design-and-execute workflow without intermediate approval. This design therefore assumes the current priority order is:

1. reduce end-to-end task latency
2. reduce token and screenshot overhead
3. improve success rate by reducing harness-caused mistakes
4. preserve the existing safe-by-default behavior

## Research basis

This design is based on current primary-source guidance and reference implementations:

- OpenAI Computer use guide
- OpenAI CUA sample app
- OpenAI Operator system card
- Anthropic computer use docs and reference implementation

The repeated themes across those sources are consistent:

- keep the harness narrow at first
- prefer screenshot-first when state is uncertain
- let the model batch actions when possible
- keep humans in the loop for meaningful risk
- use a stable display environment
- add observability before adding more surface area

## Problem statement

`mac-agent` now has the minimum built-in `computer` loop, but it is not yet harness-efficient.

The current bottlenecks are mostly in the harness itself:

- screenshots are sent at raw screen resolution
- native driver preparation is checked repeatedly during a run
- display metrics are recomputed repeatedly
- the prompt does not actively steer the model toward screenshot-first and action batching behavior
- the session log captures events but not enough timing data to explain slowness
- the harness captures screenshots immediately after actions without a configurable settle policy

These issues waste time or tokens before the model itself becomes the limiting factor.

## Approaches considered

### Approach A: Add more custom tools and app adapters now

Examples would include app-specific tools, OCR helpers, text clicking helpers, or Accessibility-first adapters.

**Pros**

- can reduce turns for selected applications
- can outperform raw computer use on highly structured workflows

**Cons**

- grows the tool surface quickly
- increases tool-selection complexity
- moves the project away from the official built-in `computer` path too early
- risks masking harness inefficiencies with custom tooling

**Decision:** not now.

### Approach B: Optimize the built-in `computer` harness itself

Keep the current official OpenAI path, but improve the harness around it.

**Pros**

- directly addresses latency and token waste
- stays aligned with OpenAI's built-in `computer` loop
- improves all future tasks, not only app-specific ones
- does not require a wider tool surface

**Cons**

- still limited by screenshot-based interaction
- does not solve app-specific workflows on its own

**Decision:** recommended and selected.

### Approach C: Move immediately to a hybrid code-execution or adapter mode

Use a richer orchestration layer right away, mixing the built-in `computer` tool with structured helper operations.

**Pros**

- potentially faster for known workflows
- good long-term architecture

**Cons**

- premature for this stage
- introduces more moving parts before the current bottlenecks are measured
- harder to attribute improvements to the right layer

**Decision:** defer until the built-in harness is efficient and measurable.

## Selected design

The selected design is a **thin efficiency layer on top of the current built-in `computer` loop**.

### 1. Canonical model screenshot sizing

The harness should send a screenshot that is stable in size and cheaper in tokens than the raw retina capture.

Implementation direction:

- capture the real desktop screenshot locally
- resize it before sending to the model
- default to a canonical model-visible size near OpenAI's recommended desktop sizes
- preserve the mapping from model-visible pixels to actual display points

Rationale:

- OpenAI explicitly notes strong results around 1440x900 and 1600x900 for desktop computer use
- stable image size improves coordinate predictability and token efficiency

### 2. Warm runtime preparation

The harness should prepare and cache runtime facts once per session instead of rediscovering them on each action.

Implementation direction:

- build or validate the native driver once at session start
- resolve display metrics once per run
- create a prepared runtime handle that pointer execution and screenshot capture both reuse

Rationale:

- repeated driver checks and display probes add avoidable local latency
- warming the runtime is a harness optimization, not a new tool

### 3. Prompt-level action policy for efficiency

The harness should shape the task prompt to better match good computer-use behavior.

Implementation direction:

- prepend a small instruction scaffold to the user's task
- tell the model to request a screenshot first when UI state is uncertain
- tell the model to batch obvious consecutive actions when safe
- tell the model to minimize unnecessary waits and stop as soon as the task is complete

Rationale:

- OpenAI notes that screenshot-first is often the right opening move when UI state varies
- both OpenAI and Anthropic examples benefit from batched actions
- this improves behavior without adding a new tool surface

### 4. UI settle policy after action batches

The harness should allow the UI a short, configurable time to settle after a mutating batch before taking the next screenshot.

Implementation direction:

- add one post-batch settle delay, not arbitrary per-action sleeps everywhere
- default to a small value suitable for desktop UIs
- keep the current explicit `wait` action support

Rationale:

- Anthropic's computer-use references explicitly recommend action delays
- a single post-batch delay improves stability with minimal latency cost

### 5. Session metrics for optimization

The harness should measure enough to explain where time and tokens go.

Implementation direction:

- log per-step response latency, capture latency, execution latency, and settle latency
- log raw screenshot size and model-visible screenshot size
- log total actions per batch and whether approval was required

Rationale:

- without metrics, later tuning becomes guesswork
- observability is cheaper and safer than prematurely adding more tools

## Architectural changes

### New modules

- `src/computer/prompt-policy.ts`
- `src/computer/run-profile.ts`
- `src/computer/metrics.ts`

### Changed modules

- `src/macos/native-driver.ts`
  - introduce a prepared session runtime handle
  - cache display size and binary path
  - support model-target screenshot sizing
- `src/computer/loop.ts`
  - add settle delay support
  - emit richer timing hooks
- `src/cli.ts`
  - add efficient defaults and expose only a small number of tuning flags
- `src/computer/session.ts`
  - log richer step metrics

## Flags to add

Only add flags that are necessary for tuning or debugging:

- `--vision-width`
- `--vision-height`
- `--ui-settle-ms`

Do not add a large matrix of knobs yet.

## Explicit non-goals

This slice should **not** add:

- app-specific adapters
- OCR helpers
- Accessibility tree inspection
- text-click tools
- a separate code-execution mode
- policy engines that guess user intent

## Testing strategy

Unit tests should cover:

- prompt scaffolding output
- prepared runtime behavior without repeated build checks
- screenshot resize policy and coordinate mapping behavior
- settle-delay insertion in the loop
- metrics emission for response/execution/capture phases

Manual verification should cover:

- `computer doctor`
- `computer install-driver`
- a local run with and without downscaling configured
- inspection of session logs to verify timing and geometry fields
