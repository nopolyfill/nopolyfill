'use strict';

module.exports = require('eslint-config-sukka').sukka({
  node: true,
  ts: {
    tsconfigPath: './tsconfig.json'
  }
}, {
  ignores: ['dist', 'packages/es-iterator-helpers/**/*.js', 'packages/tools/cli/bin/nolyfill.js', 'packages/generated/**/*.js']
}, {
  rules: {
    '@fluffyfox/array/prefer-from': 'off',
    'prefer-object-has-own': 'off'
  }
}, {
  files: ['packages/data/**/*'],
  rules: {
    '@typescript-eslint/unbound-method': 'off',
    'sukka/unicorn/new-for-builtins': 'off',
    'sukka/unicorn/no-useless-undefined': 'off' // polyfill match real behavior
  }
});
