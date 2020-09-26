module.exports = {
  "env": {
    "browser": true,
    "node": true,
    "es6": true,
    "es2017": true
  },
  "overrides": [
    {
      "files": ["*.ts"],
      "extends": [
        'airbnb-typescript/base',
        'plugin:unicorn/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:prettier/recommended',
        'prettier',
        'prettier/@typescript-eslint',
        // "plugin:@typescript-eslint/eslint-recommended",
      ],
      "parser": "@typescript-eslint/parser",
      "parserOptions": {
        "ecmaVersion": 10,
        "project": [
          "./tsconfig.serve.json",
          "./src/tsconfig.app.json",
          "./src/tsconfig.spec.json",
          "./e2e/tsconfig.e2e.json",
          "./src/environments/environments.eslint.json",
        ],
        "sourceType": "module",
        "ecmaFeatures": {
          "modules": true
        }
      },
      "plugins": [
        '@typescript-eslint',
        'prettier',
        'unicorn',
        'import',

        "@angular-eslint/eslint-plugin"
      ],
      "rules": {
        "@typescript-eslint/indent": [
          "error", 2, {
            "SwitchCase": 1,
            "CallExpression": { "arguments": "first" },
            "FunctionExpression": { "parameters": "first" },
            "FunctionDeclaration": { "parameters": "first" }
          }
        ],
        "@typescript-eslint/no-empty-function": 0,
        "@typescript-eslint/no-var-requires": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/no-unsafe-call": 0,
        "@typescript-eslint/no-unsafe-member-access": 0,
        "@typescript-eslint/no-unsafe-assignment": 0,
        "@typescript-eslint/no-unsafe-return": 0,
        "@typescript-eslint/no-floating-promises": 0,
        "@angular-eslint/use-injectable-provided-in": "error",
        "@angular-eslint/no-attribute-decorator": "error",

        "comma-dangle": ["error", {
          "arrays": "always-multiline",
          "objects": "always-multiline",
          "imports": "always-multiline",
          "exports": "always-multiline",
          "functions": "always-multiline",
        }],
        'quotes': ["error", "single"],
        // 'unicorn/filename-case': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        'unicorn/prevent-abbreviations': 'off',
        "no-redeclare": "off",
        "@typescript-eslint/no-redeclare": ["error"],
        "import/prefer-default-export": "off",
        "import/no-extraneous-dependencies": "warn",
        "no-plusplus": "off",
        "class-methods-use-this": "off",
        "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "WithStatement"],
        "prefer-promise-reject-errors": "warn",
        "no-await-in-loop": "warn",
      }
    },
    {
      "files": ["*.component.html"],
      "parser": "@angular-eslint/template-parser",
      "plugins": ["@angular-eslint/template"],
      "rules": {
        "@angular-eslint/template/banana-in-a-box": "error",
        "@angular-eslint/template/no-negated-async": "error"
      }
    }
  ]
};
