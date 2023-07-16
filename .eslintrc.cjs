module.exports = {
  env: {
    browser: false,
    es2021: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-shadow': 'off',
    'no-plusplus': 'off',
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'class-methods-use-this': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': 'off',
    'prettier/prettier': 'error',
    'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
    'no-nested-ternary': 'off',
  },
  ignorePatterns: [
    'src.bak/**/*',
    'out-tsc/**/*',
    'node_modules/**/*',
    'dist/**/*',
    '*.d.ts',
  ],
}
