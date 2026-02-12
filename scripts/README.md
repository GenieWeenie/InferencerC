# Scripts

Scripts are grouped by workflow:

- `dev/clean_workspace.sh` - remove generated artifacts (`dist`, `output`, transient logs)
- `qa/ui_smoke_qa.sh` - UI click-through smoke run using Playwright CLI
- `qa/release_gate.sh` - release gate (`test` + `build` + UI smoke QA)
- `release/afterPack.js` - Electron Builder macOS `afterPack` hook
- `release/generate_release_notes.sh` - generate deterministic tag-based release notes for CI publishing
