import './assets/main.css'
import axios from 'axios'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth } from './stores/auth'
import "@popperjs/core/dist/umd/popper.min.js"
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'ant-design-vue/dist/reset.css';
import Antd from 'ant-design-vue';

const app = createApp(App)

app.use(router)
app.use(Antd)

app.mount('#app')

if (auth.token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`
}
