import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { loadPublicConfig } from './lib/config'
import './style.css'

void loadPublicConfig().then(() => createApp(App).use(router).mount('#app'))