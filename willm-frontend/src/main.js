import './assets/main.css'
import axios from 'axios'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import "@popperjs/core/dist/umd/popper.min.js"
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.js'
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'ant-design-vue/dist/reset.css';
import Antd from 'ant-design-vue';
import { createPinia } from 'pinia';
import 'bootstrap-icons/font/bootstrap-icons.css';

const pinia = createPinia();

const app = createApp(App)

axios.defaults.withCredentials = true;

app.use(router)
app.use(pinia)
app.use(Antd)

app.mount('#app')
