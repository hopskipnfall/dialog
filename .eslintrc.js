module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
    es2017: true,
  },
  extends: [
    'airbnb-typescript/base',
    'prettier', // Prettier modules must go last.
    'prettier/unicorn',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    project: [
      './tsconfig.serve.json',
      './src/tsconfig.app.json',
      './src/tsconfig.spec.json',
      './e2e/tsconfig.e2e.json',
      './src/environments/environments.eslint.json',
    ],
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  plugins: ['@typescript-eslint', 'unicorn', 'prettier'],
  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/prefer-default-export': 'off',
    'class-methods-use-this': 'off',
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    // Broken for type imports...
    'no-unused-vars': 'off',
    'eslint@typescript-eslint/no-unused-vars': 'off',
  },
  ignorePatterns: [
    'dist/**',
    'coverage/**',
    'src/**/*.js',
    'extraction/**/*.js',
    'main.js',
  ],
};
