## Installation

```
npm install --save-dev npm-build-zip
```

Requires Node.js **>= 22** (v1.x supports Node 18+).

## Example

Modify YourApp/package.json:

```json
"scripts": {
    "zip": "npm-build-zip"
}
```

Create the .zip file containing the build folder:

```bash
npm run zip
```

### Arguments

| Flag | Alias | Default | Description |
| --- | --- | --- | --- |
| `--source=<dir>` | `--src`, `-s` | `./build` | Folder to zip. |
| `--destination=<dir>` | `--dst`, `-d` | `.` (cwd) | Output folder. Created if missing. |
| `--includes=pkg1,pkg2` | `--in` | `''` | Comma-separated list of packages to bundle (`npm-packlist bundled`). |
| `--name=demo` | `-n` | `''` | Suffix appended to the filename, or full name with `--name_only`. |
| `--name_only` | `--no` | `false` | When passing `--name`, use it as the full filename. |
| `--info` | `-i` | `false` | Print the archive path. |
| `--verbose` | `-v` | `false` | Print every file added to the archive. |
| `--include_hidden` | `--all` | `false` | Include dotfiles and bypass `.gitignore`/`.npmignore`. |
| `--exclude=*.map,**/*.test.js` | `-x` | `''` | Comma-separated globs to exclude (Node 22+, `fs.promises.glob`). |
| `--no-timestamp` | — | `false` | Embed `1980-01-01 00:00` mtimes for reproducible builds. |
| `--help` | `-h` | — | Show usage. |
| `--version` | `-V` | — | Show version. |

### Filename resolution

By default the file is named `<sanitized-package-name>_<sanitized-package-version>[.<suffix>].zip`.

- If both `--name` and `--name_only` are set, the file is named `<name>.zip` and `package.json#name`/`#version` are not required.
- If `package.json` is missing or has no `name`/`version`, the command exits with a clear error explaining how to fix it.

## Migrating from 1.x

The 2.0.0 release drops three runtime dependencies (`archiver-promise`, `sanitize-filename`, `yargs`) and switches to ESM-first. The user-facing CLI is unchanged — all flags and aliases work the same way. The breaking changes are:

- **Node.js >= 22 is required** (was 18). If you can't upgrade, pin to `1.2.x`.
- **CJS `require('npm-build-zip')` is still supported** via `index.cjs` shim, but `pack` returns a Promise — `.then()` or `await` is required.
- ESM users: `import { pack } from 'npm-build-zip'` works as expected.

## License

Apache-2.0
