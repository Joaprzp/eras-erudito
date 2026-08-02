---
name: prime
description: >
  Session bootstrap for Eras Erudito. Use at session start or when the user says
  /prime, "escanea el proyecto", "embebete de contexto", "lee los ultimos
  commits", or asks "where were we" / "en que estabamos". Replaces the
  hand-typed context-loading opener.
---

# Prime

Goal: be ready for the next task in one pass, without reading half the repo. `AGENTS.md` and `CLAUDE.md` are already in context; do not re-read them.

## Steps

1. `git log --oneline -12` and `git status -sb`. Note dirty files, commits ahead of origin, and whether `convex/_generated/` is among the dirty ones.
2. Read `CONTEXT.md` in full. It is the glossary and it is normative: every term used in issues, commits, identifiers and user-facing strings comes from here, and the `_Avoid_` lines are enforced. This is the one file worth reading every session.
3. `ls docs/adr/` for the titles. Read only the ADRs touched by the last 10 commits (`git log -10 --name-only --format='%h %s' -- docs/adr/`), plus any whose title covers the area about to be worked in.
4. `gh issue list --state open --json number,title,labels` — the tracker per `docs/agents/issue-tracker.md`. An empty list is a normal answer here: say so and move on.
5. Read the section headings of `docs/mvp-spec.md`. Read a section in full only once a task lands in it.

## Report

Reply with a short readiness summary, then stop and wait for the task:

- **Last shipped work**: two or three lines from recent commits, in plain language.
- **Tree state**: clean, or the dirty files and how many commits ahead of origin.
- **Open issues**, if any.
- **In flight**: work that landed but was never exercised against a real Partida, or a decision recorded in a recent ADR that has not been used yet. This repo ships to a live game played with family, so "merged" and "verified" are different things and the gap is usually where the next task is.

Do not start work, do not read source files, and do not propose changes — unless the scan turns up something broken: dirty generated files, unpushed commits, a schema change that never reached prod. Flag those explicitly.

If the invocation carries a task in its arguments, deliver the readiness summary first, then start on that task without waiting for a second prompt.
