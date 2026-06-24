'use strict';

// CJS shim for consumers that do `require('npm-build-zip').pack(...)`.
// The pack function is async and returns a Promise. Sync usage is not supported.
module.exports = {
    pack: (...args) => import('./index.js').then(m => m.pack(...args))
};
