# Development Workflow — BA / BE-expert / Tester loop

The process rule for how a Notion task becomes a verified, done piece of
`grocery-api`, and exactly when a human gets pulled in.

## Roles

- **`ba`** — owns requirements. Writes/maintains
  `grocery-api/docs/requirements/<feature>.md`, the single source of truth
  for what "done" means for that feature. Resolves or escalates ambiguity.
- **`be-expert`** — implements against `be-standard.md` and the current
  `docs/requirements/<feature>.md`.
- **`tester`** — writes and runs test cases against the real Postgres
  container, reports PASS/FAIL per acceptance criterion, classifies every
  failure as `bug` or `needs-clarification`.

Agents don't invoke each other directly — the session driving the loop
routes between them based on each stage's report and decides which agent
runs next.

## The loop

1. `ba` writes or updates `docs/requirements/<feature>.md` for the target
   Notion task/phase.
2. `be-expert` implements against `be-standard.md` + that requirements doc.
3. `tester` tests against the real database, reports PASS/FAIL per
   acceptance criterion.
4. Branch on the result:
   - **100% pass** → go to step 6 (coverage gate).
   - **Any `bug` failure** → straight back to `be-expert` to fix. No
     human, no `ba` involvement. → back to step 3.
   - **Any `needs-clarification` failure** → to `ba`:
     - Resolvable from already-documented rules → `ba` updates the
       requirements doc and hands back to `be-expert` directly. No human.
       → back to step 3.
     - Not resolvable → `ba` lists the specific question(s) and gets a
       human ruling, records the decision in the requirements doc, then
       hands to `be-expert`. → back to step 3.
5. Repeat 3–4 until 100% of test cases pass.
6. **Coverage gate**: `ba` checks that every acceptance criterion in
   `docs/requirements/<feature>.md` has a corresponding passing test case.
   Any criterion without one is a coverage gap — not a bug, an incomplete
   test suite — sent back to `tester` to add the missing case(s), then
   re-run from step 3.
7. **Done** only when both hold: 100% of test cases pass, and `ba`
   confirms 100% of acceptance criteria are covered by a passing test.

## Escalation format for human approval

When `ba` brings a question to a human it must state: the specific
decision needed, why it can't be inferred from existing docs, and 2–4
concrete options with their consequences. Never an open-ended "what
should happen here?"

## Scope of one loop run

Run this per feature/task (or per small group of related tasks within one
phase), not across the whole remaining roadmap in a single pass. Starting
this loop is a deliberate, potentially multi-round and costly action
(several agent invocations, possibly more than one human-approval round)
— kick it off for a specific phase/feature only when explicitly asked,
not automatically after every unrelated change.
