# Cash Plus Upside Proceeds — Workflow Prompt (v60, August 2026)
*Automation entry point — starts directly from the Downloaded-with-State HTML upload*

**What's new in v60 — the release letter template now has a `[Identifier]` placeholder that must be filled with the flip token:**

The template document (`18wJdU5wuzdXO3FH5M_vvw3_WHZC0t0zV8saM-2yeSqM`) now carries a `[Identifier]` placeholder at the very bottom of the document, after the signature blocks — confirmed by fetching the live template. Through v59, this placeholder went unfilled because it wasn't part of the replacement batch. v60 adds it as a ninth `replaceAllText` request in the existing Step 3 batch in Branch A:

- **Find:** `[Identifier]` **Replace with:** the flip token for this deal, exactly as extracted from the HTML header metadata in Step 1 of Step 6B — the same token value used for the Manual Data Raw / Sheet 3 / Accounting Audit scans and writes earlier in this run.
- This is a plain single-line bracket placeholder (like `[Property]` or `[EMAIL]`), not a multi-paragraph pattern like the `Date:`/`Re:` case — so it belongs in the batched `apply_doc_updates` call, not the separate `replace_text` call used for the date line.
- **Same stale-value guard as the col T doc-ID write applies here:** the token filled into `[Identifier]` must be *this run's own* extraction for *this specific property*, never a token carried over from a prior turn, a prior property, or a prior conversation. If more than one property is being processed in sequence in the same conversation, re-derive the token from this pass's own Step 1 extraction before filling this placeholder — don't assume it.
- Applies identically to one-seller and two-seller deals — the placeholder's fill value depends only on the flip token, not on seller count.
- No change to Branch B (zero-proceeds email) — there is no letter, no template, and no `[Identifier]` fill in that branch.

The batch is now **9 items** (was 8 through v59). No other changes to sheet-column mapping, sign rules, filename guard, letter/email branch logic, scan mechanism, tool set, or template structure otherwise. Everything else carried forward from v53–v59 remains in effect and is restated below for completeness.

v58's scratch-cell scan mechanism failed its first live test: the fixed scratch column (`CZ`, column 104) doesn't exist on any of the three sheets' actual grids. **The failure was caught safely** — v58's own mandatory verification step detected the problem and fell back to the v57 fetch-and-grep method for the rest of that run, with nothing written incorrectly. But the underlying defect needs a real fix, not a new guess at a hardcoded column letter.

**Root cause:** `CZ` was chosen because it's far outside every *documented data* column (the widest documented reference anywhere in this workflow is Manual Data Raw's AR/col 44) — but that's a different number from the sheet's actual *grid* width, which is much smaller. A `get_metadata` call against the live CNML Data Hub spreadsheet shows:

| Sheet | Actual grid columns | Last column |
|---|---|---|
| Manual Data Raw | 45 | AS |
| Manual Audit Notes from Screenshots | 26 | Z |
| Accounting Audit | 36 | AJ |

`CZ` (104) exceeds all three. Hardcoding a *new* fixed column based on today's numbers would just repeat the same mistake if any sheet's grid is ever resized — so v59 doesn't hardcode a column at all. Instead:

1. **A single `get_metadata` call at the start of the run** retrieves all three sheets' actual `columnCount` in one shot (this call returns metadata for every sheet in the spreadsheet, not just one, so it costs exactly one extra call for the whole run, not three).
2. **Each sheet's scratch cell is computed as that sheet's own last column**, at row 1 — e.g., if `get_metadata` reports Manual Data Raw at 45 columns, the scratch cell is `Manual Data Raw!AS1`, computed from the number, not assumed.
3. **A sanity check before trusting this**: the computed last column must sit strictly beyond the highest column that sheet's write sequence actually touches (col V / 22 for Manual Data Raw, col D / 4 for Manual Audit Notes, col T / 20 for Accounting Audit). If it doesn't — meaning the sheet is so narrow the "last column" would collide with real data — skip the formula mechanism for that sheet entirely and use the v57 fetch-and-grep method for it, without attempting a write.

This replaces v58's fixed-column assumption with a discovered, verified-safe one. The rest of the scratch-formula mechanism (the `SUMPRODUCT` count+row formula, the write/fetch/clear cycle, the literal-`=`-text verification, the fallback-for-remainder-of-run rule) is unchanged from v58 — only the source of the scratch cell's column address changes.

No changes to sheet-column mapping, sign rules, filename guard, letter/email branch logic, tool set, or template structure. Everything else carried forward from v53–v58 remains in effect and is restated below for completeness.

This document stands on its own as the complete, current spec.

---

## SCAN RANGE & DUPLICATE-PREVENTION PROTOCOL — applies to every token-matching scan in this workflow

**Why this exists:** a hardcoded low row-ceiling on a token scan (e.g. `A1:A1000`) will silently miss any existing row that lives past that boundary, and "not found" always falls through to *append* — which is how a real duplicate-row incident (token `5RXRHWAMPNAV1`, August 2026) was created under a prior version. As sheets grow, any fixed ceiling eventually becomes wrong; it fails silently, not loudly. This section is unchanged in substance from v51; the Row-Reuse Rule below is additive and governs call efficiency only, never whether a check happens.

**The rule — for every scan in Steps 6C and 6D, on every sheet (Manual Data Raw, Manual Audit Notes from Screenshots, Accounting Audit):**

1. **Never hardcode a low row ceiling.** Every check — existence lookup, row-number lookup, or post-write duplicate check — must cover the full token column with a generously oversized upper bound: `A1:A20000` for Accounting Audit and Manual Audit Notes from Screenshots (token in col A), and `B1:B20000` for Manual Data Raw (token in col B). Don't shrink this back down to save a call.
2. **Exact match only.** Trim whitespace from both the scanned cell and the token before comparing. Match is case-sensitive.
3. **No partial or sampled checking.** The *entire* range must be checked against the token, not a hand-picked subset, a "quick" pre-check, a recency-based window (e.g. "just the last N rows"), or any other sampling of it — regardless of which mechanism (below) performs the check. A check that covers less than the full range carries exactly the same silent-miss risk that caused the `5RXRHWAMPNAV1` incident, whether the shortcut is a low ceiling, a partial grep, or a narrow row window — and is not a valid substitute for the real check under any framing.
4. **Mandatory post-write duplicate check.** Immediately after any append or update keyed on a token, re-confirm how many rows now contain that exact token on that sheet. If the count is anything other than exactly 1, **stop, do not report success, and flag the exact row numbers found** in the confirmation summary rather than silently proceeding. (See Row-Reuse Rule for how this check is scoped when a prior full scan already ran this run.)
5. **Ceiling watch.** If any of the three sheets ever approaches ~18,000 rows, flag this explicitly in the confirmation summary as a note for the operator — the range will need widening again in a future prompt version.

Known row counts as of v51 (August 2026): Accounting Audit ~1,454 rows, Manual Data Raw ~1,052 rows, Manual Audit Notes from Screenshots ~1,000 rows.

### Scan mechanism (introduced in v58, scratch-cell address fixed in v59) — formula-based full-range check, replacing fetch-and-transcribe

**Why this changed:** the full-range rule above was never the bottleneck — a single `fetch` of an oversized range is one cheap API call regardless of how many rows come back. The actual cost was transcribing that returned data by hand (into a bash heredoc, to `grep` it) so it could be checked in full. This mechanism moves the "check in full" step itself onto the spreadsheet engine, which can evaluate every row of the range without any of that data ever needing to be typed out.

**Step 0 — discover each sheet's real scratch cell (new in v59, once per run, before the first scan cycle):**

v58 assumed a fixed scratch column (`CZ`) far outside the documented data range on all three sheets. This failed on its first live run because `CZ` (column 104) exceeds the actual grid width of every sheet in the CNML Data Hub — a sheet's real column count and how far this workflow's *documented data* extends are two different numbers, and v58 conflated them. v59 stops guessing:

