# CNML post-download workflow for Codex

Send your coworker `cnml-post-download-handoff.zip`. This is a standalone copy of the stage after **Download with State**. The original end-to-end CNML agent is unchanged.

## Coworker setup

1. Unzip into a durable local folder and open that folder as a Codex project. Keep using this same folder for later properties so its completion ledger survives.
2. Have the approved Runlayer Google Sheets, Google Drive, Google Docs and Gmail connectors available in Codex, with access to the CNML Data Hub, release-letter template and output folder. Sending requires permission to send as `executive.experience@opendoor.com`. This ZIP does not install connectors or contain credentials.
3. Ask Codex to read `cnml-post-download/SKILL.md`, check its required tools, and set up the local dependencies described there. No browser audit or browser extension is needed for the post-download stage.
4. Attach one reviewed `*_state.html` file and use the request below. The file must already contain the seller email verified from the program agreement. Do not send the same property to another worker at the same time.

## Request to paste into Codex with the file

Use the skill at cnml-post-download/SKILL.md to process this uploaded Download with State HTML file through the standalone downstream workflow. The audit and source review are complete, and the seller email in the file is the designated program-agreement email. I confirm this property is assigned exclusively to this run and that no other operator has sent its proceeds notification or created its release letter. Resume any existing checkpoint first. Update the three CNML Data Hub tabs; for zero or negative proceeds, send the specified notification to the seller email in this file from and copied to executive.experience@opendoor.com; for positive proceeds, create and prepare the release-letter draft in the designated output folder, share it reader-only with opendoor.com, and record its link. Do not send the positive letter to the seller, sign anything, or disburse money. Stop after this file and report verified receipts. Do not activate a schedule.

Only use that request when its source-review and exclusive-processing statements are true. If the property has already been started elsewhere, transfer its checkpoint and receipts or reconcile it before requesting execution.

## What it does

- Reads the uploaded HTML offline, preserving its final figures and notes.
- Updates Manual Data Raw A:R and V, Manual Audit Notes from Screenshots A:D, and Accounting Audit D.
- Positive net: copies and fills the release-letter template, verifies it, and writes Accounting Audit T. The letter remains an unsigned draft, not sent to the seller.
- Zero or negative net: sends the standard no-additional-proceeds email, then writes Accounting Audit P/Q only after a confirmed send.
- Saves progress and receipts so interrupted work can resume without blindly repeating a send, copy, or append.

The workflow does not redo the source audit, claim queue work, archive the calculator, or download the file again. The uploaded file is its input. Do not upload screenshots or initial calculator HTML instead.

## What travels with the ZIP

A Codex skill, portable extraction and workflow helpers, an execution guide, the source v60 playbook, synthetic tests, and validation notes. No live property files, seller details, credentials, or prior run receipts are bundled. Internal sheet/template/folder identifiers are included because they are the configured workflow destinations. Share within the authorized team.

A fresh copy has a fresh ledger. Existing Accounting Audit status or letter links stop new work for reconciliation, but sheets cannot prove that an unrecorded email was never sent. The same property must have one operator, and unfinished receipts must travel with any operational handoff. Never solve a pending-operation warning by deleting its state.
