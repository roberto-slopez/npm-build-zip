#!/usr/bin/env node

import process from 'node:process';
import { pack } from '../index.js';

// ----- Minimal CLI parser (replaces yargs) -----
//
// Supports:
//   --key=value, --key value, -k value, -k=value
//   --no-key (boolean negation)
//   --key  (boolean true)
//   --help, --version, -h, -V

const ALIASES = {
    s: 'source',
    src: 'source',
    d: 'destination',
    dst: 'destination',
    in: 'includes',
    i: 'info',
    n: 'name',
    no: 'name_only',
    v: 'verbose',
    all: 'include_hidden',
    h: 'help',
    V: 'version'
};

function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') { out.help = true; continue; }
        if (a === '--version' || a === '-V') { out.version = true; continue; }

        let key, value;
        if (a.startsWith('--no-')) {
            key = a.slice(5);
            value = false;
        } else if (a.startsWith('--')) {
            const eq = a.indexOf('=');
            key = a.slice(2, eq !== -1 ? eq : undefined);
            key = ALIASES[key] || key;
            if (eq !== -1) {
                value = a.slice(eq + 1);
            } else {
                const next = argv[i + 1];
                if (next === undefined || next.startsWith('-')) {
                    value = true;
                } else {
                    value = next;
                    i++;
                }
            }
        } else if (a.startsWith('-') && a.length > 1) {
            const short = a.slice(1);
            key = ALIASES[short] || short;
            const eq = a.indexOf('=');
            if (eq !== -1) {
                value = a.slice(eq + 1);
            } else {
                const next = argv[i + 1];
                if (next === undefined || next.startsWith('-')) {
                    value = true;
                } else {
                    value = next;
                    i++;
                }
            }
        } else {
            out._.push(a);
        }
        if (key) out[key] = value;
    }
    return out;
}

const HELP = `Usage: npm-build-zip [options]

  --source, --src <dir>        Folder to zip. Default: ./build
  --destination, --dst <dir>   Output folder. Created if missing. Default: cwd.
  --includes, --in <pkgs>      Comma-separated packages to bundle.
  --name, -n <name>            Suffix or full filename (with --name_only).
  --name_only, --no            Use --name as full filename.
  --info, -i                   Print the archive path.
  --verbose, -v                Print every file added.
  --include_hidden, --all      Include dotfiles; bypass .gitignore/.npmignore.
  --exclude, -x <globs>        Comma-separated globs to exclude.
  --no-timestamp               Use 1980-01-01 mtimes for reproducible builds.
  --help, -h                   Show this help.
  --version, -V                Show the version.

Exit code is 0 on success, 1 on any error. All errors are prefixed with [npm-build-zip].
`;

function fail(msg) {
    console.error('[npm-build-zip] ' + msg);
    process.exit(1);
}

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
    console.log(HELP);
    process.exit(0);
}
if (argv.version) {
    // Read version from package.json (ESM context).
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    console.log(pkg.version);
    process.exit(0);
}

if (argv.name_only && !argv.name) {
    fail('--name_only requires --name. Use --name=foo --name_only to produce foo.zip.');
}

try {
    await pack({
        source: argv.source || '',
        destination: argv.destination || '',
        info: !!argv.info,
        verbose: !!argv.verbose,
        name: argv.name || '',
        includes: argv.includes || '',
        name_only: !!argv.name_only,
        include_hidden: !!argv.include_hidden,
        timestamp: argv.timestamp !== false,
        exclude: argv.exclude || ''
    });
    process.exit(0);
} catch (err) {
    const msg = err && err.message ? err.message : String(err);
    fail(msg);
}
