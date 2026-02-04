import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from '@/router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import IconFont from '@/plugins/iconfont'
import 'virtual:svg-icons-register'
import '@/styles/tailwind.css'
import { message } from 'ant-design-vue'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(router)
app.use(pinia)
app.component('IconFont', IconFont)
app.mount('#app')
app.config.errorHandler = (err, instance, info) => {
  console.error('vue errorHandler: ', err, instance, info)
}

message.config({
  top: `4vh`,
  duration: 1,
  maxCount: 5
})
