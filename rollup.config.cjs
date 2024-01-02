const pkg = require('./package.json');
const typescript = require('rollup-plugin-typescript2');
const terser = require('@rollup/plugin-terser');

module.exports = {
  input: 'src/main.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es',
    },
  ],
  plugins: [typescript(), terser()],
};
