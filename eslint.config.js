import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig.FlatConfig} */
export default [
  // Global ignores
  {
    ignores: [
      'node_modules/',
      '.svelte-kit/',
      'build/',
      'dist/',
      'coverage/',
      'static/',
      'src-tauri',
      '.vscode',
      '.git',
    ],
  },

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // Base JS (strict)
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'object-shorthand': 'error',
      'comma-dangle': ['error', 'always-multiline'],
    },
  },

  // TypeScript (type-checked, strict)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        // Type-aware rules:
        project: ['./tsconfig.json'],
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: await import('eslint-plugin-import'),
    },
    rules: {
      // Recommended + strict TS rules
      ...tseslint.configs['recommended-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,

      // Keep things strict but practical
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreIIFE: true },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Imports hygiene
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-mutable-exports': 'error',
      'import/newline-after-import': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Svelte files (.svelte) with TS support & Prettier compatibility
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: {
          ts: tsparser, // let TS inside <script lang="ts"> be parsed with TS parser
        },
        project: ['./tsconfig.json'],
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        extraFileExtensions: ['.svelte'],
      },
    },
    plugins: { svelte },
    rules: {
      // Start from recommended Svelte
      ...svelte.configs['flat/recommended'].rules,
      // Disable stylistic rules that clash with Prettier (incl. Svelte formatting)
      ...svelte.configs['flat/prettier'].rules,

      // A few solid Svelte-specific checks
      'svelte/no-at-html-tags': 'error',
      'svelte/no-dupe-else-if-blocks': 'error',
      'svelte/no-dupe-style-properties': 'error',
      'svelte/no-reactive-functions': 'error',
      'svelte/valid-compile': 'error',
    },
  },

  // Turn off any stylistic rules Prettier handles (for all files)
  {
    rules: {
      ...prettierConfig.rules,
    },
  },
];
