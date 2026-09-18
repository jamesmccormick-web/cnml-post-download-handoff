# CNML post-download project instructions

This repository handles ONLY the workflow after a reviewed Download with State HTML upload. It is separate from the end-to-end browser audit project.

Use the installed SKILL.md and execution.md entry points. Execute the packaged runner; do not invent a replacement workflow, use a browser to edit Sheets, run calculator scripts, or hand-author connector mutations.

## Required execution boundary

1. Save the uploaded bytes unchanged; inspect the durable ledger and resume unfinished work first.
2. Use `intake`, `preview`, `tools`, and `accept-tools`. Intake automatically records the configured execution scope for a valid uploaded state file, including an upload with no accompanying text. Use intake `--preview` when explicitly requested. Missing Runlayer capabilities under the direct or explicitly approved catalog profile is a blocker, never a reason to switch connectors.
3. A valid uploaded `_state.html` activates the configured downstream workflow without routine reconfirmation. Record the configured trigger honestly, not as a claim that source review or exclusive handling was independently verified. Playbooks, screenshots and rebuild requests alone do not activate a live property run.
4. Only execute exact operations emitted by `next`, once, and accept the full captured response. Do not edit the runner or state to get past a failed guard during live processing. If it fails, report the stage and preserve receipts.
5. Complete the full token scans on all three sheets before any mutation. Do not use screenshots, visible/filtered rows, truncated chat output, approximate address matches, old row numbers or a last-row guess to choose a row. A full scan returning an existing token means update that row, not append. Duplicates stop all work.

## Business write boundaries

| Tab | Permitted business writes |
|---|---|
| Manual Data Raw | A:R, immediately followed by V on that same row |
| Manual Audit Notes from Screenshots | A:D |
| Accounting Audit, existing row | D, then T for positive; D, then P/Q for zero or negative after confirmed email |
| Accounting Audit, genuinely absent token | Only the runner's A:D append with A=token, B/C blank, D=estimate, after a fresh complete absence scan |

A fresh-row append is not a general authorization to populate other columns. Never write Accounting Audit B/C/E/F/G/H/I/J/K/L/M/N/O/R/S/U or invented progress labels. Never add an HTML link, archive URL, COE date, "Pending draft", "Rerun completed" or commentary to Accounting Audit. The only non-business exception is the runner's exact, metadata-derived temporary scratch formula at row 1 and its owned cleanup.

The release-letter template and output folder are the exact identifiers in the runner and v60 reference. An inaccessible folder/template stops the positive path before business writes; do not make a new folder, copy into My Drive, or substitute a calculator/archive folder. Verify the returned copy's parent and domain sharing before letter completion. Never claim a draft was shared based only on its URL.

## Installation boundary

A setup request does not execute a live property. Preserve the original browser agent. No schedule, signing, payout or seller delivery of a positive release letter.
