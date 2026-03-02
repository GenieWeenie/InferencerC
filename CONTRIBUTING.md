# Contributing

Repository: **https://github.com/GenieWeenie/InferencerC** — use this URL when forking or cloning.

This repository uses a simple safe GitHub flow to protect `master`.

## Safe Flow

1. Create a branch from latest `master`.
2. Make changes and commit on that branch.
3. Push branch and open a Pull Request into `master`.
4. Wait for CI to pass (`CI` workflow).
5. Merge PR, then delete branch.
6. Only tag releases from `master` after merge.

## Branch hygiene

Keep the branch list tidy: delete merged or abandoned branches (e.g. `auto-claude/*` that are no longer needed). Prefer short-lived feature branches and delete after merge.

## Branch Naming

- `feature/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`

Examples:

- `feature/model-selector-polish`
- `fix/shortcut-conflict-defaults`
- `chore/update-release-docs`

## Local Validation Before PR

```bash
npm test -- --runInBand
npm run build
```

If you see `Unknown env config "devdir"` when running npm scripts, it comes from your local npm or environment (not this repo). You can clear it with `npm config delete devdir` or by unsetting the variable in your shell.

## Pull Request Checklist

Use the PR template and include:

- Scope and reason for change
- Validation results
- Screenshots for UI changes
- Any migration/upgrade notes

## Maintainer Settings (GitHub UI)

Branch protection is available on **public** repos (and on private with GitHub Pro). After making the repo public, set branch protection on `master`:

1. Require a pull request before merging
2. Require status checks to pass
3. Select check: `CI / validate`
4. Disable force pushes
5. Disable branch deletion (optional but recommended)

This enforces the safe flow and keeps release tags trustworthy.
