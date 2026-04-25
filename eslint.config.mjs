import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import noFloatingPromise from 'eslint-plugin-no-floating-promise'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'

const customRules = {
  // https://eslint.org/docs/rules/
  curly: ['off', 'multi-line', 'consistent'],
  'dot-notation': 'warn',
  'eol-last': 'warn',
  eqeqeq: 'warn',
  'no-await-in-loop': 'off',
  'no-dupe-class-members': 'off',
  'no-else-return': 'warn',
  'no-empty-pattern': 'off',
  'no-extra-bind': 'warn',
  'no-fallthrough': ['error', { commentPattern: 'no-fallthrough-ignore' }],
  'no-implicit-coercion': ['warn', { allow: ['!!'] }],
  'no-template-curly-in-string': 'error',
  'no-unused-vars': 'off',
  'no-useless-computed-key': 'warn',
  'no-useless-rename': 'warn',
  'no-useless-return': 'warn',
  'no-var': 'warn',
  'nonblock-statement-body-position': 'off',
  'object-shorthand': 'warn',
  'operator-assignment': 'warn',
  'prefer-const': 'warn',
  'prefer-template': 'warn',
  quotes: [
    'off',
    'single',
    { avoidEscape: true, allowTemplateLiterals: false },
  ],
  radix: 'error',
  'react/no-unescaped-entities': 'error',
  yoda: 'warn',

  // https://github.com/lydell/eslint-plugin-simple-import-sort#example-configuration
  'simple-import-sort/exports': 'warn',
  'simple-import-sort/imports': 'warn',

  // https://github.com/SebastienGllmt/eslint-plugin-no-floating-promise#usage
  'no-floating-promise/no-floating-promise': 'error',

  // https://github.com/sweepline/eslint-plugin-unused-imports#usage
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'error',
    {
      args: 'after-used',
      argsIgnorePattern: '^_',
      vars: 'all',
      varsIgnorePattern: '^_',
    },
  ],
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: {
      'no-floating-promise': noFloatingPromise,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: customRules,
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])
