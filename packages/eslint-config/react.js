import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

import base from './base.js';

export default defineConfig([
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react/button-has-type': 'error',
      'react/prop-types': 'off',
      'react/self-closing-comp': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    },
    settings: { react: { version: 'detect' } }
  },
  prettier
]);
