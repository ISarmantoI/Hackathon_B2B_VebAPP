import { createApp } from 'vue'
import './assets/index.css'
import 'vue-sonner/style.css'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { useThemeStore } from './stores/theme'

useThemeStore(pinia).initializeTheme()

createApp(App).use(pinia).use(router).mount('#app')
