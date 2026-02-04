/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module 'echarts/lib/echarts'
declare module 'crypto-js'
declare module 'ant-design-vue/es'

interface Window {
  nextLoading: boolean
}
