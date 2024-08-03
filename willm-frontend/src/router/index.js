import { createRouter, createWebHistory } from 'vue-router';
import MainView from '../views/MainView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import QuizView from '../views/QuizView.vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';

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
    path: '/register',
    name: 'register',
    component: RegisterView
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/quiz',
    name: 'quiz',
    component: QuizView,
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
      const response = await axios.get('http://localhost:3000/user/profile', { credentials: 'include' });
      if (response.status === 200) {
        authStore.isAuthenticated = true;
        console.log(response)
        authStore.setUsername(response.data.username);
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