1. **Call `get_metadata` once** against the CNML Data Hub spreadsheet (`1ox5xlhexTMMWVSi24rm76MxTRf6iSUsPG0P2zAGBe8M`) at the very start of the run, before any scan cycle. This single call returns every sheet's actual `columnCount` — it is not three separate calls, one per sheet.
2. **For each of the three sheets, compute the scratch cell as that sheet's own last column, row 1** — convert the returned `columnCount` to its column letter (e.g. `45` → `AS`, `26` → `Z`, `36` → `AJ`) and use `{Sheet}!{Letter}1` as that sheet's scratch cell for this entire run.
3. **Sanity-check before trusting it**: the computed column must sit strictly beyond the highest column that sheet's write sequence actually touches this run — col V (22) for Manual Data Raw, col D (4) for Manual Audit Notes from Screenshots, col T (20) for Accounting Audit. If the sheet's actual grid is so narrow that its last column would collide with real written data, skip the formula mechanism for that sheet specifically and use the v57 fetch-and-grep fallback for it instead — do not attempt a write to a column that might overlap data.

Record each sheet's discovered scratch cell once and reuse it for every scan/duplicate-check cycle against that sheet for the remainder of the run — no need to re-call `get_metadata` mid-run unless a sheet's structure is suspected to have changed.

**The mechanism — one scratch cell per sheet (from Step 0 above), one combined formula, three calls per check:**

1. **Write the combined count+row formula via a single `update` call**, substituting the actual flip token and the correct token-column range for the sheet being checked (col A for Accounting Audit and Manual Audit Notes from Screenshots, col B for Manual Data Raw):

   ```
   ="COUNT:"&SUMPRODUCT(--(TRIM($A$1:$A$20000)=TRIM("TOKEN_HERE")))&"|ROW:"&IF(SUMPRODUCT(--(TRIM($A$1:$A$20000)=TRIM("TOKEN_HERE")))=1,SUMPRODUCT((TRIM($A$1:$A$20000)=TRIM("TOKEN_HERE"))*ROW($A$1:$A$20000)),"NA")
   ```

   `SUMPRODUCT` with `TRIM` evaluates the entire range server-side and satisfies rule 3 above exactly the same way a full grep of a transcribed file would — every row is checked, whitespace-trimmed, exact match — the only thing that changed is where the checking happens.
2. **Read the result with a single `fetch` call** on the scratch cell. The returned string parses as `COUNT:<n>|ROW:<row-or-NA>`.
3. **Clear the scratch cell back to empty via a single `update` call, every time** — on success, on a "not found" result, and on any error partway through this sequence. A stray formula left sitting in a live operational spreadsheet is a bigger problem than the time this whole mechanism is meant to save; treat the clear step as mandatory cleanup regardless of outcome, the same way a `try/finally` would.

**Interpreting the result:**

- `COUNT:0|ROW:NA` → token not found. Proceed to append per the relevant step below.
- `COUNT:1|ROW:<n>` → exactly one match, at row `<n>`. This is the row number to carry forward under the Row-Reuse Rule.
- `COUNT:2` or higher → **stop.** This means the sheet already contains more than one row for this token *before this run touched anything* — a pre-existing data integrity problem unrelated to today's write. Do not proceed with any write to this sheet. Flag this explicitly in the confirmation summary with the count and instruct the operator to review manually. (Note: `SUMPRODUCT`'s row-lookup term is only trustworthy when count is exactly 1 — with 2+ matches, don't use any row number this formula might otherwise produce.)

**Mandatory verification — do this once, on the very first scan of the run:** After the first `fetch` of a scratch cell, confirm the returned value is the *evaluated* result (a string starting with `COUNT:`), not the literal formula text (a string starting with `=`). If the connector returns the literal formula unevaluated, this mechanism cannot work on this connector — **abort the formula approach for the entire remainder of this run** and fall back to the v57 method (fetch the full oversized range, write it to a file, `grep` the whole file) for every remaining scan and duplicate check this run. Do not mix mechanisms within a single sheet's checks in one run; pick one method after this first verification and use it consistently for the rest of the run.

**This mechanism replaces how the full-range check is performed — it does not change what must be true before a write.** The Row-Reuse Rule's single-cell reconfirmation before every write (re-reading `Sheet!A{row}` via a plain `fetch`, no formula involved) is unchanged and still mandatory — this formula-based lookup satisfies the *first full scan* and the *post-write duplicate check* only.

### Row-Reuse Rule (introduced in v52, unchanged through v58) — governs call count only, never skips a check

Within a **single run** (one HTML upload → one full pipeline execution for one token):

- **The first scan of a given sheet's token column is always a full oversized-range scan** (`A1:A20000` or `B1:B20000`), issued via a single `fetch` call, exactly as in v51 — and checked in full per rule 3 above, never partially. This applies once per sheet per run.
- **Every subsequent reference to that same sheet/token combination later in the same run** — including the Step 6D pre-write scan on Accounting Audit, and the stale-row-index re-confirmation before writing col T — reuses the row number already confirmed by that first scan, and re-reads **only that single cell** (e.g. `Accounting Audit!A{row}`, via a single narrow `fetch` call) to confirm it still equals the flip token before writing. This is strictly cheaper than a full rescan and carries the same guarantee: the write never proceeds unless col A at that exact row has just been re-confirmed to match the token.
- **The mandatory post-write duplicate check after a write still happens every time**, per rule 4 above — but if a full-range check of that sheet already ran earlier in this same run and no rows have been appended to that sheet since, the duplicate check may re-use that check's row count for every *other* row and add only the just-written row's status, rather than re-checking the full 20,000-row range again from scratch. If any append happened on that sheet at any point in the run (by this workflow or flagged as external), the next duplicate check on that sheet must be a fresh full-range check — never assume row counts are stable across an append.
- **This rule never applies across runs.** A row number, scan result, or doc ID confirmed in a prior conversation, prior upload, or prior token is never reused for a different token — every new HTML upload starts its own fresh first-scan per sheet. This is the same non-negotiable boundary v51 already enforced for the `NEW_DOC_ID` stale-link guard in Step 6D, extended here to row numbers generally.
- **When in doubt, rescan the full range.** If there is any ambiguity about whether a row number is still valid within the run (e.g. two properties processed back-to-back in one conversation, or any sign that another process touched the sheet), fall back to a fresh full-range scan rather than trusting a carried-over row number. Efficiency never overrides the "verify before write" guarantee.

Every "scan for the flip token" instruction elsewhere in this document refers back to this protocol — including the Row-Reuse Rule — rather than restating it.

### Fallback scan method (used only if the v58 formula mechanism fails its verification check)

If the mandatory verification step above shows the connector does not evaluate written formulas, fall back to this method for every remaining scan and duplicate check in the run:

- **File + grep for every scan, not just the largest sheet.** For each of the three oversized-range fetches, pipe the full response to a local file and search that file with `grep` (exact string match) for the token. Do this consistently for all three sheets, not only whichever one happens to look biggest — the point is a uniform, low-overhead pattern that's also the *complete* check required by rule 3 above, not a shortcut around it.

### Efficiency Guidance (non-normative — does not change what must happen, only how)

These notes exist to speed up runs without weakening any rule above. Following them is encouraged but the mandatory rules above always win if there's ever a conflict.

- **Reuse a validated extraction script template.** Rather than authoring the Step 6B/6C extraction script from scratch each run, keep a known-good template already built around: `data-row-id`-filtered row selection with the `len(rows) == 15` assertion, `data-col`-based Credit/Debit cell selection (see Step 2 below), `.adj-text` note extraction, class-based label/value cell selection for Table 2 (no-`class` `<td>` for the label, `td.editable` for the value — see Step 5 below), and the footer variance note (`#delta-net`, `up_net`, `ap_footer` — see Step 4 below). Swap in only the new file path per run. This avoids re-deriving selector logic live and is the single biggest time saver available in the extraction stage of this workflow.
- **If the script's first-pass output ever looks wrong, that's a script bug — debug the script, don't fall into cell-by-cell live inspection as the default path.** This is the same principle Step 6B's Extraction execution method section states below; it's restated here because it's also the main efficiency lever, not just a correctness rule.

---

## TOOL USE RESTRICTION — READ THIS FIRST

