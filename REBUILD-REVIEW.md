# Rebuild review

## Established from the provided screenshots

The same token/address appears on Accounting Audit rows 1465 and 1475. The screenshot shows the estimate 7,995.16 on row 1475 while D1465 is empty, a letter link at T1475, a calculator link at U1475, narrative text at G1475, and a positive-branch "Pending draft" status at Q1475. The draft link displays an access warning. These are screenshot observations, not a fresh live-sheet read. The estimate itself has not been independently validated against the uploaded state file.

The user reports a wrong Drive folder. The screenshot establishes an access problem; it does not establish the actual document parent folder. That requires the copy receipt or document metadata.

## Established from the package

The newly supplied Downloads v60 reference is byte-for-byte identical to the v60 reference shipped in v1. The existing runner's intended business operations did not write Accounting G/U or positive-branch Q. Its copy request specified the v60 output folder. Therefore those screenshot outcomes cannot be attributed to a different bundled v60 spec. Jacob's task transcript, actual tool requests/responses, source state file and local checkpoint are still needed to establish whether the runner was used, bypassed, changed, or misinterpreted in that environment. There is no verified root-cause claim yet.

The handoff lacked a root AGENTS.md, its test suite exercised the runner rather than a fresh Codex user's actual workflow, and the code did not separately validate every outgoing mutation against a narrow write contract. Those are deficiencies in the package regardless of the eventual root cause.

## Version 2 changes

- Root AGENTS.md routes uploaded state files into the maintained runner and explicitly forbids improvised writes, alternate connectors, broad Accounting rows and live cleanup during rebuild work.
- The exact required tool names are checked and captured for the uploaded token/hash. The CLI refuses execution without that check. This checks availability, not every user's permission or tool response shape.
- All three complete, case-sensitive token-column scans precede all mutations. Duplicates anywhere stop the run before any sheet changes. Truncated, summarized, narrow or unrecognized responses fail closed; raw responses are retained directly on disk without model transcription.
- A new independent operation validator checks the exact tool, scope, current row, values and destination for each emitted mutation. Accounting business writes are D plus positive T, or D plus zero/negative P/Q after confirmed sending. G/U, fabricated status, alternate folder, broad row update and wrong values are rejected.
- A fresh full-column absence result is required before the existing v60 append path. A row is never invented from last-row counts. Appended row numbers come from the connector receipt.
- Positive preflight reads the designated folder and template before business writes. The copy's returned parent and domain sharing are still checked. Failure stops rather than choosing another destination.
- Written raw A:R, V, notes A:D and Accounting D are read back before moving forward. Branch completion retains final link/status and uniqueness checks.
- v1 states are not silently upgraded or reset. Their pending receipts must be reconciled.

## Explicit differences from historical v60 wording

Business fields, destination IDs, amount signs, null handling, email body and nine letter replacements remain unchanged. The existing September 16 zero-proceeds decision is retained: exactly zero sends the same truthful email. Program-agreement email provenance remains an upstream prerequisite. Ambiguous outcomes stop rather than using the reference's permissive "continue" language to imply success.

Read-only complete upfront scans implement v60's full-range and Row-Reuse Rule; later scratch cycles remain metadata-derived and exact-match with owned cleanup. The conflicting instructions to start with scratch writes are superseded by the no-mutation-before-duplicate-check requirement. Extra readbacks and folder preflight add validation without expanding business writes.

## Existing incident recovery is separate

Do not run this property again while both rows exist. Before any live correction: capture both rows and all three tabs' token matches, obtain the exact original state file and failed task receipts, inspect the created document's actual parent and permissions, then prepare a cell-by-cell repair limited to confirmed erroneous changes. Do not delete an entire row, resend, make another letter, infer a sender receipt or replace the original archive link from screenshots alone. This rebuild does not perform that repair.
