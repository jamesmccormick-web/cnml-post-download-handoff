# CNML post-download handoff — September 18, 2026 compatibility update

Download [the current ZIP](cnml-post-download-handoff.zip), extract it, and follow [START-HERE.md](START-HERE.md). Replace the installed skill files while preserving your existing `runs/` folder, checkpoints and receipts. Do not create a second ledger for unfinished work.

This version completed a live positive-proceeds workflow on the owner’s computer: sheet updates, unsigned release-letter creation in the designated folder, Opendoor access, and the final Accounting Audit draft link were verified. It has not been run on Jacob’s computer. All 48 regression tests pass. The new catalog-name profile is tested with simulated tools; it has not been live-tested on Jacob’s computer.

Fixes cover empty-cell connector responses, flattened line breaks in notes readback, and acceptance of existing Opendoor Editor access in the verified output folder. The workflow still rejects wrong destinations, other domains, duplicate tokens, missing required values, and uncertain operations.

Attach a reviewed Download with State `_state.html` in a new chat to start or resume. Say “preview only” for read-only inspection. Positive proceeds creates an unsigned draft; zero/negative proceeds sends the configured notification. No schedule is created.

- [Execution rules](AGENTS.md)
- [Validation and limits](VALIDATION.md)
- [Historical rebuild review](REBUILD-REVIEW.md)

This package contains no live property uploads, operational receipts, credentials or local run ledger. The original end-to-end automation is separate.

## Runlayer catalog compatibility — September 18

When the connected Runlayer catalog exposes `google_she_get_metadata`, `google_she_fetch`, `update`, `append`, and `send_email`, refresh the tool check using:

```sh
node automation/proceeds.mjs tools /absolute/path/to/downstream.json --runlayer-catalog
```

Execute the emitted check, then its `accept-tools` command. Continue the normal emitted `next → execute once → accept` sequence. This profile is only for the confirmed Runlayer Sheets/Gmail definitions, including Gmail's `from` argument. Verify that provenance in the current tool catalog before selecting it; a generic matching name from another integration is not sufficient. Do not hand-author calls or rename checkpoint operations.

The default direct profile is unchanged. The explicit catalog profile maps only these five approved names; positive-proceeds Drive/Docs capabilities still require their original bindings. Both profiles require `functions.exec`, a callable `tools` object, and `apply_patch` for durable receipts. If the host lacks these execution capabilities, stop and report that limitation; catalog visibility alone is insufficient.

Update installed skill code in place, preserving `runs/`, ledger, receipts, and source files. Resume the existing checkpoint. Resolve any pending operation using its saved receipt before refreshing the tool check; never retry an uncertain operation. No new upload or ledger is needed for Jacob's blocked, pre-operation checkpoint.
