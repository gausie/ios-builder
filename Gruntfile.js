module.exports = function (grunt) {
  require('jit-grunt')(grunt, {
    'instrument': 'grunt-istanbul',
    'storeCoverage': 'grunt-istanbul',
    'makeReport': 'grunt-istanbul',
    'coverage': 'grunt-istanbul-coverage'
  });
  require('time-grunt')(grunt);

  grunt.initConfig({
    env: {
      test: { NODE_ENV: 'TEST' },
      coverage: { NODE_ENV: 'TEST', APP_DIR_FOR_CODE_COVERAGE: './coverage/instrument/lib/' }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },

      api: {
        src: [ 'lib/**/*.js', 'test/**/*.js', '!test/coverage/**/*.js' ]
      }
    },

    mochaTest: {
      options: {
        reporter: 'spec',
        require: 'test/globals.js'
      },
      src: ['test/**/*.spec.js']
    },

    clean: {
      cov: ["test/coverage"]
    },

    open: {
      cov: {
        path: "test/coverage/reports/lcov-report/index.html"
      }
    },

    instrument: {
      files: 'lib/**/*.js',
      options: {
        lazy: true,
        basePath: 'test/coverage/instrument/'
      }
    },

    storeCoverage: {
      options: {
        dir: 'test/coverage/reports'
      }
    },

    makeReport: {
      src: 'test/coverage/reports/**/*.json',
      options: {
        type: 'lcov',
        dir: 'test/coverage/reports',
        print: 'detail'
      }
    },

    coverage: {
      options: {
        thresholds: {
          'statements': 90,
          'branches': 90,
          'lines': 90,
          'functions': 90
        },
        dir: 'test/coverage/reports'
      }
    }
  });

  grunt.registerTask('test', [ 'env:test', 'jshint', 'mochaTest' ]);

  grunt.registerTask('cov:compute', [
    'clean:cov',
    'env:coverage',
    'instrument',
    'mochaTest',
    'storeCoverage',
    'makeReport'
  ]);

  grunt.registerTask('cov', ['cov:compute', 'open:cov']);
  grunt.registerTask('quality', ['jshint', 'cov:compute', 'coverage']);
}
