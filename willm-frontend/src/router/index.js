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
      const profileResponse = await axios.get('http://academic-willm.de/user/profile', { withCredentials: true });
      const gamificationResponse = await axios.get('http://academic-willm.de/user/gamification', { withCredentials: true });
      if (profileResponse.status === 200 && gamificationResponse.status === 200) {
        authStore.setIsAuthenticated(true);
        authStore.setUsername(profileResponse.data.username);
        authStore.setLanguage(profileResponse.data.language);
        authStore.setLLM('correctionModel', profileResponse.data.correctionModel);
        authStore.setLLM('furtherCorrectionModel', profileResponse.data.furtherCorrectionModel);
        authStore.setLLM('scoreModel', profileResponse.data.scoreModel);
        authStore.setLLM('reviewModel', profileResponse.data.reviewModel);
        authStore.setDailyRequestsLeft(profileResponse.data.dailyRequestsLeft);
        authStore.setGamificationData(gamificationResponse.data);
        next();
      } else {
        authStore.setIsAuthenticated(false);
        next({ name: 'login' });
      }
    } catch (error) {
      authStore.setIsAuthenticated(false);
      next({ name: 'login' });
    }
  } else {
    next();
  }
});

export default router;
