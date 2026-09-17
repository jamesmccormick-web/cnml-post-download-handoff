# Validation and separation

Built September 17, 2026 for Codex. The original end-to-end CNML automation was only read; no original skill, helper, checkpoint, ledger or operational record was edited. All six source files captured at the start still match their recorded SHA-256 values in source-hashes.json.

## Portable-copy changes

- The prepare command accepts an uploaded Download with State HTML file directly, rather than requiring the original browser-stage session.
- Python is selected through CNML_PYTHON or python3; the original project's private virtual environment is not required.
- Authorization records the operator's source-review, program-agreement email, and exclusive-processing confirmations.
- An added prior-output check stops when the matched Accounting Audit row already has a proceeds status in Q or a draft link in T, before business-data writes or communication. This supplements the separate local ledger; it does not provide cross-computer locking or prove no unrecorded email was sent.
- No changes to destination IDs, financial mappings, blank handling, email text, release-letter replacements, or branch result writes.

## Checks completed

24 offline tests passed using a newly created independent Python virtual environment. These cover positive, negative and zero proceeds; one/two-seller handling; exact matching and blank row offsets; row moves and duplicates; scratch fallback; final letter-link checks; confirmed versus uncertain email receipts; uncertain copy prevention; direct tool-call emission/response preservation; uploaded-file preparation; source hash changes; duplicate/active ledger guards; and existing sheet outcome checks.

The skill frontmatter validator passed. Documentation links and ZIP contents were checked. No live sheet edits, emails, Drive copies, permission changes or scheduling were performed to build or test this handoff. Coworker connector access and Send As permissions still need verification in their own Codex environment. Text verification cannot establish document background shading; the workflow retains the manual formatting notice.

The ZIP excludes virtual environments, live state files, run histories, credentials and private source documents. It includes the approved internal destination identifiers and source playbook. No repository was published and no package was uploaded or sent to the coworker.
