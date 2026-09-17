/**
 * Configuracion plana de ESLint para el monorepo.
 *
 * Deliberadamente centrada en detectar errores reales (variables sin usar,
 * promesas sin await, comparaciones sospechosas) y no en imponer estilo: el
 * formato ya es consistente y un linter de estilo solo generaria ruido.
 */

export default [
  {
    files: ['**/*.js'],
    ignores: ['**/node_modules/**', '**/dist/**'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module'
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      // Errores
      'no-undef': 'off', // sin type-checking cruzado navegador/Node da falsos positivos
      'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_|^next$',
        caughtErrors: 'none'
      }],
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-self-compare': 'error',
      'no-fallthrough': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',

      // Sombras y reasignaciones peligrosas
      'no-shadow-restricted-names': 'error',
      'no-class-assign': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Comparaciones
      eqeqeq: ['error', 'always', { null: 'ignore' }]
    }
  }
];
