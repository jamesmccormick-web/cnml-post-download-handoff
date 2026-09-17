# Codex execution guide

Run local commands from the `cnml-post-download` folder. This package is standalone: it has no dependency on the original browser agent, its run ledger, or its Python environment.

## Version 2: project routing

Read the repository-root AGENTS.md first. Do not execute handwritten connector mutations or modify runtime guards to work around a failure. Version 1 checkpoints require reconciliation and are not silently upgraded.

## Dependencies and tool check

Node.js 18+ and Python 3.9+ with BeautifulSoup are required. Use an existing suitable Python runtime or create `.venv` locally and install the pinned `automation/requirements.txt` using pip. Point `CNML_PYTHON` to the actual Python executable if it is not `python3`. This environment variable is optional and is not a credential. Do not copy another person's virtual environment.

Example on macOS/Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r automation/requirements.txt
export CNML_PYTHON="$PWD/.venv/bin/python"
node --test automation/tests/*.test.mjs
```

On Windows choose the equivalent Python executable in `.venv/Scripts/`. Do not claim that another platform was tested here.

Confirm these exact Runlayer tool capabilities are callable before recording a pending operation:

- `mcp__google_sheets__get_metadata`, `fetch`, `update`, `append`
- `mcp__google_drive__copy_file`, `get_metadata`, `share_file`
- `mcp__google_docs__apply_doc_updates`, `replace_text`, `fetch`
- `mcp__gmail__send_email`, including its `from` argument

The emitter uses these full server-prefixed names and Codex's `functions.exec` / `tools.apply_patch` to save complete responses. Similar-looking tools from other connectors are not substitutes. Missing tools mean the connected environment needs setup; do not invent a successful call.

## Intake and preview

Inspect the local `runs/proceeds-ledger.json` and existing states first. A pending operation needs its original captured result or outcome reconciliation, not a repeat call. If the ledger has no active property, save the uploaded file unchanged in a durable private local location and run:

```sh
node automation/proceeds.mjs prepare runs/property/downstream.json /absolute/path/property_state.html
node automation/proceeds.mjs preview runs/property/downstream.json
node automation/proceeds.mjs tools runs/property/downstream.json
```

Execute the emitted read-only local tool-availability check and run its `accept-tools` command. It records the actual callable names for this file. Missing tools stop execution. This does not certify sender permissions. A preview-only run may then execute/accept emitted read-only operations; stop before any operation marked `mutation:true` (including scratch formulas). Without live scope the runner itself blocks mutations.

`prepare` validates the suffix and structure, parses the uploaded file once, hashes its bytes, validates seller/contact data and branch, and creates a local checkpoint. It makes no external calls. It does not certify the upstream archive or source review.

The original filename must end in `_state.html`. Do not rename an initial calculator export just to pass this gate. No screenshots, copied state URL, or fabricated upstream checkpoint. If a genuine download acquired a duplicate suffix, establish its origin before preserving the original bytes under the valid suffix.

Review the packet's address, token, A:R array, subsidy V, notes, Accounting D, signed net and exact communication. If the requested execution scope already covers all applicable actions, write `runs/property/approval.json` using the real instruction and values from this preview:

```json
{
  "userInstruction": "The operator's actual execution request",
  "token": "EXACT_TOKEN_FROM_PREVIEW",
  "sha256": "EXACT_HASH_FROM_PREVIEW",
  "sheets": true,
  "email": true,
  "letter": false,
  "sourceReviewComplete": true,
  "sellerEmailFromProgramAgreement": true,
  "exclusiveProcessingConfirmed": true
}
```

The example scopes above are for zero/negative; positive uses `email:false, letter:true`. The three confirmations must come from the operator's request or established upstream evidence, not from this guide. Missing scope should be requested against the concrete preview. Ambiguous source/contact data must be corrected upstream and downloaded again, not guessed here.

```sh
node automation/proceeds.mjs authorize runs/property/downstream.json runs/property/approval.json
```

## Execute and preserve receipts

```sh
node automation/proceeds.mjs next runs/property/downstream.json
```

This stores one pending intent and emits the exact direct MCP call plus its accept command. Run the emitted `functions.exec` code once; it saves the entire response envelope without hand-transcribing sheet columns. Then run the emitted accept command. Repeat `next → execute once → accept` serially until complete. Do not call `next` again if the prior external call or response persistence was uncertain.

A reported error keeps the pending intent. Read its captured response. Never delete or reset the checkpoint or ledger to pass a guard. A copy or send may have succeeded even when the tool timed out. Escalate ambiguous outcomes for reconciliation; do not call an unapproved search tool or automatically send/copy again.

Version 2 first scans all three complete token columns without any mutation, then reads Accounting Audit P:T after locating rows and blocks when Q or T already contains an outcome. For positive files it next reads the exact folder/template metadata before business writes. Every emitted mutation is checked against the exact v60 range, values, scope and destination; every business-data write is read back before final communication. That prior-output check is evidence of prior work, not permission to overwrite it. It cannot discover an earlier unrecorded send, and it is not an atomic cross-computer lock.

The completed summary is available only after final verification:

```sh
node automation/proceeds.mjs summary runs/property/downstream.json
```

The state separates `sheetTransfer.verified` from final completion. Report partial states truthfully. A positive draft may need manual removal of inherited grey shading. If the folder imposes broader inherited sharing, stop and report it; do not broaden permissions or change the parent folder to get past the reader-only check.

## Destination map

| Destination | Writes |
|---|---|
| Manual Data Raw | A:R from the reviewed doc-side packet; then V for subsidy, as the immediately following call |
| Manual Audit Notes from Screenshots | A:D = token, address, row notes, flags/footer variance |
| Accounting Audit | D = estimated proceeds; positive branch T = this property's new draft link; zero/negative P/Q = Automation / Zero Proceeds after confirmed send |

Raw S:U and Snowflake reference columns are not write targets. Match exact case-sensitive trimmed tokens over the complete 20,000-row protocol, preserve blank row offsets, reject grids larger than the ceiling, verify row identity immediately before writes and perform post-write duplicate checks. Existing scratch content is preserved; only this run's owned formula is cleared.
