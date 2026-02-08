# Releasing

This project supports local unsigned builds and signed macOS release builds.

## Local builds

- `npm run build:mac` - unsigned mac DMG build (stable local default)
- `npm run build:win` - Windows NSIS installer build
- `npm run build:portable` - Windows portable EXE build

## Signed macOS release

Use:

```bash
npm run release:mac:signed
```

Required environment variables/secrets:

- `CSC_LINK` - Base64 certificate or URL to signing certificate
- `CSC_KEY_PASSWORD` - certificate password
- `APPLE_ID` - Apple developer account email
- `APPLE_APP_SPECIFIC_PASSWORD` - app-specific password for notarization
- `APPLE_TEAM_ID` - Apple team identifier
- `GITHUB_TOKEN` - GitHub token for publish/upload

## GitHub Actions workflow

- Main release matrix: `.github/workflows/build.yml`
  - Triggers on release tags (`v*`) or manual dispatch
  - Enforces release gate job before packaging:
    - `npm run qa:release:gate` (`test` + `build` + UI smoke QA)
  - Builds unsigned mac artifacts in matrix mode for reliability
- Dedicated signed mac workflow: `.github/workflows/release-mac-signed.yml`
  - Trigger manually (`workflow_dispatch`) only
  - Use this only when Apple/signing secrets are configured

## Short Release Checklist

1. Ensure all feature/fix work merged via Pull Request into `master`
2. Pull latest `master` and verify clean git state
3. Run validation:
   - `npm run qa:release:gate`
   - `npm run clean:workspace`
4. Create and push release tag:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
5. Verify GitHub Actions/release artifacts:
   - Build workflow green
   - Installer/DMG artifacts present
6. If needed, rollback tag:
   - `git push origin :refs/tags/vX.Y.Z`
   - `git tag -d vX.Y.Z`
