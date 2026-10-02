# Lessons ledger

Append-only memory of verified, reusable lessons for this workspace. It is NOT always-on: search it before planning.
- Search: `node .agents/scripts/lessons.mjs search <query>` or `node .agents/scripts/lessons.mjs list --scope <scope>`
- Add: `node .agents/scripts/lessons.mjs add --scope <scope> --text "When X, do Y because Z" --evidence "<path:line | command | URL>"`
- Vote: `node .agents/scripts/lessons.mjs vote <id> helpful|harmful` (never edit the counters by hand).
- Line format: `- [L-NNNN] scope:<scope> | +<helpful> -<harmful> | <YYYY-MM-DD> | <lesson> | evidence: <where>`
- Scopes: `platform`, `project`, `tooling`, `user`, or a stack id (`typescript`, `solidjs`, `rust`, ...).
- One lesson per line: a trigger, an action and a reason. No secrets, tokens, personal data or file contents.
- Never rewrite or delete lines to tidy up. Retire an obsolete lesson: `node .agents/scripts/lessons.mjs retire <id> --reason "<why>"`.
- Promotion: helpful >= 2 and harmful 0 (or a verified high-severity fact) -> `.agents/rules/90-lessons.md` (at most 4,500 B) by the scribe in the LEARN phase (`/reflect`); other agents only search.

## Active

## Retired
