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
  source: `client/src`,
  destination: `client/build`
};

// Copy all static files
gulp.task('copy', () => {
	return gulp.src([
		`${config.source}/**/*.html`
	], {
		base: config.source
	})
  .pipe(gulp.dest(config.destination))
  .pipe(livereload());
});

// Compile SCSS to CSS
gulp.task('compile-scss', () => {
	return gulp.src(`${config.source}/scss/base.scss`)
	.pipe(concat('style.css'))
	.pipe(scss({ outputStyle: 'compressed' }))
	.on('error', notify.onError('SCSS compile error: <%= error.message %>'))
	.pipe(autoPrefix({
		browsers: [
			'last 2 versions'
		]
	}))
	.pipe(gulp.dest(`${config.destination}css`))
	.pipe(livereload());
});

// Uglify JS
gulp.task('uglify-js', () => {
	return gulp.src(`${config.source}/js/script.js`)
  .pipe(uglify())
	.on('error', notify.onError('JS uglify error: <%= error.message %>'))
	.pipe(gulp.dest(`${config.destination}js`))
	.pipe(livereload());
});

// Run webserver
gulp.task('webserver', ['copy', 'compile-scss', 'uglify-js'], () => {
  // Insert in HTML:
  // <script src="//<host>:<port>/livereload.js?host=<host>"></script>
  livereload.listen({
		host: '0.0.0.0',
		port: 35000
  });

	return gulp.src(config.destination)
	.pipe(webserver({
    host: '0.0.0.0',
    port: 8080,
		livereload: false, // Disable built-in livereload since it's slow
		directoryListing: false,
		open: true
	}));
});

// Watch the project for changes
gulp.task('watch-project', () => {
  // HTML
  gulp.watch(`${config.source}/**/*.html`, ['copy']);

  // SCSS
  gulp.watch(`${config.source}/scss/**/*.scss`, ['compile-scss']);

  // JS
	gulp.watch(`${config.source}/js/**/*.js`, ['uglify-js']);
});

gulp.task('build', ['copy', 'compile-scss', 'uglify-js']);

gulp.task('watch', ['copy', 'compile-scss', 'uglify-js', 'webserver', 'watch-project']);

gulp.task('default', ['build']);
