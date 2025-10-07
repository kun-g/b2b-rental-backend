module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.base.json',
      './apps/*/tsconfig.json',
      './packages/*/tsconfig.json'
    ],
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
    'prettier'
  ],
  ignorePatterns: ['dist', '.next', 'node_modules'],
  overrides: [
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/triple-slash-reference': 'off'
      }
    }
  ]
};