For this workflow, use **only** the following tools and MCP servers:

- **Google Sheets [via Runlayer]** — for all sheet reads and writes in Steps 6B and 6C. All sheet activity in this workflow is scoped to the **CNML Data Hub** spreadsheet (`1ox5xlhexTMMWVSi24rm76MxTRf6iSUsPG0P2zAGBe8M`) only. This connector exposes exactly four tools — `fetch`, `update`, `append`, `get_metadata` — and **no batch call of any kind**. Do not attempt to call `batchGet`, `batchUpdate`, or any similarly-named tool; it does not exist on this connector and any attempt to call it will fail. Use `fetch` for every scan (single range per call), `update` for every overwrite (single range per call), and `append` for every new-row insert. Where this document refers to "the upfront scan" or "the Manual Data Raw write," issue the required calls as separate, sequential `fetch`/`update` calls, back-to-back with no intervening investigation — see the Full Action Sequence in Step 6C for the exact call order.
- **Google Drive [via Runlayer]** — for copying the letter template into the output folder and sharing with the Opendoor domain in Step 6D.
- **Google Docs [via Runlayer]** — for the batched find-and-replace in Step 6D. Call `Google Docs [via Runlayer]:apply_doc_updates` directly with an ordered batch of `replaceAllText` requests — do **not** route through the Runlayer GSuite Plugin or `execute_tool` for this step. This tool genuinely accepts an array of requests in one call; unlike the Sheets connector, no fallback is needed here.
- **Gmail [via Runlayer]** — **only** for sending the zero-proceeds notification email in Step 6D (negative-proceeds branch). Call `Gmail [via Runlayer]:send_email` directly. Do not use Gmail for any other purpose anywhere else in this workflow.

Do **not** initialize, call, or interact with any other connected tool or MCP server at any point during this workflow. All other connectors (Slack, Linear, Atlassian, Google Calendar, Ramp, Glean, Snowflake, etc.) must be ignored entirely — this workflow has no Snowflake step and no document extraction step, so there is no legitimate reason to call Snowflake or request source documents. Do not attempt to verify, ping, or handshake with any unlisted connector for any reason.

---

## BEFORE YOU RUN THIS PROMPT

Just upload the **Downloaded-with-State `_state.html`** file (generated via the ⬇ Download with State button in the calculator). No other documents, property address, or flip token need to be provided separately — all of it is read from the file.

---

## THE PROMPT

> I'm uploading a Downloaded-with-State HTML file for a Cash Plus DTC property deal. Run the full transfer-and-letter pipeline against it: parse the file, write all sheet destinations, and generate the release letter or send the zero-proceeds email, exactly as this prompt specifies.
> Never pause to ask me a question and never wait for my approval at any point in this workflow. If a value in the HTML is ambiguous, missing, or in doubt, follow the rules below exactly (blank over wrong, verbatim only) and record it as a flag or audit note — do not stop to ask me about it.

---

## STEP 6B — HTML FILE UPLOAD TRANSFER TO SHEETS

This step applies when the operator uploads a **Downloaded-with-State HTML file**. This is the **only** transfer path — there is no screenshot fallback and no live-build path to fall back to.

**If an operator sends a screenshot instead of an HTML file**, respond: *"Please use the ⬇ Download with State button in the HTML calculator and upload the downloaded `.html` file here instead of a screenshot. This gives me the exact values from structured HTML rather than image OCR, which is more accurate and faster."* Do not attempt to process a screenshot for sheet transfer.

---

### Filename guard — required before any extraction

**Before extracting any values from an uploaded HTML file**, check the filename.

The **⬇ Download with State** button always generates a filename ending in `_state.html` (e.g., `409_Mourning_Dove_Ct_Mebane_NC_27302_state.html`). Files generated directly during the initial calculator build are named after the address without that suffix (e.g., `409_Mourning_Dove.html`).

**If the uploaded filename does NOT end in `_state.html`:**

Stop immediately. Do not extract values. Do not transfer. Respond:

> "The file you uploaded (`[filename]`) appears to be the original generated file, not a Downloaded-with-State version. If edits were made in the calculator (e.g., revised closing costs, BRN, concessions), those edits are only in the downloaded file — not in the original. Please use the **⬇ Download with State** button in the open calculator and upload the resulting `_state.html` file instead."

Only proceed if the operator explicitly confirms they want to transfer the original file's values as-is, understanding that any browser edits will not be captured.

**If the filename ends in `_state.html`:** proceed with extraction as normal.

---

### Extraction execution method — mandatory (carried forward from v53)

**Write and run exactly one script that performs the entire Step 6B extraction in a single pass.** Every selector, row order, sign rule, and null-handling rule needed is already specified in full below — there is nothing to discover live, so extraction should not be carried out as a turn-by-turn investigation.

Concretely, this means:

- **One script, one run.** Implement every field in the tables and steps below — header metadata (address, token, CP version — no COE date), all 15 Table 1 Credit/Debit/Auto-Pull/note cells, the `up-net` footer, the AP footer, **the footer variance note (new in v58 — see Step 4)**, the Table 2 label-search for Estimated Upside Proceeds, and the seller name/email fields (with `[HS suggest]` prefixes stripped automatically, per the Verbatim Rule below) — in a single Python script, executed once against the uploaded file. Print (or write to one JSON file) every extracted value in one shot.
- **No incremental selector discovery.** Do not probe the DOM interactively — print a table, inspect it, adjust a selector, re-print, and so on — before committing to the real extraction. The selectors below (`tr.get("data-row-id")` for Table 1 row selection, `td[data-col="credit"]`/`td[data-col="debit"]` for Credit/Debit cell selection, `td.ap`, `.adj-text`, `id="up-net"`, `id="delta-net"`, the `"Field"`-header table search) are the actual selectors to use on the first attempt. If the script's output looks wrong after the single run, debug the script — don't fall back into a manual, cell-by-cell inspection loop as the default path. **The footer variance note specifically (new in v58) has been a repeat source of live, post-script investigation in past runs** — dumping the flagbox div, printing raw HTML around `<tfoot>`, checking siblings after the table — because the script never actually captured it. It requires no new investigation: `id="delta-net"` in the same `<tfoot>` as `id="up-net"` already contains the pre-computed delta text. Select it in the same pass as `up-net` and `ap_footer`.
- **Row-count assertion is mandatory (since v55).** Immediately after selecting Table 1 rows, assert that exactly 15 rows were matched (`assert len(rows) == 15`). If the assertion fails, that is a script bug (most likely: nested markup inside a cell being picked up by an overly broad selector) — fix the row-selection logic and re-run the single script once, rather than falling into a live, cell-by-cell investigation. This assertion exists specifically because a bare descendant selector (`#upside tbody tr`) can silently match nested `<tr>` elements from tooltip or detail sub-markup inside a Table 1 cell, inflating the row count past 15 and misaligning every downstream Credit/Debit/sign/AR mapping without any visible error. Filtering on `tr.get("data-row-id")` (see below) avoids this in the first place; the assertion is the backstop in case a future file's markup finds another way to break the count.
- **Credit/Debit selection is attribute-based, not position-based (since v56).** Select each row's Credit cell as `td[data-col="credit"]` and its Debit cell as `td[data-col="debit"]` — never by assuming the first `td.editable` in a row is Credit and the second is Debit. See Step 2 below for why this matters and the full selector detail.
- **Table 2 label/value selection is class-based, not position-based (new in v57).** Select each Table 2 row's label cell as the `<td>` with **no** `class` attribute, and its value cell as `td.editable` (i.e. `td` with `class="editable"`) — never by assuming the first `<td>` is the label and the second is the value. Every Table 2 row actually has four `<td>`s (checkbox, label, src-link, value, in that order) — see Step 5 below for the full selector detail.
- **No cross-source reconciliation.** Doc-side cell values (selected via `data-col`) and SF Auto Pull values (`td.ap`) are two independently-specified fields with two independently-specified destinations (see the column maps below) — never a single fact to be adjudicated between multiple sources. Extract both, exactly as each is specified, and move on.
- **No searching for fields this workflow doesn't use.** COE date is explicitly out of scope (see Step 1 below) — do not add fallback searches (meta line, page body, JS variables) looking for it. If a field isn't in the tables below, it isn't part of this extraction.
- **No hesitating over `[HS suggest]` annotations.** These are pre-approved, expected system markup on Table 2 fields — strip and use the value in the same pass, don't branch into a separate investigation or flag for it.
- **Verify once, not iteratively.** After the single script run, a brief sanity check against the visible HTML (e.g. spot-checking the address, token, and net proceeds sign) is reasonable. Repeated re-derivation of the same field is not — if the first read of a selector conflicts with a second read of the same selector, that is a script bug, not a reason to re-litigate which selector is "right" through further exploration.
- **This changes execution method only.** Every value this script produces must match what a careful manual read of the rules below would produce — same fields, same columns, same signs, same null-handling. If the script and the spec ever disagree, the spec below is authoritative and the script is wrong.

