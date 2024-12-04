import { createRouter, createWebHistory } from 'vue-router';
import MainView from '../views/MainView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import QuizView from '../views/QuizView.vue';
import PreTestView from '../views/PreTestView.vue';
import PostTestView from '../views/PostTestView.vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { isAfter } from 'date-fns';

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
  },
  {
    path: '/pre-test',
    name: 'pre-test',
    component: PreTestView,
    meta: { requiresAuth: true }
  },
  {
    path: '/post-test',
    name: 'post-test',
    component: PostTestView,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Check if user is authenticated before navigating to a route that requires authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Check if user is trying to access an auth-protected page
  if (to.matched.some(record => record.meta.requiresAuth)) {
    try {
      // Fetch user profile and test statuses
      const profileResponse = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/user/profile', { withCredentials: true });
      const gamificationResponse = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/user/gamification', { withCredentials: true });
      const isAfter2025 = isAfter(new Date(), new Date('2025-01-12'));

      if (profileResponse.status === 200 && gamificationResponse.status === 200) {
        // User is authenticated, update the store
        authStore.setIsAuthenticated(true);
        authStore.setPreTestStatus(profileResponse.data.preTestCompleted);
        authStore.setPostTestStatus(profileResponse.data.postTestCompleted);
        authStore.setUsername(profileResponse.data.username);
        authStore.setLanguage(profileResponse.data.language);
        authStore.setLLM('correctionModel', profileResponse.data.correctionModel);
        authStore.setLLM('furtherCorrectionModel', profileResponse.data.furtherCorrectionModel);
        authStore.setLLM('scoreModel', profileResponse.data.scoreModel);
        authStore.setLLM('reviewModel', profileResponse.data.reviewModel);
        authStore.setDailyRequestsLeft(profileResponse.data.dailyRequestsLeft);
        authStore.setGamificationData(gamificationResponse.data);

        if (!profileResponse.data.preTestCompleted && (to.name === 'home' || to.name === 'profile' || to.name === 'quiz' || to.name === 'post-test')) {
          next({ name: 'pre-test' });
        } else if (!profileResponse.data.postTestCompleted && isAfter2025 && (to.name === 'home' || to.name === 'profile' || to.name === 'quiz' || to.name === 'pre-test')) {
          next({ name: 'post-test' });
        } else if (profileResponse.data.preTestCompleted && (to.name === 'pre-test')) {
          next({ name: 'home' });
        } else if (!profileResponse.data.postTestCompleted && !isAfter2025 && (to.name === 'post-test')) {
          next({ name: 'home' });
        }
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
