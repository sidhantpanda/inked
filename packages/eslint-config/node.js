import { defineConfig } from 'eslint/config';
import globals from 'globals';

import base from './base.js';

export default defineConfig([
  ...base,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/require-await': 'off',
      'no-console': 'off'
    }
  }
]);