---

### How to extract values from the uploaded HTML file

The uploaded file is a complete self-contained HTML document. All values are baked into `contenteditable` elements in the DOM. Extract by element selector — do not OCR, do not infer, do not reconstruct from any other source.

**Step 1 — Extract header metadata**

Parse the `<h1>` tag for the **property address**.

Parse the metadata line immediately below `<h1>` for:
- **Flip Token** — labeled `Flip Token:` or appears after the `·` delimiter following seller name
- **CP Version** — labeled `CP Version:` or similar

**Do not extract COE date.** COE date is already tracked elsewhere in the system and is not part of this workflow's extraction or write targets. Do not search the meta line, page body, or any JS variable (e.g. `COE_DATE`) for it, and do not spend any extraction effort locating it — this was a real time sink in a prior run and there is nothing to find here that this workflow needs.

**Step 2 — Extract Table 1 rows (15 rows, fixed order)**

Table 1 has `id="upside"`. **Select body rows by filtering on the `data-row-id` attribute** (e.g. `[tr for tr in soup.select("#upside tbody tr") if tr.get("data-row-id") is not None]`) — **do not** use a bare `#upside tbody tr` selector on its own. A bare descendant selector also matches any `<tr>` nested inside a Table 1 cell (e.g. a tooltip or detail sub-table), which inflates the row count past 15 and silently misaligns every downstream Credit/Debit/sign/AR mapping in this section, since all of it depends on strict 0–14 row-position indexing. Filtering on `data-row-id` matches only genuine data rows regardless of what markup is nested inside a cell. **Immediately after selection, assert `len(rows) == 15`** — if this fails, it is a script bug (most likely nested-row contamination); fix the selector logic and re-run once, rather than debugging live cell-by-cell. Rows are always in this exact order (0-indexed):

| Row # | Subject | Credit col → Sheet | Debit col → Sheet | Sign rule |
|---|---|---|---|---|
| 0 | Resale Sales Price | D | — | positive |
| 1 | Acquisition Sales Price | — | E | negative |
| 2 | Cash Plus Hold | F | — | positive |
| 3 | Acq. Repair Credit | H | — | positive |
| 4 | **Subsidy / Upfront-Cash Charge-back** | — | **V** *(Manual Data Raw)* | **negative** |
| 5 | Service Fee | — | G | negative (0 if blank) |
| 6 | Acquisition Commission | — | I | negative |
| 7 | Renovation Repairs | — | J | negative |
| 8 | Listing Repairs | — | K | negative |
| 9 | BRN | — | L | negative |
| 10 | Holding Costs | — | M | negative |
| 11 | Resale Seller Concessions | — | N | negative |
| 12 | Resale Listing Broker | — | O | negative |
| 13 | Resale Buyer Broker | — | P | negative |
| 14 | Resale Closing Costs | — | Q | negative |

> **Row 4 — Subsidy / Upfront-Cash Charge-back.** Positioned in the calculator directly below Acq. Repair Credit and above Service Fee (confirmed against the live calculator UI). Like every other Debit-mapped row, read the raw Debit cell value (displayed as a positive figure) and store it as a **negative** number in the destination sheet column. It follows the general **empty cell = null, no exceptions** rule below — it has no "(0 if blank)" exception, unlike Service Fee. Its destination is **Manual Data Raw col V**, not one of the D–Q letters used by the other 14 rows — see Step 6C for why it's tracked separately.
>
> **Disambiguation note:** this "col V" is Manual Data Raw's column V, defined and written per Step 6C below. It is unrelated to the `V = flip token (repeat)` entry in the "Fixed cols built from metadata" list further down this section — that list describes a separate, wider column-mapping reference (cols S–AR) that is **not** written to by any step in this workflow's actual write sequence (see Step 6C Target Sheets, which scopes Manual Data Raw to doc-side figures only). Don't conflate the two.

**Credit/Debit cell selection — by `data-col` attribute, not editable-slot position (fixed in v56).** Within each row, select the Credit cell as `td[data-col="credit"]` and the Debit cell as `td[data-col="debit"]` — e.g. `row.select_one('td[data-col="credit"]')` / `row.select_one('td[data-col="debit"]')`. **Do not** select by assuming the first `td.editable` in a row is Credit and the second is Debit. On rows where one slot is *locked* rather than blank, the locked slot is not `.editable`, so a positional first/second-`td.editable` scan can pick up the wrong slot entirely and misassign the value to the wrong sign/column — this is a live extraction bug seen in practice, not a hypothetical. The `data-col` attribute is present regardless of whether a given slot is editable or locked, and correctly identifies which cell is Credit and which is Debit in every case. Read the `textContent` of each cell (whether editable or locked, the text content is still the value to extract). Strip `$` and `,` characters and parse as a float. If the cell's `textContent` is empty or contains only placeholder text ("enter amount"), treat as null/0.

**Upside Proceeds net (col R):** Read the `id="up-net"` element in `<tfoot>`. Strip formatting including any `−` or `$` characters, parse as signed float (negative if the element has class `net-neg`).

**Step 3 — Extract Auto Pull (SF) column**

For each row in the same `data-row-id`-filtered row set from Step 2 (do not re-select rows with a bare `#upside tbody tr` here — use the same 15-row list already selected and asserted above), the Auto Pull cell has `class="ap"`. Read `textContent`, strip `$`, `,`, and any `−`/`⚠️` characters, and parse as float. Apply signs per the column map below.

Auto Pull footer (col AL): read `#upside tfoot td.ap`. Apply sign — if displayed as `−$X`, store as negative.

**Auto Pull → Sheet column map (SF side):**

| Row # | SF field | Sheet col | Sign in sheet |
|---|---|---|---|
| 0 | Resale Sales Price SF | X | positive |
| 1 | Acquisition Sales Price SF | Y | positive |
| 2 | Cash Plus Hold SF | Z | positive |
| 3 | Acq. Repair Credit SF | AA | positive |
| 4 | Subsidy / Upfront-Cash Charge-back SF | *not written* | Manual Data Raw is doc-side only (see Step 6C); this AP-side figure is extracted only for delta/audit-note display, same as the doc-side value's use elsewhere |
| 5 | Service Fee SF | AM | negative |
| 6 | Acq Commission SF | AE | as stored |
| 7 | Renovation Repairs SF | AB | negative |
| 8 | Listing Repairs SF | AC | as stored |
| 9 | BRN SF | AD | as stored |
| 10 | Holding Costs SF | AF | negative |
| 11 | Seller Concessions SF | AG | negative |
| 12 | Listing Broker SF | AI | negative |
| 13 | Buyer Broker SF | AH | negative |
| 14 | Closing Costs SF | AJ | negative |
| footer | SF Upside Proceeds | AK | 0 (RESALE_SELLER_UPSIDE_PROCEEDS is 0 when fallback fires) |
| footer | SF Upside OD | AL | as displayed (negative if shown in red) |

**Step 4 — Extract Audit Notes (col AR)**

For each row in the same `data-row-id`-filtered row set from Step 2 (again, reuse the already-selected 15-row list — do not re-select with a bare `#upside tbody tr`), read the `.adj-text` span's `textContent`. If non-empty, format as `• [row subject label] — [note text]`. Join all non-empty notes with `\n`. This is col AR. This applies to all 15 rows, including the Subsidy / Upfront-Cash Charge-back row — no special handling needed, the extraction is generic per-row.

