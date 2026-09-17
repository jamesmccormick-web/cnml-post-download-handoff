# CNML post-download handoff — upload-trigger update

The first coworker run was reported to create a duplicate Accounting Audit row and write outside the intended v60 scope. **Do not use the original v1 ZIP for further runs.** This rebuild includes upload-trigger execution; it has not yet passed a live run on Jacob's computer.

- [Setup and operator request](START-HERE.md)
- [Version 2 ZIP](cnml-post-download-handoff.zip)
- [Codex project execution rules](AGENTS.md)
- [What failed, what is known, and what changed](REBUILD-REVIEW.md)
- [Validation and remaining limits](VALIDATION.md)
- [Supplied v60 reference](cnml-post-download/references/original-v60.md)

Submitting a reviewed Download with State HTML file starts the workflow automatically, including a blank accompanying message. Say “preview only” to prevent changes. It updates the three CNML Data Hub tabs, then prepares a positive-proceeds release-letter draft or sends the exact zero/negative-proceeds notification. The original end-to-end automation remains separate and unchanged.

The repository contains code, documentation and synthetic tests, not live seller files, credentials or operational receipts. Use it as an opened Codex project so AGENTS.md is read. A generic chat with a repository URL is not evidence that the runner was used.
