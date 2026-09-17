# Version 2 validation — review candidate

Rebuilt September 17, 2026 after the reported failed coworker run. **Not certified for unattended production use.** The failure path on Jacob's computer is not yet established because its task transcript and receipts were not supplied.

## Results

- 33 offline regression checks passed in the package's independent Python environment; full results are in test-results.txt.
- The skill frontmatter validator passed.
- The supplied Downloads v60 file matches the bundled original-v60.md byte-for-byte.
- The original end-to-end project's 327 captured files under automation, skills and runs have unchanged hashes compared with the start of this rebuild.
- No live Google Sheet, Drive, Docs or Gmail mutations were performed during this rebuild. The existing duplicate and draft were not repaired.

## What the added checks cover

An existing exact token at row 1465 is updated in place; an additional match at row 1475 stops all mutations. Complete TSV parsing preserves blank offsets; narrowed and explicitly truncated/summarized receipts are rejected. Accounting D receives the extracted estimate, positive T receives the current draft link, and positive P/Q plus all business G/U writes are rejected. Appends require a captured full fresh absence result. Wrong folder IDs and inaccessible folder/template preflight stop the positive workflow; a copy returned in another parent cannot advance. Written figures are read back before communication. Tool availability is recorded for the uploaded token/hash before execution.

Existing tests still cover positive/negative/zero branches, one/two sellers, exact full-column matching, duplicates beyond earlier row ceilings, row moves, scratch cleanup/fallback, uncertain copy/send receipt handling, fixed email content, nine letter replacements, and final link/status verification.

## Limits

Tests simulate connector responses. They do not prove that a fresh Codex session on another machine will follow the runner, that its required direct tools are present, or that the account has folder and Send As access. AGENTS.md provides discoverable project routing, but it cannot technically prevent an agent with unrestricted tools from bypassing it. The next acceptance step is read-only preflight in Jacob's opened project; a later live test needs an explicit execution request and a property without unresolved prior work.

Full-column checks depend on the connector honoring the requested range and accurately reporting completeness. The agent must preserve the complete original tool response, not manually reconstruct a summary. A local ledger is not a distributed lock. An unrecorded previous email requires operator reconciliation. Plain-text Docs verification cannot establish shading; the existing formatting limitation remains.

Version 1 checkpoints are not silently upgraded or reset. Do not discard the failed run's receipts. This rebuild preserves v60 business mappings; additional controls and resolved historical contradictions are documented in REBUILD-REVIEW.md.
