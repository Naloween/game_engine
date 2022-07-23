var fs = require('fs');
var browserify = require('browserify');
var watchify = require('watchify');;
var tsify = require('tsify');

const b = browserify({ cache: {}, packageCache: {} });

b.add('src/main.ts') // main entry of the application

b.plugin(tsify, { noImplicitAny: true })
b.plugin(watchify)

b.on('update', bundle)

bundle();

function bundle() {
  b.bundle()
    .on('error', console.error)
    .pipe(fs.createWriteStream('./dist/exemple/public/js/bundle.js'));
  console.log("bundle updated");
}

console.log("watching './src/main.ts' to bundle in './dist/exemple/public/js/bundle.js'");
