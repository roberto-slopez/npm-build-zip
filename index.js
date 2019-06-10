'use strict';

const archiver = require('archiver-promise');
const packlist = require('npm-packlist');
const path = require('path');
const sanitize = require('sanitize-filename');

function zipFiles(files, filename, source, destination, info, verbose) {
    const target = path.join(destination, filename);
    if (info) console.log(`Archive: ${target}`);

    let archive = archiver(target);
    files.forEach(file => {
        const filePath = path.join(source, file);
        if (verbose) console.log(file);
        archive.file(filePath, { name: file });
    });

    return archive.finalize();
}

function pack({ source, destination, info, verbose }) {
    source = source || './build';
    return packlist({
        path: source
    }).then(files => {
        return zipFiles(
            files,
            `${sanitize(process.env.npm_package_name)}_${sanitize(process.env.npm_package_version)}.zip`,
            source,
            destination,
            info,
            verbose
        );
    });
}

module.exports = {
    pack
};
