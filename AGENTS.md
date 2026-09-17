# CNML post-download project instructions

This repository handles ONLY the workflow after a reviewed Download with State HTML upload. It is separate from the end-to-end browser audit project.

Before responding to an uploaded `_state.html` or an instruction to process CNML proceeds, read `cnml-post-download/SKILL.md` and `cnml-post-download/references/execution.md`. Execute the packaged runner; do not invent a replacement workflow, use a browser to edit Sheets, run calculator scripts, or hand-author connector mutations.

## Required execution boundary

1. Save the uploaded bytes unchanged; inspect the durable ledger and resume unfinished work first.
2. Use `prepare`, `preview`, `tools`, and `accept-tools`. Missing exact Runlayer tools is a blocker, never a reason to switch connectors.
3. Record the operator's actual execution scope. The user supplying a playbook, screenshots, or requesting a rebuild is not authorizing a live property run.
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

## Rebuild acceptance

Version 2 is a review candidate after a reported failed coworker run. Offline tests are not proof of live execution on Jacob's computer. Default to preview/read-only preflight when asked to validate the rebuild. Run a live property only under an explicit live execution request. Never clean up the reported duplicate or move/share its draft as part of a rebuild request.

Retain the original agent unchanged. No schedule, signing, payout or seller delivery of a positive release letter.