The row subject label is the `textContent` of the **second `<td>`** in each row (the Subject cell), stripped of any bracketed annotations `[…]`.

**Step 4B — Extract the footer variance note (new in v58 — for Sheet 3 col D, not col AR)**

This is a separate output from Step 4 above — Step 4 is per-row Table 1 audit notes (col AR); Step 4B is the single footer-level note that Manual Audit Notes col D also requires (see the Sheet 3 column layout in Step 6C). Prior versions left this to be re-derived live after the script ran, by manually inspecting `<tfoot>` and the markup after the table closes — this is no longer necessary; the value is already sitting in the same footer row as `id="up-net"`, selected in the same pass:

- Read `id="delta-net"` (in the same `<tfoot class="net-row">` as `up-net`) — its `textContent` is the pre-computed delta, e.g. `+$11,304.58`.
- Combine with the already-selected `up_net` and `ap_footer` values from this same script run into one sentence, using this exact format: `Footer: Upside Proceeds net (doc) $[up_net, formatted with commas] vs SF Auto Pull net (SF Upside OD) $[ap_footer, formatted with commas] — delta [delta-net textContent, verbatim].`
- If `id="delta-net"` is empty, missing, or shows only a placeholder (e.g. `—`), omit the footer note entirely rather than fabricating a delta — this follows the same "blank over wrong" principle as every other null-handling rule in this workflow.

This value is combined with the header flagbox warnings (already covered by the existing Step 1/Step 6C header-note extraction) to form Sheet 3 col D — see the Column layout table in Step 6C for the exact combination rule.

**Step 5 — Extract Table 2 (Estimated Upside Proceeds)**

Table 2 has no `id` — locate it as the table containing a `<th>` with text `"Field"`. **Do not rely on row position to find the Estimated Upside Proceeds value, and do not rely on `<td>` position within a row either (fixed in v57).**

**Label/value cell selection — by class, not by `<td>` position.** Every Table 2 row has **four** `<td>`s in this fixed order: a `cb-col` checkbox cell (`<td class="cb-col no-copy">`), the label cell (a plain `<td>` with **no `class` attribute at all**), a `src-col` "src" link cell (`<td class="src-col no-copy">`), and the value cell (`<td class="editable" contenteditable="true">`). "First `<td>` is the label, second `<td>` is the value" is never correct on this table — the checkbox cell sits ahead of the label, and the src-link cell sits between the label and the value. Select the label cell as the `<td>` with no `class` attribute (e.g. in BeautifulSoup, the `td` in `row.find_all("td")` whose `.get("class")` is `None`) and the value cell as `row.find("td", class_="editable")`. Both selectors are stable regardless of the checkbox/src-link columns around them and require no live inspection to get right on the first pass.

Using these selectors, iterate every data row and find the one whose label cell contains the text `"Estimated Upside Proceeds"`. Read that row's value cell `textContent`, strip `$` and `,`, parse as float. This is the value written to Accounting Audit col D.

This label-based row search is still required because row order can vary — never assume Estimated Upside Proceeds is at a fixed row index. The class-based cell selection above is a separate, additional fix — even once the correct row is found, "first/second `<td>` in that row" was still the wrong way to pick out the label and value within it.

**Fixed cols built from metadata:**
- A = property address (from `<h1>`)
- B = flip token
- C = CP version
- S, T, U = null
- V = flip token (repeat)
- W = CP version (repeat)
- AN = null
- AO = not extracted by this workflow (COE date lives elsewhere in the system — see the "Do not extract COE date" note in Step 1 above)
- AP = null
- AQ = null

> *Note: this list (cols S–AR) is a separate, wider reference and is not part of what Manual Data Raw actually receives in Step 6C — see the disambiguation note under row 4 above.*

---

### Verbatim rule

Read every value exactly as it appears in the HTML. Do **not** re-derive, recalculate, or substitute any figure from document extraction, Snowflake memory, or prior conversation. The HTML file contains the operator's validated figures and is the sole source of truth.

**Empty cell = null. No exceptions.**
If a Credit/Debit cell's `textContent` is empty, contains only whitespace, or matches the placeholder text "enter amount" — write **null** to that sheet column. This applies unconditionally, even if the SF Auto Pull cell for that row shows a non-zero value, and regardless of whether the cell is editable or locked. This includes the Subsidy / Upfront-Cash Charge-back row — if its Debit cell is blank, col V is null, not 0.

Do not backfill. Do not infer. An empty cell in the HTML means the operator left it blank intentionally or the document had no figure. Write null and move on.

**Row placement is authoritative:** Assign each value to the sheet column that maps to its row position in the HTML (0–14 as defined above) — not based on what the value logically represents. If an operator has manually entered a value in an unexpected row, it goes to that row's column.

**`[HS suggest]` tags — strip silently, no flag needed.** Table 2 fields (e.g. Seller Email) may be baked in with a leading `[HS suggest]` annotation (e.g. `[HS suggest] name@example.com`). This is expected, known system behavior — it has been reviewed and is approved for use as-is. Strip the `[HS suggest]` prefix and any surrounding brackets/whitespace, and use the remaining value normally, exactly as if the annotation weren't there. Do not pause, do not flag it to the operator as unconfirmed or needing review, and do not treat it differently from any other baked-in Table 2 value.

---

## STEP 6C — WRITE AUDIT NOTES AND ACCOUNTING AUDIT

This step runs **automatically** whenever an HTML file is processed — no separate instruction from the operator is required.

### Target sheets

The only sheet destinations in this workflow are within the **CNML Data Hub** spreadsheet (`1ox5xlhexTMMWVSi24rm76MxTRf6iSUsPG0P2zAGBe8M`):
- **Manual Data Raw** (Sheet 2, cols A–R plus col V, doc-side only)
- **Manual Audit Notes from Screenshots** (Sheet 3, 4 cols A–D)
- **Accounting Audit** (col D = Estimated Upside Proceeds, col T = release letter link; cols P/Q reserved for the zero-proceeds branch only — see Branch B)

**Column V — Subsidy / Upfront-Cash Charge-back.** Sourced from Table 1 row 4 (0-indexed) Debit cell (`td[data-col="debit"]`) — the row directly below Acq. Repair Credit and above Service Fee. Store as a **negative** value, same sign convention as every other Debit-mapped row. Empty/placeholder cell → null, no exception (general rule above applies).

Cols S–U are not part of this addition and remain untouched/reserved. Because col V is not adjacent to the existing A–R range, and because the `update` tool accepts only one range per call, **write A:R and V as two separate sequential `update` calls against the same target row** (`Manual Data Raw!A{row}:R{row}` first, then `Manual Data Raw!V{row}`), issued back-to-back with no other action in between. Do not fold V into the A:R array itself; extending the array to reach V would require placeholder values for the S–U gap, and null placeholders in row arrays risk column-shift errors.

**Column layout — Manual Audit Notes from Screenshots (Sheet 3)**

| Col | Field | Source |
|---|---|---|
| A | Flip Token | HTML header metadata |
| B | Property Address | HTML `<h1>` |
| C | Subject — Audit Notes | All non-empty `.adj-text` spans, formatted as `• [Subject] — [note]`, newline-separated |
| D | Header & Footer Notes | Any warning/flag `<div>` text in the page header above Table 1 (the `flagbox` div), plus the footer variance note (see Step 4B — sourced from `id="delta-net"` plus `up_net`/`ap_footer`, extracted in the same single-script pass, not derived live), written as paragraph text. Newline between header warning and footer note if both present. |

**Upsert logic — Sheet 3**

1. Confirm the row for the flip token in col A of `Manual Audit Notes from Screenshots` from the upfront scan (below), per the Scan Range & Duplicate-Prevention Protocol and its Row-Reuse Rule.
2. If found → overwrite that exact row (A:D).
3. If not found → append as a new row.
4. Run the mandatory post-write duplicate check from the Protocol above before moving on.

---

