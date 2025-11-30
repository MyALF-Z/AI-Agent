// import { appTools, defineConfig } from '@modern-js/app-tools';

// // https://modernjs.dev/en/configure/app/usage
// export default defineConfig({
//   runtime: {
//     router: true,
//   },
//   plugins: [
//     appTools({
//       bundler: 'rspack', // Set to 'webpack' to enable webpack
//     }),
//   ],
// });


import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';

export default defineConfig({
  plugins: [
    appTools(),
    bffPlugin(),
  ],
});
