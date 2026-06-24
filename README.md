## Installation

`npm install --save-dev npm-build-zip`

Requires Node.js >= 18.

## Example

Modify YourApp/package.json:

```
"scripts": {
    "zip": "npm-build-zip"
    ...
}
```

Create the .zip file containing build folder
```
npm run zip
```

### Arguments

| Flag | Alias | Default | Description |
| --- | --- | --- | --- |
| `--source=<dir>` | `--src` | `build` | Folder to zip. |
| `--destination=<dir>` | `--dst` | `.` (cwd) | Output folder. Created if missing. |
| `--includes=pkg1,pkg2` | `--in` | `''` | Comma-separated list of packages whose contents should be bundled into the zip (npm-packlist `bundled` option). |
| `--name=demo` | `-n` | `''` | Suffix appended to the generated filename, e.g. `pkg_1.0.0.demo.zip`. |
| `--name_only` | `--no` | `false` | When passing `--name`, use it as the full filename (no `pkg_version` prefix). |
| `--info` | `-i` | `false` | Print the archive path. |
| `--verbose` | `-v` | `false` | Print every file added to the archive. |
| `--include_hidden` | `--all` | `false` | Include dotfiles (e.g. `.npmrc`) and bypass `.gitignore`/`.npmignore` filtering. |
| `--no-timestamp` | — | `false` | Embed `1980-01-01 00:00` mtimes in every entry. Use for reproducible builds. |

### Filename resolution

By default the file is named `<sanitized-package-name>_<sanitized-package-version>[.<suffix>].zip`.

- If both `--name` and `--name_only` are set, the file is named `<name>.zip` and `package.json#name`/`#version` are not required.
- If `package.json` is missing or has no `name`/`version`, the command exits with a clear error explaining how to fix it.

## License

Apache-2.0
