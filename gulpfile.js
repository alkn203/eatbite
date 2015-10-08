
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');


gulp.task('default', ['uglify']);

gulp.task('uglify', function() {
  return gulp
    .src('main.js')
    .pipe(uglify())
    .pipe(rename({
      extname: '.min.js',
    }))
    .pipe(gulp.dest('./'))
    ;
});
