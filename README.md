## Installation

`npm install --save-dev npm-build-zip`

## Example

Modify YourApp/package.json:

```
"scripts": {
    "zip": "npm-build-zip"
    ...
}
```

Create the .zip file containing build folder
```
npm run zip
```

### Arguments 
`--source=dir/build/` **default is: build**

`--destination=dir/out/` **defualt is: .**

`--includes=yargs,sanitize-filename` **default is: ''** include packages in zip

`--name=demo` **default is: ''** extra name in package.zip

`--name_only=true` **default is: false** when providing a name, omit package information from filename, does nothing without a name

`--info=true` **default is: false** for show logs
