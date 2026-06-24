'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');

const pExecFile = promisify(execFile);

const BIN = path.join(__dirname, '..', 'bin', 'npm-build-zip.js');

function run(args, { cwd } = {}) {
    return pExecFile(process.execPath, [BIN, ...args], {
        cwd,
        encoding: 'utf8'
    }).then(
        result => ({ status: 0, stdout: result.stdout, stderr: result.stderr }),
        err => ({
            status: err.code || 1,
            stdout: err.stdout || '',
            stderr: err.stderr || ''
        })
    );
}

test('CLI --help prints usage and exits 0', async () => {
    const { status, stdout } = await run(['--help']);
    assert.equal(status, 0);
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /--source/);
    assert.match(stdout, /--destination/);
});

test('CLI without source dir fails with a clear error', async () => {
    const { status, stderr } = await run(['--source=./does-not-exist-xyz']);
    assert.notEqual(status, 0);
    assert.match(stderr, /Source directory does not exist/);
});

test('CLI --name --name_only produces <name>.zip without needing package.json version', async () => {
    const fs = require('node:fs');
    const { makeTempDir, makeBuildFixture, cleanup } = require('./helpers');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir);
        const result = await run(
            ['--source', buildDir, '--destination', dir, '--name', 'custom', '--name_only'],
            { cwd: dir }
        );
        // No package.json in dir → would fail unless --name --name_only is set.
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.ok(fs.existsSync(`${dir}/custom.zip`), 'expected custom.zip to be created');
    } finally {
        cleanup(dir);
    }
});

test('CLI exits 0 on success and prints Archive: line when --info is set', async () => {
    const { makeTempDir, makeBuildFixture, makePackageJson, cleanup } = require('./helpers');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir);
        makePackageJson(dir);
        const result = await run(
            ['--source', buildDir, '--destination', dir, '--info'],
            { cwd: dir }
        );
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.match(result.stdout, /Archive:/);
    } finally {
        cleanup(dir);
    }
});

test('CLI --include_hidden accepts the flag and produces a zip', async () => {
    const { makeTempDir, makeBuildFixture, makePackageJson, cleanup } = require('./helpers');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir, { withDotfile: true });
        makePackageJson(dir);
        const result = await run(
            ['--source', buildDir, '--destination', dir, '--include_hidden'],
            { cwd: dir }
        );
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    } finally {
        cleanup(dir);
    }
});

test('CLI --name_only without --name fails with a clear error and exit 1', async () => {
    const { makeTempDir, makeBuildFixture, makePackageJson, cleanup } = require('./helpers');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir);
        makePackageJson(dir);
        const result = await run(
            ['--source', buildDir, '--name_only'],
            { cwd: dir }
        );
        assert.notEqual(result.status, 0, 'expected non-zero exit code');
        assert.match(result.stderr, /\[npm-build-zip\]/);
        assert.match(result.stderr, /--name_only requires --name/);
    } finally {
        cleanup(dir);
    }
});

test('CLI --no-timestamp produces a zip with deterministic mtime', async (t) => {
    if (!(await (async () => {
        try { const { execFile } = require('node:child_process'); const { promisify } = require('node:util');
            await promisify(execFile)('unzip', ['-v']); return true; } catch { return false; }
    })())) return t.skip('unzip not available');

    const { execFile } = require('node:child_process');
    const { promisify } = require('node:util');
    const pExecFile = promisify(execFile);
    const { makeTempDir, makeBuildFixture, makePackageJson, cleanup } = require('./helpers');

    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir);
        makePackageJson(dir);
        await pExecFile(process.execPath, [BIN,
            '--source', buildDir,
            '--destination', dir,
            '--name', 'r',
            '--name_only',
            '--no-timestamp'
        ], { cwd: dir });
        const { stdout } = await pExecFile('unzip', ['-l', path.join(dir, 'r.zip')], { encoding: 'utf8' });
        // With --no-timestamp, every entry should show 1980-01-01 or 1970-01-01 (epoch).
        // We assert the absence of the current year in the listing.
        const currentYear = new Date().getFullYear().toString();
        assert.ok(!stdout.includes(currentYear),
            `expected no current-year mtimes in:\n${stdout}`);
    } finally {
        cleanup(dir);
    }
});
