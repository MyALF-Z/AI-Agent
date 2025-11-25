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


import { defineConfig, appTools } from '@modern-js/app-tools';
import pluginBff from '@modern-js/plugin-bff'; // 默认导入

export default defineConfig({
  runtime: { router: true }, // 开启路由
  plugins: [
    appTools({ bundler: 'rspack' }),
    (pluginBff as any)(), // 强制 TS 接受
  ],
});




