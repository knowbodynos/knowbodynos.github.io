import typescriptEslint from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({ baseDirectory: __dirname })

export default [
  // Ignore generated/build output (huge speed win)
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.contentlayer/**',
      'out/**',
      'dist/**',
      'coverage/**',
    ],
  },

  js.configs.recommended,

  ...compat.extends(
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended',
    'next',
    'next/core-web-vitals'
  ),

  // JS/MJS: lint without typed TS program (prevents TSConfig mismatch)
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.amd,
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // TS/TSX: typed linting using a dedicated ESLint TSConfig
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.amd,
        ...globals.node,
      },
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',

      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },

  {
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
]
