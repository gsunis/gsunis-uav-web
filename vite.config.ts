import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { createHtmlPlugin } from 'vite-plugin-html'
import ViteImages from 'vite-plugin-vue-images'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import { include, exclude } from './build/optimize'
import dayjs from 'dayjs'
import { chunkSplitPlugin } from 'vite-plugin-chunk-split'

const Timestamp = dayjs().valueOf()

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    define: {
      'process.env': env
    },
    optimizeDeps: {
      include,
      exclude,
      esbuildOptions: {
        target: 'esnext'
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },

    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          additionalData: '@import "@/styles/variables.less";'
        }
      }
    },
    plugins: [
      vue(),
      vueJsx(),
      chunkSplitPlugin(),
      ViteImages({
        dirs: ['src/assets/images'],
        extensions: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
        customResolvers: [],
        customSearchRegex: '([a-zA-Z0-9]+)'
      }),
      createHtmlPlugin({
        inject: {
          data: {
            title: env.VITE_APP_TITLE
          }
        }
      }),
      visualizer({ open: true, gzipSize: true, brotliSize: true, emitFile: false }),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'gzip',
        ext: '.gz'
      }),
      Components({
        dirs: ['src/components'],
        dts: 'src/components/components.d.ts',
        deep: true,
        resolvers: [AntDesignVueResolver({ resolveIcons: true, importStyle: false })]
      }),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia',
          '@vueuse/core',
          {
            axios: [['default', 'axios']]
          }
        ],
        dts: 'src/auto-import.d.ts',
        eslintrc: {
          enabled: true
        },
        resolvers: [AntDesignVueResolver()]
      }),
      createSvgIconsPlugin({
        iconDirs: [resolve(process.cwd(), 'src/assets/images/svg')],
        symbolId: 'icon-[dir]-[name]',
        svgoOptions: {
          plugins: [
            {
              name: 'removeAttrs',
              params: { attrs: ['fill'] }
            }
          ]
        }
      })
    ],
    build: {
      cssCodeSplit: true,
      target: 'esnext',
      chunkSizeWarningLimit: 2000,
      minify: 'terser',
      terserOptions: {
        compress: {
          keep_infinity: true
        }
      },
      rollupOptions: {
        output: {
          entryFileNames: `assets/js/[name].${Timestamp}.js`,
          chunkFileNames: `assets/js/[name].${Timestamp}.js`,
          assetFileNames: `assets/[ext]/[name].${Timestamp}.[ext]`
        }
      }
    }
  }
})
