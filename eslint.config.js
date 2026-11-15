import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'release', 'servidor/node_modules']),
  // Página web (React, se ejecuta en el navegador)
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Pruebas de la página: pueden exportar ayudas además de componentes
  {
    files: ['src/pruebas/**/*.{js,jsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Servidor (Node.js con módulos CommonJS: require / module.exports)
  {
    files: ['servidor/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  // Archivos de configuración del proyecto
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
