# OpenAI Computer Use Guide

## Source record

- Title: `Computer use | OpenAI API`
- Canonical URL: [https://developers.openai.com/api/docs/guides/tools-computer-use](https://developers.openai.com/api/docs/guides/tools-computer-use)
- Accessed: `2026-03-10`
- Publisher: OpenAI
- Host: `developers.openai.com`

## Why this is an authoritative source

This page is part of OpenAI's official API documentation set and publishes the canonical guidance for the Responses API computer-use tool on OpenAI's developer domain. For this repository, it should be treated as the primary reference ahead of blog posts, summaries, or third-party tutorials.

## Scope captured for this repository

The guide covers:

- how to prepare a safer execution environment for computer use
- when to use the built-in computer-use loop versus a custom harness or a code-execution harness
- the request/response shape for the built-in loop
- how screenshot-first turns and returned action batches are handled
- user confirmation and consent expectations
- migration notes from the older preview flow
- human-in-the-loop safety expectations

The page also links to OpenAI's sample application for end-to-end examples:

- [OpenAI CUA sample app](https://github.com/openai/openai-cua-sample-app)

## Relevance to `mac-agent`

This repository follows the same narrow-harness direction described in the official guide:

- send a task into the built-in computer-use flow
- execute model-returned action batches locally
- capture and return a fresh screenshot after each turn
- preserve explicit user confirmation around risky actions
- keep a human in the loop for sensitive or hard-to-reverse workflows

The repository's current implementation reflects those ideas in:

- `src/computer/loop.ts`
- `src/computer/executor.ts`
- `src/computer/approval.ts`
- `src/macos/native-driver.ts`
- `src/mcp/server.ts`

## Notes for maintainers

- Treat the official page above as the source of truth when OpenAI changes tool names, request formats, safety guidance, or migration guidance.
- Prefer linking to the canonical URL instead of copying large parts of the page into this repository.
- If the guide changes materially, update this note with a fresh access date and a short summary of what changed for `mac-agent`.

## Retrieval note

This repository records source metadata and maintainers' notes rather than a verbatim copy of the full guide text. That keeps the project anchored to the official source while avoiding a stale local mirror of third-party documentation.
