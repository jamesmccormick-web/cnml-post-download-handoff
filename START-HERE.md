# Start here

Open this repository as a Codex project, or install its `cnml-post-download` folder into your Codex skills folder. Replace the old skill files when upgrading; preserve the existing `runs/` folder and receipts. Do not create a second ledger for work already in progress.

Set up the dependencies described in the execution guide and connect its exact required Runlayer tools. Then attach the genuine Download with State `_state.html` in a new chat. **No accompanying request or second confirmation is required.** The agent resumes saved work, verifies destinations, updates the prescribed sheet cells, and completes the applicable notification or unsigned release-letter draft.

For read-only inspection, say “preview only” with the upload. Screenshots and setup requests do not trigger processing. Missing tools, ambiguous required data, duplicate rows, existing outcomes and uncertain sends/copies remain stop conditions. Do not reset those guards to force a rerun.

A repository URL alone does not install the skill. Each coworker must update their local project/skill. No schedule is created. The original end-to-end browser automation remains separate.

## Runlayer catalog compatibility — September 18

When the connected Runlayer catalog exposes `google_she_get_metadata`, `google_she_fetch`, `update`, `append`, and `send_email`, refresh the tool check using:

```sh
node automation/proceeds.mjs tools /absolute/path/to/downstream.json --runlayer-catalog
```

Execute the emitted check, then its `accept-tools` command. Continue the normal emitted `next → execute once → accept` sequence. This profile is only for the confirmed Runlayer Sheets/Gmail definitions, including Gmail's `from` argument. Verify that provenance in the current tool catalog before selecting it; a generic matching name from another integration is not sufficient. Do not hand-author calls or rename checkpoint operations.

The default direct profile is unchanged. The explicit catalog profile maps only these five approved names; positive-proceeds Drive/Docs capabilities still require their original bindings. Both profiles require `functions.exec`, a callable `tools` object, and `apply_patch` for durable receipts. If the host lacks these execution capabilities, stop and report that limitation; catalog visibility alone is insufficient.

Update installed skill code in place, preserving `runs/`, ledger, receipts, and source files. Resume the existing checkpoint. Resolve any pending operation using its saved receipt before refreshing the tool check; never retry an uncertain operation. No new upload or ledger is needed for Jacob's blocked, pre-operation checkpoint.

## Runlayer wrapper profile

For tasks that expose Runlayer through `mcp__codex_apps__runlayer_plugin_execute_tool`, use:

```sh
node automation/proceeds.mjs tools /absolute/path/to/downstream.json --runlayer-wrapper
```

Execute the emitted check and accept-tools command, then resume the existing checkpoint through the normal next / execute once / accept loop. This profile routes the five verified Sheets/Gmail operations through `{tool_name, arguments}` with their original arguments unchanged, including Gmail `from`. It saves the full wrapper response without discarding error fields. The availability check confirms the wrapper is callable, not that every underlying operation or sender is authorized; actual responses and all existing validation guards remain authoritative. No test email is required.

This wrapper profile covers Sheets and Gmail only. Positive-proceeds Drive/Docs operations still require direct tools; their wrapper names have not been verified. Never guess those names or substitute another connector. Pending and uncertain operations still require reconciliation, never replay.

Upgrade installed files in place and preserve runs, receipts, and ledger. For Jacob's ready checkpoint use --runlayer-wrapper, not --runlayer-catalog. No checkpoint reset is needed.
