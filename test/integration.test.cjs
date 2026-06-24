'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const fs = require('node:fs');

const pExecFile = promisify(execFile);

const BIN = path.join(__dirname, '..', 'bin', 'npm-build-zip.js');
const { makeTempDir, makeBuildFixture, makePackageJson, cleanup } = require('./helpers.cjs');

async function unzipAvailable() {
    try {
        await pExecFile('unzip', ['-v']);
        return true;
    } catch {
        return false;
    }
}

async function listZip(zipPath) {
    const { stdout } = await pExecFile('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
    return stdout.split('\n').map(s => s.trim()).filter(Boolean);
}

test('integration: default mode produces a zip without dotfiles', async (t) => {
    if (!(await unzipAvailable())) return t.skip('unzip not available on this platform');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir, { withDotfile: true });
        makePackageJson(dir);
        await pExecFile(process.execPath, [BIN,
            '--source', buildDir,
            '--destination', dir,
            '--name', 'pkg',
            '--name_only'
        ], { cwd: dir });
        const zipPath = path.join(dir, 'pkg.zip');
        assert.ok(fs.existsSync(zipPath), `expected ${zipPath}`);
        const entries = await listZip(zipPath);
        assert.ok(entries.includes('index.js'));
        assert.ok(entries.includes('sub/data.json'));
        assert.ok(!entries.includes('.npmrc'),
            `expected .npmrc to be excluded by default; got ${entries.join(', ')}`);
    } finally {
        cleanup(dir);
    }
});

test('integration: --include_hidden includes dotfiles in the zip', async (t) => {
    if (!(await unzipAvailable())) return t.skip('unzip not available on this platform');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir, { withDotfile: true });
        makePackageJson(dir);
        await pExecFile(process.execPath, [BIN,
            '--source', buildDir,
            '--destination', dir,
            '--name', 'pkg',
            '--name_only',
            '--include_hidden'
        ], { cwd: dir });
        const zipPath = path.join(dir, 'pkg.zip');
        const entries = await listZip(zipPath);
        assert.ok(entries.includes('.npmrc'),
            `expected .npmrc to be included; got ${entries.join(', ')}`);
    } finally {
        cleanup(dir);
    }
});

test('integration: destination directory is created if missing', async (t) => {
    if (!(await unzipAvailable())) return t.skip('unzip not available on this platform');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir);
        makePackageJson(dir);
        const nested = path.join(dir, 'a', 'b', 'c');
        await pExecFile(process.execPath, [BIN,
            '--source', buildDir,
            '--destination', nested,
            '--name', 'pkg',
            '--name_only'
        ], { cwd: dir });
        assert.ok(fs.existsSync(path.join(nested, 'pkg.zip')));
    } finally {
        cleanup(dir);
    }
});
