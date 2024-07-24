import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';

axios.defaults.withCredentials = true;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
  }),
  actions: {
    async register(username, password) {
      try {
        const response = await axios.post('http://localhost:3000/user/register', { username, password, dataPrivacyConsent });
        if (response.status === 201) {
          alert('Registration successful. Please login.');
          router.push({ name: 'login' });
        } else {
          alert('Registration failed. Please try again.');
        }
      } catch (error) {
        if (error.response && error.response.status === 400) {
          alert('Username already taken. Please choose a different username.');
        } else {
          console.error(error);
          alert('An error occurred. Please try again.');
        }
      }
    },
    async login(username, password) {
      try {
        const response = await axios.post('http://localhost:3000/user/login', { username, password });
        if (response.status === 200 && response.data.message === 'Login successful') {
          this.isAuthenticated = true;
          router.push({ name: 'home' });
        } else {
          alert('Invalid username or password');
        }
      } catch (error) {
        alert('An error occurred. Please try again.');
      }
    },
    async logout() {
      try {
        await axios.post('http://localhost:3000/user/logout');
        this.isAuthenticated = false;
        router.push({ name: 'login' });
      } catch (error) {
        alert('An error occurred. Please try again.');
      }
    },
  },
});
