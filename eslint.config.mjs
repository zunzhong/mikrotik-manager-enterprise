import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.turbo/**',
      '**/apps/server/prisma/generated/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['project-docs/snippets/**/*.browser.js'],
    languageOptions: {
      globals: {
        localStorage: 'readonly',
        location: 'readonly',
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
    },
  },
];
