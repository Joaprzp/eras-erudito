---
name: ship
description: >
  Close out a batch of work on Eras Erudito: quality checks, self-audit, domain
  and docs sweep, repo guard rails, deploy verdicts, then commit, deploy and
  push. Use when the user says /ship, "cerramos", "commit y cierre", "listo para
  commitear", "wrap up", or asks "hay que deployar convex?", "que docs
  actualizo?". Verify mode: "/ship verify" or "ya deployé, verifica".
---

# Ship

Two modes:

- **Full** (`/ship`): steps 1 to 8, in order.
- **Verify** (`/ship verify`): step 9 only.

Unlike most repos, here you run the deploy and the push yourself — the owner has asked for it repeatedly. Still print the sequence before running it, and never run it if a check failed.

## 1. Quality checks

Run the `pre-push-checks` skill. The project's own sequence is `bun run check`: build, then lint, then typecheck. There is no test script — say "no tests in this repo" rather than silently skipping the step. Always `bun`, never `npx` / `npm` / `pnpm`. Stop and fix on failure; never weaken a check to make it pass.

## 2. Self-audit

Report honestly, before being asked:

- What could not be verified — anything needing the live API, a real Partida, or a second device.
- Shortcuts and debt left behind.
- Anything changed that the owner did not ask for.

## 3. Domain and docs sweep

Per `docs/agents/domain.md`:

- New domain concept in the diff → add it to `CONTEXT.md`, with its `_Avoid_` synonyms.
- Behaviour a player would notice → update `docs/mvp-spec.md`.
- A decision that is hard to reverse, surprising without context, and a real trade-off → write the next `docs/adr/NNNN-*.md`. Not otherwise; most changes need no ADR.
- Diff contradicts an existing ADR → surface it, never silently override.

Report one line: `docs: updated <list>` or `docs: none needed`.

## 4. Guard rails

- **Glossary**: identifiers and user-facing Spanish strings use `CONTEXT.md` vocabulary. Code uses the English rendering of the term — Retador is `challenger`, Retado is `target`, Empate is `tie`, Fallo is `ruling` — and never a synonym listed under `_Avoid_`.
- **Comments**: this repo is comment-free. Do not add narration; if a comment feels load-bearing, rename something so the code says it instead.
- **Generated files**: `convex/_generated/` is clean or fully staged, never half-committed. Run `bunx convex codegen` when functions or schema changed.
- **Provider isolation**: `convex/judge.ts` is the only file allowed to name the language-model provider.
- Renamed or removed something? Grep the old name; expect zero matches.

## 5. Diff classification

- **docs or tooling only**: nothing that reaches the built bundle or the backend — markdown, ADRs, skills, agent instructions.
- **frontend-only**: no `convex/` changes, but `src/` did change.
- **backend backward-compatible**: additive optional schema fields, new functions, internal logic changes.
- **backend breaking**: removed or renamed public function, changed arguments, or a changed shape the deployed frontend reads.

## 6. Verdicts (say these unprompted)

- `convex deploy: needed / not needed` — any `convex/` change means needed.
- `frontend skew: safe / unsafe`. The backend deploys in seconds; the Cloudflare build takes minutes. Unsafe whenever the backend starts producing a state or shape the live bundle does not handle — the classic case is a new status literal falling through to an old `else` branch and rendering as the wrong thing. When unsafe, say exactly what a stale bundle would show and tell the owner not to exercise that path until the build lands.

## 7. Deploy safety

Schema changes must be additive and optional: prod rooms live up to 24 hours, and a new required field breaks the ones in flight. Avoid deploying mid-Partida — this is played with family and a push lands in seconds. If the timing is unclear, ask rather than guess.

## 8. Commit, deploy, push

Branch off `main`, commit, fast-forward `main`, delete the branch. Commit messages in English: conventional prefix, and a body that says why rather than restating the diff.

**Keep the `Co-Authored-By` and `Claude-Session` trailers.** The `pre-push-checks` skill says to strip `Co-authored-by`; that rule targets trailers injected by hooks and templates, while these are required deliberately by the harness. Note the conflict once if it comes up, then move on.

Then, matching the classification:

- backend changed: `bunx convex deploy --yes && git push`
- frontend or docs only: `git push`

Never tell the owner to run `bunx wrangler deploy`. Cloudflare builds the frontend automatically on a push to `main`; wrangler is only the fallback for when their build is broken, and `wrangler.jsonc` sitting in the root misleads on this.

## 9. Verify mode

- `git status` clean and the branch level with origin.
- No orphan or half-staged generated files.
- If the backend was deployed, check `bunx convex logs` for errors tied to the new functions.
- Confirm the docs already reflect the shipped state — they should, from step 3.
- One-line verdict, then stand by. If something is off, say exactly what and propose the fix.
