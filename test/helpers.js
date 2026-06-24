'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function makeTempDir(prefix = 'nbz-') {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeBuildFixture(base, { withDotfile = true, withSubdir = true, withMap = false } = {}) {
    const buildDir = path.join(base, 'build');
    fs.mkdirSync(buildDir, { recursive: true });

    fs.writeFileSync(path.join(buildDir, 'index.js'), 'console.log("hi");\n');
    fs.writeFileSync(path.join(buildDir, 'README.md'), '# fixture\n');

    if (withDotfile) {
        fs.writeFileSync(path.join(buildDir, '.npmrc'), 'unsafe-perm=true\n');
    }

    if (withMap) {
        fs.writeFileSync(path.join(buildDir, 'index.js.map'), '{"version":3}\n');
    }

    if (withSubdir) {
        const sub = path.join(buildDir, 'sub');
        fs.mkdirSync(sub, { recursive: true });
        fs.writeFileSync(path.join(sub, 'data.json'), '{}');
    }

    return buildDir;
}

function makePackageJson(base, { name = 'fixture-pkg', version = '1.0.0' } = {}) {
    const pkgPath = path.join(base, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name, version }, null, 2));
    return pkgPath;
}

function cleanup(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // best-effort
    }
}

function withCwd(dir, fn) {
    const prev = process.cwd();
    process.chdir(dir);
    try {
        return fn();
    } finally {
        process.chdir(prev);
    }
}

module.exports = {
    makeTempDir,
    makeBuildFixture,
    makePackageJson,
    cleanup,
    withCwd
};