### Full action sequence when an HTML file is received

When the operator uploads a Downloaded-with-State HTML file, Claude performs all of the following steps in order without waiting for separate instructions:

1. **Parse** the HTML — extract header metadata (address, token, CP version — **not** COE date, which this workflow does not extract), all 15 Table 1 Credit/Debit cells (selected via `data-col`, including the Subsidy / Upfront-Cash Charge-back row), all Auto Pull cells, the Upside Proceeds net, all Audit Notes spans, all header/footer warning text, and the Estimated Upside Proceeds from the Table 2 row whose Field label cell contains the text "Estimated Upside Proceeds" (search by label, not by row position).

2. **Upfront scan — one `get_metadata` call, then three sequential scratch-formula cycles, issued back-to-back.** First, per Step 0 of the Scan mechanism section above, call `get_metadata` once against the CNML Data Hub spreadsheet and compute each of the three sheets' scratch cell from its actual `columnCount`, sanity-checked against that sheet's real write range. Then write-fetch-clear the `COUNT`/`ROW` scratch formula at each sheet's discovered scratch cell, in immediate succession with no investigation or reasoning step between sheets:
   - Manual Data Raw (token col B, scratch cell discovered in Step 0)
   - Manual Audit Notes from Screenshots (token col A, scratch cell discovered in Step 0)
   - Accounting Audit (token col A, scratch cell discovered in Step 0)

   Perform the mandatory formula-evaluation verification (does the first fetched result start with `COUNT:`, not `=`) on the very first of these three cycles — if it fails, fall back to the v57 fetch-and-grep method (`A1:A20000` / `B1:B20000`) for these three sheets and every remaining check this run. If Step 0's sanity check ruled out the formula mechanism for a specific sheet (its actual grid is too narrow), use the v57 fetch-and-grep method for that sheet specifically, regardless of how the other two sheets are being checked. Each check is still evaluated exactly per the Scan Range & Duplicate-Prevention Protocol (exact match, whitespace-trimmed, case-sensitive, **checked in full across the entire range — no partial or sampled checking**, per rule 3 of the Protocol). Record the matching row number (or "not found," or a flagged duplicate count) for the flip token on each of the three sheets. These are each sheet's **first scan of the run** under the Row-Reuse Rule — every later reference to these same sheet/token pairs in this run reuses these row numbers with single-cell re-reads (plain `fetch` calls, no formula involved) rather than rescanning.

3. **Write Manual Data Raw** — upsert doc-side A–R row (18 columns) via one `update` call, then the col V cell (Subsidy / Upfront-Cash Charge-back, stored negative) via a second `update` call, both against the confirmed (or newly-appended) row, issued back-to-back — see Step 6C above. Run the post-write duplicate check from the Protocol above.

