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
  - Uses signed mac build when `CSC_LINK` is configured
  - Falls back to unsigned mac build when signing secrets are absent
- Dedicated signed mac workflow: `.github/workflows/release-mac-signed.yml`
  - Trigger manually (`workflow_dispatch`) or by tag (`v*`)

## Typical release flow

1. Ensure tests pass: `npm test -- --runInBand`
2. Ensure workspace is clean: `npm run clean:workspace`
3. Create and push a version tag (for example `v3.0.1`)
4. Confirm workflow artifacts in GitHub Releases
