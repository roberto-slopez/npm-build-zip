'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { makeTempDir, makeBuildFixture, makePackageJson, cleanup } = require('./helpers.cjs');

// Verifies that consumers using CJS `require('npm-build-zip')` can still use
// the package after the v2.0.0 ESM migration.
test('CJS shim: require("npm-build-zip").pack is exposed as a function', () => {
    const nbz = require('../index.cjs');
    assert.equal(typeof nbz.pack, 'function', 'expected pack to be a function');
    // Calling pack with no source returns a Promise. We don't await it; the
    // next test exercises the full success path. We catch the implicit
    // rejection so the test runner doesn't flag an unhandled rejection.
    const p = nbz.pack({ source: './does-not-exist' });
    assert.equal(typeof p.then, 'function', 'expected pack to return a thenable');
    p.catch(() => { /* expected to reject */ });
});

test('CJS shim: pack actually produces a zip when called from CJS', async () => {
    const nbz = require('../index.cjs');
    const dir = makeTempDir();
    try {
        const buildDir = makeBuildFixture(dir);
        makePackageJson(dir);
        await nbz.pack({
            source: buildDir,
            destination: dir,
            name: 'cjs-test',
            name_only: true,
            info: false
        });
        assert.ok(fs.existsSync(path.join(dir, 'cjs-test.zip')),
            'expected cjs-test.zip to be created via CJS shim');
    } finally {
        cleanup(dir);
    }
});
