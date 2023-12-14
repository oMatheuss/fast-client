import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/main.ts',
  output: {
    file: 'output/index.js',
    format: 'cjs',
  },
  plugins: [typescript(), terser()],
};