4. **Write Sheet 3** — upsert A:D row to `Manual Audit Notes from Screenshots` using the row confirmed in step 2 above (no rescan needed — this is the same run's already-confirmed result). Run the post-write duplicate check.

5. **Write Accounting Audit col D** — using the row confirmed in step 2 above for Accounting Audit col A (no rescan needed):
   - **If a row was found** → before writing, re-read that single cell (`Accounting Audit!A{row}`) via a single `fetch` call to confirm it still equals the flip token, per the Row-Reuse Rule, then write the Estimated Upside Proceeds value into col D of that row via `update` (overwrite).
   - **If no row was found** → append a new row via `append`, with col A = flip token and col D = Estimated Upside Proceeds value. Do not skip.
   The Estimated Upside Proceeds value is the one extracted in Step 1 of this sequence. If that extraction returned null or blank, write null to col D and note it in the confirmation summary.
   Run the mandatory post-write duplicate check from the Protocol above. If this write was an append (row didn't previously exist), the *next* duplicate check anywhere else in this run against Accounting Audit must be a fresh full-range rescan, per the Row-Reuse Rule's append caveat — the row numbers confirmed in step 2 are no longer trustworthy without reconfirmation once a row has been added to that sheet.

6. **Generate Cash Now More Later release letter, OR send zero-proceeds email** — see Step 6D below. Branch is determined by the sign of the Upside Proceeds net: positive → release letter (Branch A, single unified template for one or two sellers, writes the draft link to Accounting Audit col T — does **not** write col P or col Q); negative → zero-proceeds email via Gmail (Branch B, updates Accounting Audit col P to "Automation" and col Q to "Zero Proceeds").

7. **Confirm** all writes, the letter link (or email confirmation), and any Accounting Audit column updates with row numbers and a brief summary — including the col V value written (or "null" if the row was blank) as its own line item.

---

## STEP 6D — GENERATE RELEASE LETTER (POSITIVE) OR SEND ZERO-PROCEEDS EMAIL (NEGATIVE)

This step runs **automatically** after all sheet writes in Step 6C complete — no separate instruction from the operator is required.

### Proceeds sign gate — required before proceeding

Before doing anything in this step, check the sign of the Upside Proceeds net from the HTML:

- Read the `id="up-net"` element in `<tfoot>`.
- If the element has class `net-pos` and the value is positive → proceed to **Branch A — Release Letter** below.
- If the element has class `net-neg` **or** the displayed value begins with `−` → the proceeds are **negative**. **Skip the letter entirely** — do not copy the template, do not run any replacements, do not post a letter link. Instead proceed to **Branch B — Zero-Proceeds Email** below.

---

### BRANCH A — RELEASE LETTER (positive proceeds)

### What it does

Copy the release letter template into the designated output folder, fill in the property-specific fields from the HTML, and post the resulting Google Doc link so the operator can confirm it — the link itself is delivered by writing it to Accounting Audit col T (Step 5 below). This is the **only** release letter template in this workflow — it is used for both one-seller and two-seller deals. There is no seller-count-based template branching.

**Confirm seller count from Table 2, row 1 (Seller Full Name), as baked into the HTML.** This count only affects which placeholders get filled below — it does not affect which template is used or whether Accounting Audit is written to.

### Template and output folder

- **Template Document ID:** `18wJdU5wuzdXO3FH5M_vvw3_WHZC0t0zV8saM-2yeSqM`
- **Template URL:** https://docs.google.com/document/d/18wJdU5wuzdXO3FH5M_vvw3_WHZC0t0zV8saM-2yeSqM/edit
- **Output folder ID:** `1qLc4Vcg-OgOJKjw0XUkRex1maSMJrNf3`
- **Output folder URL:** https://drive.google.com/drive/folders/1qLc4Vcg-OgOJKjw0XUkRex1maSMJrNf3

**Template structure:** This template has **two parts**: a cover page (added July 2026) followed by the release letter and signature table.

- **Cover page** — a short intro email-style note beginning "Hello [Seller]," with Ramp/W-9 next-steps instructions. Contains exactly one placeholder: `[Seller]` (title case, in "Hello [Seller],").
- **Release letter + signature table** — contains `[Seller(s)]`, `[Property]`/`Property Address`, `Date:`, `in the amount of $____,`, `[SELLER]` (all-caps, two occurrences), `[EMAIL]`, and `[SELLER 2, if applicable]`.
- **Bottom-of-document identifier (new in v60)** — after the signature blocks, the template contains a single `[Identifier]` placeholder. This is filled with the flip token for this deal (see Step 3, order 9, below) — it is not part of the cover page or the release letter body/signature text, but it is filled in the same batched `apply_doc_updates` call as everything else.

- **Two sellers:** use the full name string joined with `&` for `[Seller(s)]` in the salutation. Use the first seller's name (e.g. "Keith T. Whelan") for `[Seller]` (cover page) and `[SELLER]` (body and signature). The second seller's name fills `[SELLER 2, if applicable]` in the signature table.
- **One seller:** use that seller's full name for `[Seller]`, `[Seller(s)]`, and `[SELLER]`. The `[SELLER 2, if applicable]` placeholder is **removed** rather than filled — delete the placeholder text (and, if the signature table has a dedicated blank signature line/row for a second signer, leave that line blank rather than deleting the row itself, so the document doesn't need structural editing). Do not write a seller name, blank, or any other filler into `[SELLER 2, if applicable]` for a one-seller deal — it should simply not appear in the finished document.

### Fields to extract from the HTML

| Field | Source in HTML |
|---|---|
| Property address | `<h1>` text content |
| Seller full name(s) | Table 2, row 1 — Seller Full Name editable cell. This value is expected to be sourced from the **Acquisition Final Settlement Statement (ALTA)** — not the Cash Plus Program Agreement — since the ALTA seller name is the authoritative source for the release letter. This provenance is established upstream when the calculator/`_state.html` is built; Step 6D does not re-extract or re-derive it here — it simply reads the value as baked into Table 2. |
| Seller email | Table 2, row 2 — Seller Email editable cell |
| Upside proceeds net | `id="up-net"` element in `<tfoot>` — strip `$`, `−`, and commas, parse as absolute value, reformat with commas e.g. `52,736.37` |
| Today's date | The date Claude executes Step 6D, formatted `Month D, YYYY` (e.g. `July 19, 2026`) |
| Flip token (new in v60) | HTML header metadata, Step 1 of Step 6B — same value already used for the sheet scans/writes earlier in this run. Fills the `[Identifier]` placeholder (see Step 3, order 9, below). |

### Step-by-step execution

**Step 1 — Copy the template into the output folder**

Use `Google Drive [via Runlayer]:copy_file` with:
- `file_id`: `18wJdU5wuzdXO3FH5M_vvw3_WHZC0t0zV8saM-2yeSqM`
- `new_name`: `Cash Now More Later - [PROPERTY ADDRESS]`
- `parentFolderId`: `1qLc4Vcg-OgOJKjw0XUkRex1maSMJrNf3`

This single call both creates the copy and places it in the output folder (https://drive.google.com/drive/folders/1qLc4Vcg-OgOJKjw0XUkRex1maSMJrNf3) — do not follow up with a separate `move_file` call.

Record the new document ID from the response.

**Step 2 — Share with Opendoor domain**

Use `Google Drive [via Runlayer]:share_file` on the new document ID:
- `file_id`: the new document ID from Step 1
- `type`: `"domain"`
- `domain`: `"opendoor.com"`
- `role`: `"reader"`

This makes the doc accessible to anyone at Opendoor via the link.

**Step 3 — Run the batched find-and-replace**

Use `Google Docs [via Runlayer]:apply_doc_updates` directly on the new document ID (do **not** use the Runlayer GSuite Plugin or `execute_tool` for this — call the tool directly). This tool genuinely accepts an ordered array of requests in a single call, so no fallback is needed here. Issue **one call** carrying an **ordered array** of `replaceAllText` requests, in this exact array order — batched `replaceAllText` requests execute in array order, which preserves the same ordering guarantees v51 relied on when it ran these as separate sequential calls. `replaceAllText` matching is case-insensitive by default, so array order still matters exactly as it did before:

| Order | Find | Replace with | Notes |
|---|---|---|---|
| 1 | `Hello [Seller],` | `Hello [SELLER_NAME],` | Cover page greeting. Must be **first** in the array — matching on the full phrase `Hello [Seller],` (not bare `[Seller]`) prevents this from also matching inside `[Seller(s)]` or being caught by the later all-caps `[SELLER]` request, since matching is case-insensitive. Use the same first/only seller name used for `[SELLER]` elsewhere in the doc. |
| 2 | `[Property]` | Property address | Re: line |
| 3 | `Property Address` | Property address | Body paragraph |
| 4 | `[Seller(s)]` | Seller name (joined with `&` if two) | Salutation |
| 5 | `in the amount of $____,` | `in the amount of $[NET],` | Use formatted net e.g. `in the amount of $52,736.37,` — targets only the proceeds line, not signature underscores |
| 6 | `[SELLER]` | First (or only) seller name | Body + signature table — both occurrences |
| 7 | `[EMAIL]` | Seller email | Body paragraph |
| 8 | `[SELLER 2, if applicable]` | Second seller name **if two-seller deal**; if one-seller deal, replace with empty string to remove the placeholder cleanly | Signature table |
| 9 | `[Identifier]` | Flip token for this deal, exactly as extracted from HTML header metadata in Step 1 of Step 6B | New in v60 — bottom-of-document identifier, after the signature blocks. Same value used elsewhere in this run for the sheet scans/writes. Applies identically for one- and two-seller deals. Must be this run's own extraction for this property — never carried over from a prior turn, prior property, or prior conversation (same stale-value principle as the col T `NEW_DOC_ID` guard in Step 4 below). |

**This is now a 9-item batch (was 8 in v59, 9 through v57 for an unrelated reason) — the date-line fill is handled separately, below, not in this batch.**

**If `apply_doc_updates` is unavailable or rejects the batched request for any reason**, fall back to issuing the same nine `replaceAllText` requests as separate sequential `replace_text` calls, in the same order — do not skip any entry or change the order to compensate. Note in the confirmation summary that the fallback path was used.

**Step 3A — Fill the date line directly (removed from the batch in v58 — go straight to `replace_text`)**

Through v57, the date-line fill (`Date:\n\nRe:` → `Date: [TODAY]\n\nRe:`) was attempted inside the `apply_doc_updates` batch above, using the compound two-newline pattern to avoid also matching the blank corporate/seller signature-block `Date:` lines. **This has returned zero matches every time it has been tried** — `apply_doc_updates`'s `replaceAllText` does not match multi-paragraph patterns on this connector. v58 stops attempting it in the batch and calls the known-working method directly instead:

Use `Google Docs [via Runlayer]:replace_text` with a **single** newline:
- `document_id`: the new document ID from Step 1
- `find`: `Date:\nRe:`
- `replace`: `Date: [TODAY]\nRe:` (formatted `Month D, YYYY`)

This targets only the top-of-letter date line, for the same reason the compound pattern was originally chosen — the letter's `Date:` line is immediately followed by `Re:` with no blank paragraph in between once rendered, while the signature-block `Date:` lines are not. A bare `Date:` match (no `Re:` following) would still incorrectly hit every signature-block date line, so this constraint stays — only the newline count differs from what earlier versions assumed.

Run this call after the Step 3 batch (order relative to the batch doesn't matter — the two don't touch overlapping text).

**Step 3B — Remove grey/shaded highlight**

After the text replacements, check the copied document for any grey/shaded background on paragraphs or table cells (this is formatting inherited from the template, not text content, so it will not show up in a plain `fetch` text dump — inspect visually if a rendering tool is available, or rely on the operator's report if the shading is visually confirmed). Clear any such shading so the document renders on a plain white background. If the available Google Docs tools cannot remove paragraph/cell background shading directly, note this limitation explicitly in the confirmation summary rather than silently leaving the document shaded, and point the operator to manually clear it (Format → paragraph styles / table properties → background color → white).

**Step 4 — Write the draft letter link to Accounting Audit col T**

Before posting anything to the operator, write the link to Accounting Audit **first** — the confirmation message in Step 5 below depends on knowing the row number.

**Stale-link guard — read this before writing.** The `NEW_DOC_ID` written to col T must be the document ID returned by **this run's own** Step 1 `copy_file` call for **this specific property/token**, never a value carried over from a prior turn, a prior property, or a prior conversation. Before writing, restate the `NEW_DOC_ID` and the flip token together and confirm both were produced in the same pass of this workflow. If there is any ambiguity about which `NEW_DOC_ID` belongs to which token — for instance, processing more than one property in sequence — do not proceed on assumption; re-derive the doc ID from the Step 1 response for the token currently being written, even if that means re-reading it from earlier in this same turn.

Use the Accounting Audit col A row number already confirmed for this token in Step 6C (from the upfront scan in step 2 of the action sequence, or from the append in step 5 if this token's row didn't previously exist) — no rescan needed here per the Row-Reuse Rule, **unless** a row was appended to Accounting Audit at any point since that row number was confirmed, in which case re-scan the full oversized range fresh before proceeding (see Row-Reuse Rule's append caveat):

- **If a row number is available and still trustworthy per the above** → **before writing**, re-read col A of that exact row number back (single-cell read, `Accounting Audit!A{row}`, via a single `fetch` call) and confirm it still equals the flip token — do not trust a row index carried over without this single-cell reconfirmation, since row counts can shift between the earlier scan and now if rows are appended by any other process in between. Only after this confirmation, write the full Google Doc URL (`https://docs.google.com/document/d/[NEW_DOC_ID]/edit`) to col T of that same row via `update` (overwrite whatever was there).
- **If not found** — this should almost never happen, since col D was already written to this exact token's row in Step 6C moments earlier. Treat a "not found" result here as a signal to double-check the scan itself, not as routine: re-run a fresh full oversized-range scan once more before concluding the token is genuinely absent. Only append a new row (via `append`) with col A = flip token and col T = the doc link if this second scan also confirms no existing row. This double-check exists specifically because of the `5RXRHWAMPNAV1` incident, where a truncated scan range (not a genuinely missing row) caused an unnecessary append.
- **After the write completes**, re-read col A and col T of the target row as a final check that col A still matches the flip token and col T now contains the correct doc link, and that the doc ID in that link matches the `NEW_DOC_ID` from this run's Step 1 call for this token. If the verification fails — col A doesn't match, col T is blank/wrong, or the doc ID belongs to a different property — stop, do not report success, and flag the mismatch explicitly in the confirmation summary with the row number and both expected and actual values.
- **Never write the same `NEW_DOC_ID` to two different rows.** Each release letter is a distinct document for a distinct property; if the same doc link is about to be written to a second token's row, that is a signal something upstream (doc ID tracking, not the token scan) has gone wrong — stop and flag it rather than writing.
- **Run the mandatory post-write duplicate check** from the Protocol above: confirm exactly one row matches this exact token. If a fresh full-range scan is warranted per the Row-Reuse Rule (i.e. an append happened on this sheet earlier in the run), use that; otherwise the row-number-plus-single-cell-confirmation from above satisfies this, since no append has occurred to invalidate it. If more than one row matches, stop, do not report success, and flag both row numbers.

**This is the only Accounting Audit write in Branch A.** Do not write col P, col Q, or any other column in this spreadsheet as part of generating the release letter, regardless of seller count. Col P/col Q are written **only** in Branch B (zero-proceeds email) below.

**Step 5 — Post the confirmation**

After the col T write in Step 4 succeeds, output the following to the operator:

> **✓ Cash Now More Later letter generated:**
> https://docs.google.com/document/d/[NEW_DOC_ID]/edit
> This link has been saved to Accounting Audit col T, row [ROW_NUMBER], and the file lives in the release-letter output folder.
>
> Sellers: [Seller name(s)] · Proceeds: $[NET] · Email: [seller email]
>
> Please see the attached release letter supporting your final proceeds. Once signed by all parties this will be forwarded to accounts payable for processing. Thank you for participating in the Cash Now More Later program.

**No Jira reference of any kind.** The draft link is delivered exclusively via the Accounting Audit col T write — do not tell the operator to save, copy, or attach the link to a Jira ticket anywhere in this confirmation or elsewhere in Branch A.

**Breakdown line is required, not optional.** Directly beneath the letter link and col T confirmation, always post a single line summarizing: seller name(s) (the same string used for `[Seller(s)]`), the proceeds amount (the same formatted net used for `in the amount of $[NET],`), and the seller email address (the same value used for `[EMAIL]`). Use the format shown above — `Sellers: … · Proceeds: $… · Email: …`.

**Closing note required.** Directly beneath the seller breakdown line, always post the following fixed note verbatim (do not paraphrase or omit it):

> Please see the attached release letter supporting your final proceeds. Once signed by all parties this will be forwarded to accounts payable for processing. Thank you for participating in the Cash Now More Later program.

**Do not mention col P or col Q in this confirmation** — neither is written as part of the letter path, for either one-seller or two-seller deals.

### Failure handling (Branch A)

If the copy or any replacement fails, note the error and continue — do not block the confirmation summary. If the copy succeeded but `parentFolderId` was rejected or ignored for any reason, check where the copy actually landed and note this explicitly rather than assuming it's in the output folder — do not silently report success if the file isn't in the target folder.

The operator can fall back to the template manually:
https://docs.google.com/document/d/18wJdU5wuzdXO3FH5M_vvw3_WHZC0t0zV8saM-2yeSqM/edit

The designated output folder is:
https://drive.google.com/drive/folders/1qLc4Vcg-OgOJKjw0XUkRex1maSMJrNf3

---

### BRANCH B — ZERO-PROCEEDS EMAIL (negative proceeds)

### What it does

When the resale nets to a loss (no proceeds owed to the seller), no release letter is generated. Instead, Claude sends a direct notification email to the seller via Gmail, informing them there are no additional proceeds to disburse.

### Fields to extract from the HTML

| Field | Source in HTML |
|---|---|
| Property address | `<h1>` text content |
| Seller full name | Table 2, row 1 — Seller Full Name editable cell (ALTA-sourced, same provenance as Branch A — see note there). For the email greeting, use the first seller's first/full name the same way Branch A uses `[SELLER]` (first name only if two sellers, e.g. "Keith T. Whelan"). |
| Seller email | Table 2, row 2 — Seller Email editable cell. This is the **To** address. |

### Email composition

- **From:** `executive.experience@opendoor.com`
- **To:** the seller email extracted above
- **Cc:** `executive.experience@opendoor.com`
- **Subject:** `Cash Now, More Later - [Property Address]` — substitute the actual property address
- **Body** (verbatim — do not paraphrase, only substitute `[Seller]`):

```
Hello [Seller],

This is the Executive Experience Specialist at Opendoor, following up regarding the Cash Now, More Later Program Agreement.

This message is to inform you that after reselling your home, there are no additional proceeds to disburse to you after accounting for resale costs. While understanding this may not be the outcome we all were hoping for, please refer to your Cash Now, More Later Program Agreement and contact us if you have any questions.

Thank you,

Opendoor
```

### Step-by-step execution

**Step 1 — Send the email**

Use `Gmail [via Runlayer]:send_email` directly with:
- `from`: `executive.experience@opendoor.com`
- `to`: seller email (from Table 2)
- `cc`: `executive.experience@opendoor.com`
- `subject`: `Cash Now, More Later - [Property Address]`
- `body`: the verbatim template above with `[Seller]` substituted for the seller's first/full name (same convention as `[SELLER]` in Branch A)
- `html`: `false` (plain text)

**Step 2 — Update Accounting Audit col P and col Q**

Use the Accounting Audit col A row number already confirmed for this token earlier in this run (per the Row-Reuse Rule, with the same append-caveat and single-cell reconfirmation-before-write requirement described in Branch A Step 4 above):

- **If a row is confirmed** → write `Automation` to col P (Processing Owner) and `Zero Proceeds` to col Q of that row via `update` (overwrite whatever was there in each — one `update` call can cover both if they're addressed as a single `P{row}:Q{row}` range, since P and Q are adjacent).
- **If not found** — this should almost never happen since col D was already written to this token's row in Step 6C moments earlier; re-run a fresh full oversized-range scan once more before concluding the token is genuinely absent, then append a new row (via `append`) with col A = flip token, col P = `Automation`, and col Q = `Zero Proceeds` only if this second scan also confirms no existing row.
- **Run the mandatory post-write duplicate check** from the Protocol above. If more than one row matches, stop, do not report success, and flag both row numbers.

**Step 3 — Post confirmation**

After the email sends and col P/col Q update, output to the operator:

> **✓ Zero-proceeds notification sent:**
> Sent to [seller email] · Cc: executive.experience@opendoor.com
> Subject: Cash Now, More Later - [Property Address]
> Accounting Audit col P updated to "Automation" · col Q updated to "Zero Proceeds."

### Failure handling (Branch B)

If the email send fails, note the error explicitly in the confirmation summary and do not silently mark col P or col Q as updated — only update col P and col Q after the email send is confirmed successful.

---

## END OF WORKFLOW

There is no Step 7. Once Step 6D completes (letter link posted, or zero-proceeds email confirmed), the workflow is done for that deal. The operator's next action is uploading the next `_state.html` file for the next deal.
