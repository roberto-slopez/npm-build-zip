import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { _internal } = await import('../index.js');
const { makeTempDir, makeBuildFixture, makePackageJson, cleanup, withCwd } = require('./helpers.cjs');

const { walkAllFiles, resolveFilename, loadPackageJson } = _internal;

test('walkAllFiles returns files relative to the root using forward slashes', () => {
    const dir = makeTempDir();
    try {
        makeBuildFixture(dir);
        const files = walkAllFiles(path.join(dir, 'build'));
        assert.ok(files.includes('index.js'));
        assert.ok(files.includes('README.md'));
        assert.ok(files.includes('sub/data.json'));
        for (const f of files) {
            assert.ok(!f.includes('\\'),
                `expected no backslashes in ${f}`);
        }
    } finally {
        cleanup(dir);
    }
});

test('walkAllFiles includes dotfiles', () => {
    const dir = makeTempDir();
    try {
        makeBuildFixture(dir, { withDotfile: true });
        const files = walkAllFiles(path.join(dir, 'build'));
        assert.ok(files.includes('.npmrc'),
            `expected .npmrc in ${files.join(', ')}`);
    } finally {
        cleanup(dir);
    }
});

test('walkAllFiles returns the same set of files across runs', () => {
    const dir = makeTempDir();
    try {
        makeBuildFixture(dir);
        const a = walkAllFiles(path.join(dir, 'build'));
        const b = walkAllFiles(path.join(dir, 'build'));
        assert.deepEqual([...a].sort(), [...b].sort());
    } finally {
        cleanup(dir);
    }
});

test('walkAllFiles returns empty for empty dir', () => {
    const dir = makeTempDir();
    try {
        const sub = path.join(dir, 'empty');
        fs.mkdirSync(sub);
        assert.deepEqual(walkAllFiles(sub), []);
    } finally {
        cleanup(dir);
    }
});

test('resolveFilename uses name and version from package.json by default', () => {
    const out = resolveFilename({}, { name: 'my-pkg', version: '1.2.3' });
    assert.equal(out, 'my-pkg_1.2.3.zip');
});

test('resolveFilename appends suffix when name is provided without name_only', () => {
    const out = resolveFilename({ name: 'demo' }, { name: 'my-pkg', version: '1.2.3' });
    assert.equal(out, 'my-pkg_1.2.3.demo.zip');
});

test('resolveFilename uses --name as full filename when name_only is true', () => {
    const out = resolveFilename({ name: 'demo', name_only: true }, { name: 'my-pkg', version: '1.2.3' });
    assert.equal(out, 'demo.zip');
});

test('resolveFilename works without package.json when --name --name_only are set', () => {
    const out = resolveFilename({ name: 'demo', name_only: true }, null);
    assert.equal(out, 'demo.zip');
});

test('resolveFilename throws clear error when name is missing', () => {
    assert.throws(
        () => resolveFilename({}, { version: '1.0.0' }),
        /must have a "name" field/
    );
});

test('resolveFilename throws clear error when version is missing', () => {
    assert.throws(
        () => resolveFilename({}, { name: 'pkg' }),
        /must have a "version" field/
    );
});

test('resolveFilename sanitizes unsafe characters in name', () => {
    const out = resolveFilename({}, { name: 'pkg/with:bad*chars', version: '1.0.0' });
    assert.match(out, /^[^/\\:*?"<>|]+\.zip$/);
});

test('loadPackageJson reads package.json from cwd', () => {
    const dir = makeTempDir();
    try {
        makePackageJson(dir, { name: 'cwd-pkg', version: '9.9.9' });
        const pkg = withCwd(dir, () => loadPackageJson());
        assert.equal(pkg.name, 'cwd-pkg');
        assert.equal(pkg.version, '9.9.9');
    } finally {
        cleanup(dir);
    }
});

test('loadPackageJson throws clear error when package.json is missing', () => {
    const dir = makeTempDir();
    try {
        assert.throws(
            () => withCwd(dir, () => loadPackageJson()),
            /Could not find a package.json/
        );
    } finally {
        cleanup(dir);
    }
});
