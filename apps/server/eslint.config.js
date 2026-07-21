import node from '@inked/eslint-config/node';

export default [
  ...node,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
        projectService: false,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
];
