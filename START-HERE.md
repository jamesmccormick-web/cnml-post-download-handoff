# Start here — v2 review candidate for Codex

Retire the earlier ZIP. Open this unzipped folder as a Codex project so its top-level `AGENTS.md` instructions apply. Keep this same project folder for later runs; its local ledger must persist.

## First: validate this rebuild without live writes

Paste this request into the project:

> Read AGENTS.md, cnml-post-download/SKILL.md and its execution guide. Set up the local dependencies and run the offline tests. With my reviewed state HTML, prepare a preview, check the exact required Runlayer tool names, and perform only read-only preflight. Stop before the first mutation. Show the exact token, independently found row on each tab, estimate destined for Accounting Audit D, proceeds branch, and release-letter template/output folder when applicable. Do not process the reported duplicate, send email, copy a document, change a sheet or activate a schedule.

The runner checks complete token columns before any mutation. If the same token occurs twice, it will stop. That is the expected behavior for the unresolved duplicate in the reported incident; do not delete a row or pick one of the duplicates automatically.

## Requirements

- Codex with local execution, Node.js 18+ and Python 3.9+.
- Exact direct Runlayer Google Sheets, Drive, Docs and Gmail tools described in the execution guide. Similar tools from another connector do not qualify.
- Access to the configured CNML Data Hub, release-letter template and output folder. Email branch requires Send As permission for executive.experience@opendoor.com.
- A reviewed `*_state.html` file. The designated program-agreement seller email must already be baked into the file. No screenshot, initial calculator export, or source PDF substitution.
- One operator per property. Prior unfinished work must be reconciled with its checkpoint and receipts; a fresh machine's ledger cannot detect an unrecorded send on another machine.

## Later: explicit live execution request

Only after reviewing the preview and resolving prior work, use:

> Use the packaged CNML post-download v2 runner for this one reviewed state HTML. Its source audit is complete and its baked seller email is from the program agreement. I confirm exclusive processing and that prior sends/copies have been reconciled. Resume its existing checkpoint. Update only the v60 sheet destinations. For zero or negative proceeds, send the exact notification from and copied to executive.experience@opendoor.com to this file's seller email. For positive proceeds, copy the designated template into the designated output folder, share reader-only with opendoor.com, prepare the unsigned draft and write only its link to Accounting Audit T after D is verified. Do not write extra notes, HTML links or invented statuses. Stop on a duplicate, missing required tool, wrong folder, uncertain result or failed verification. Do not schedule, sign, pay, or send a positive letter to the seller. Report the saved receipts and any limitations.

Do not use those confirmations unless true. A package's example request is not itself permission to execute it.

The agent must follow `prepare → tools → accept-tools → preview → next/accept` and record actual live authorization before the first mutation. It must never improvise writes after a runner failure. No reinstall into global skills is required.
