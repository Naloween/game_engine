var browserify = require('browserify');
var tsify = require('tsify');

browserify()
    .add('src/main.ts') // main entry of an application
    .plugin(tsify, { noImplicitAny: true })
    .bundle()
    .on('error', function (error) { console.error(error.toString()); })
    .pipe(process.stdout);