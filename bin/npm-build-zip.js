#!/usr/bin/env node

'use strict';

const { pack } = require('../index');

const argv = require('yargs')
    .usage('Usage: $0 --src [source] --dst [destination]')
    .option('source', {
        alias: 'src',
        default: '',
        describe: 'Folder to zip. Default: ./build'
    })
    .option('destination', {
        alias: 'dst',
        default: '',
        describe: 'Output folder. Created if missing. Default: current directory.'
    })
    .option('includes', {
        alias: 'in',
        default: '',
        describe: 'Comma-separated list of packages to bundle (npm-packlist bundled option).'
    })
    .option('info', {
        alias: 'i',
        type: 'boolean',
        default: false,
        describe: 'Print the archive path.'
    })
    .option('name', {
        alias: 'n',
        default: false,
        describe: 'Suffix appended to the auto-generated filename, or full name with --name_only.'
    })
    .option('name_only', {
        alias: 'no',
        type: 'boolean',
        default: false,
        describe: 'When --name is set, use it as the full filename (no pkg_version prefix).'
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        default: false,
        describe: 'Print every file added to the archive.'
    })
    .option('include_hidden', {
        alias: 'all',
        type: 'boolean',
        default: false,
        describe: 'Include dotfiles (e.g. .npmrc) and bypass .gitignore/.npmignore filtering.'
    })
    .option('timestamp', {
        type: 'boolean',
        default: true,
        describe: 'Embed real mtimes in the zip. Use --no-timestamp for reproducible builds.'
    })
    .check(function (args) {
        if (args.name_only && !args.name) {
            throw new Error(
                '[npm-build-zip] --name_only requires --name. ' +
                'Use --name=foo --name_only to produce foo.zip.'
            );
        }
        return true;
    })
    .help()
    .argv;

pack({
    source: argv.source,
    destination: argv.destination,
    info: argv.info,
    verbose: argv.verbose,
    name: argv.name,
    includes: argv.includes,
    name_only: argv.name_only,
    include_hidden: argv.include_hidden,
    timestamp: argv.timestamp
})
    .then(() => process.exit(0))
    .catch(error => {
        const msg = error && error.message ? error.message : String(error);
        const prefix = msg.startsWith('[npm-build-zip]') ? '' : '[npm-build-zip] ';
        console.error(prefix + msg);
        process.exit(1);
    });
