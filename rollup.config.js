const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const { dts } = require('rollup-plugin-dts');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');
const { terser } = require('rollup-plugin-terser');
const packageJson = require('./package.json');

module.exports = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      json(),
      typescript({ 
        tsconfig: './tsconfig.json'
      }),
      terser(),
    ],
    external: [
      'react', 
      'react-dom', 
      'styled-components',
      'util'
    ]
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [
      'react', 
      'react-dom', 
      'styled-components',
      /\.css$/,
      'util'
    ]
  },
];