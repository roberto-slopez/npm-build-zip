import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';
import packlist from 'npm-packlist';

export function loadPackageJson(cwd = process.cwd()) {
    try {
        return JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(
                'Could not find a package.json in the current directory. ' +
                'Run from your project root, or use --name and --name_only ' +
                'to set a custom filename.'
            );
        }
        throw err;
    }
}

export function walkAllFiles(dir) {
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

// Sanitize a string so it can be safely used as a filename. Inlined from
// sanitize-filename (MIT) to remove the dependency.
export function sanitize(name) {
    return String(name)
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .trim() || 'unnamed';
}

export function resolveFilename({ name, name_only }, pkg) {
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

async function applyExcludes(files, patterns, cwd) {
    if (!patterns || patterns.length === 0) return files;
    const excludeSet = new Set();
    for (const pattern of patterns) {
        try {
            for await (const match of fsp.glob(pattern, { cwd })) {
                excludeSet.add(String(match).split(path.sep).join('/'));
            }
        } catch (err) {
            throw new Error(`Invalid --exclude pattern "${pattern}": ${err.message}`);
        }
    }
    return files.filter(f => !excludeSet.has(f));
}

function zipFiles(files, filename, source, destination, { info, verbose, timestamp }) {
    fs.mkdirSync(destination || '.', { recursive: true });
    const target = path.join(destination, filename);
    if (info) console.log(`Archive: ${target}`);

    const archiverOpts = timestamp ? {} : { forceUTC: true, comment: '' };
    const archive = archiver.create('zip', archiverOpts);
    const output = fs.createWriteStream(target);
    archive.pipe(output);

    const sorted = timestamp ? files : [...files].sort((a, b) => a.localeCompare(b));
    for (const file of sorted) {
        const filePath = path.join(source, file);
        if (verbose) console.log(file);
        const entryOpts = timestamp ? { name: file } : { name: file, date: new Date(0) };
        archive.file(filePath, entryOpts);
    }

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve());
        archive.on('error', reject);
        archive.finalize().catch(reject);
    });
}

export async function pack({
    source = './build',
    destination = '',
    info = false,
    verbose = false,
    name = '',
    includes = '',
    name_only = false,
    include_hidden = false,
    timestamp = true,
    exclude = ''
}) {
    if (!fs.existsSync(source)) {
        throw new Error(`Source directory does not exist: ${source}`);
    }

    // Only load package.json when we actually need name/version.
    const pkg = (name && name_only) ? null : loadPackageJson();
    const filename = resolveFilename({ name, name_only }, pkg);

    let files = include_hidden
        ? walkAllFiles(source)
        : await packlist({
            path: source,
            bundled: includes.split(',').filter(Boolean)
        });

    const excludePatterns = String(exclude).split(',').map(s => s.trim()).filter(Boolean);
    if (excludePatterns.length) {
        files = await applyExcludes(files, excludePatterns, source);
    }

    return zipFiles(files, filename, source, destination, { info, verbose, timestamp });
}

// Exposed for unit testing.
export const _internal = { loadPackageJson, walkAllFiles, resolveFilename, sanitize, applyExcludes };
