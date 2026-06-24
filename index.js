'use strict';

const archiver = require('archiver-promise');
const packlist = require('npm-packlist');
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

function loadPackageJson() {
    try {
        return require(path.join(process.cwd(), 'package.json'));
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw new Error(
                'Could not find a package.json in the current directory. ' +
                'Run from your project root, or use --name and --name_only ' +
                'to set a custom filename.'
            );
        }
        throw err;
    }
}

function walkAllFiles(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
            } else if (entry.isFile()) {
                out.push(path.relative(dir, full).split(path.sep).join('/'));
            }
        }
    }
    return out;
}

function zipFiles(files, filename, source, destination, info, verbose, timestamp) {
    // Fix #15: ensure the destination directory exists before writing.
    fs.mkdirSync(destination || '.', { recursive: true });

    const target = path.join(destination, filename);
    if (info) console.log(`Archive: ${target}`);

    // For reproducible builds (--no-timestamp), force UTC, no comment, and
    // a stable entry order. Without these, the same input produces different
    // bytes on every run (OS-dependent mtime, OS-dependent readdir order).
    const archiverOpts = timestamp ? undefined : { forceUTC: true, comment: '' };
    const archive = archiver(target, archiverOpts);

    // Sort entries to make byte output deterministic across platforms.
    const sorted = timestamp ? files : [...files].sort((a, b) => a.localeCompare(b));

    sorted.forEach(file => {
        const filePath = path.join(source, file);
        if (verbose) console.log(file);
        const entryOpts = timestamp ? { name: file } : { name: file, date: new Date(0) };
        archive.file(filePath, entryOpts);
    });

    return archive.finalize();
}

function resolveFilename({ name, name_only }, pkg) {
    const pkgName = pkg && pkg.name;
    const pkgVersion = pkg && pkg.version;

    if (name && name_only) {
        return `${name}.zip`;
    }
    if (!pkgName) {
        throw new Error(
            'package.json must have a "name" field. ' +
            'Use --name together with --name_only to override the filename entirely.'
        );
    }
    if (!pkgVersion) {
        throw new Error(
            'package.json must have a "version" field. ' +
            'Use --name together with --name_only to override the filename entirely.'
        );
    }
    const suffix = name ? `.${name}` : '';
    return `${sanitize(pkgName)}_${sanitize(pkgVersion)}${suffix}.zip`;
}

function pack({ source, destination, info, verbose, name, includes, name_only, include_hidden, timestamp }) {
    source = source || './build';

    if (!fs.existsSync(source)) {
        throw new Error(`Source directory does not exist: ${source}`);
    }

    // Only load package.json when we actually need name/version. When
    // --name and --name_only are both set, the user opted out of package info.
    const pkg = (name && name_only) ? null : loadPackageJson();
    const filename = resolveFilename({ name, name_only }, pkg);

    // Resolve the file list. By default we use npm-packlist which honors
    // .npmignore / .gitignore / package.json#files (matches `npm pack`).
    // With --include-hidden / --all, we do a plain recursive walk and
    // include every file (fixes #10).
    const filesPromise = include_hidden
        ? Promise.resolve(walkAllFiles(source))
        : packlist({
            path: source,
            bundled: includes.split(',')
        });

    return filesPromise.then(files => zipFiles(files, filename, source, destination, info, verbose, timestamp));
}

module.exports = {
    pack,
    // Exposed for testing. Treat as semi-public — names may change in a major release.
    _internal: {
        loadPackageJson,
        walkAllFiles,
        resolveFilename
    }
};
