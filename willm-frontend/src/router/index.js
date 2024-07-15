// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import MainView from '../views/MainView.vue';
import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MainView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  if (to.matched.some(record => record.meta.requiresAuth)) {
    try {
      const response = await fetch('http://localhost:3000/user/profile', { credentials: 'include' });
      if (response.status === 200) {
        authStore.isAuthenticated = true;
        next();
      } else {
        authStore.isAuthenticated = false;
        next({ name: 'login' });
      }
    } catch (error) {
      authStore.isAuthenticated = false;
      next({ name: 'login' });
    }
  } else {
    next();
  }
});

export default router;
