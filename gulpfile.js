const gulp        = require('gulp'),
      fs          = require('fs'),
      path        = require('path'),
      concat      = require('gulp-concat'),
      scss        = require('gulp-sass'),
      autoPrefix  = require('gulp-autoprefixer'),
      uglify      = require('gulp-uglify-es').default,
      notify      = require('gulp-notify'),
      livereload  = require('gulp-livereload'),
      webserver   = require('gulp-webserver');

// Define config properties
const config = {
  source: 'client/src',
  destination: 'client/build',
  webserver: {
    host: '127.0.0.1',
    port: 8080
  },
  livereload: {
    host: '127.0.0.1',
    port: 35000
  }
};

// Copy all static files
gulp.task('copy', () => {
  return gulp.src([
    path.join(config.source, '/assets/**/*.*'),
    path.join(config.source, '/**/*.html')
    ], {
      base: config.source
  })
  .pipe(gulp.dest(config.destination))
  .pipe(livereload());
});

// Compile SCSS to CSS
gulp.task('compile-scss', () => {
  return gulp.src(path.join(config.source, '/scss/base.scss'))
  .pipe(concat('style.css'))
  .pipe(scss({ outputStyle: 'compressed' }))
  .on('error', notify.onError('SCSS compile error: <%= error.message %>'))
  .pipe(autoPrefix({
    browsers: [
    'last 2 versions'
    ]
  }))
  .pipe(gulp.dest(path.join(config.destination, '/css')))
  .pipe(livereload());
});

// Uglify JS
gulp.task('uglify-js', () => {
  return gulp.src(path.join(config.source, '/js/**/*.js'))
  .pipe(uglify())
  .on('error', notify.onError('JS uglify error: <%= error.message %>'))
  .pipe(gulp.dest(path.join(config.destination, '/js')))
  .pipe(livereload());
});

// Move JS
gulp.task('move-js', () => {
  return gulp.src(path.join(config.source, '/js/**/*.js'))
  .pipe(gulp.dest(path.join(config.destination, '/js')))
  .pipe(livereload());
});

// Run web and livereload servers
gulp.task('servers', ['copy'], () => {
  // Insert in HTML:
  // <script src="//<host>:<port>/livereload.js?host=<host>"></script>
  livereload.listen({
    host: config.livereload.host,
    port: config.livereload.port
  });

  return gulp.src(config.destination)
  .pipe(webserver({
    host: config.webserver.host,
    port: config.webserver.port,
    livereload: false, // Disable built-in livereload since it's slow
    directoryListing: false,
    open: true
  }));
});

// Watch the project for changes
gulp.task('watch-project', () => {
  // HTML
  gulp.watch(path.join(config.source, '/**/*.html'), ['copy']);

  // SCSS
  gulp.watch(path.join(config.source, '/scss/**/*.scss'), ['compile-scss']);

  // JS
  gulp.watch(path.join(config.source, '/js/**/*.js'), ['move-js']);
});

gulp.task('build', ['copy', 'compile-scss', 'uglify-js']);

gulp.task('watch', ['copy', 'compile-scss', 'move-js', 'servers', 'watch-project']);

gulp.task('default', ['build']);
