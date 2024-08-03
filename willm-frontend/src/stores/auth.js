import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';
import { message } from 'ant-design-vue';

axios.defaults.withCredentials = true;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    preTestsCompleted: false,
    postTestsCompleted: false,
    quizDueToday: false,
    nextQuizDate: null,
    username: '',
    correctionModel: '3.5-turbo-1106',
    furtherCorrectionModel: '3.5-turbo-1106',
    scoreModel: '3.5-turbo-1106',
    reviewModel: '3.5-turbo-1106',
    dailyRequestsLeft: 10,
  }),
  actions: {
    async register(username, password) {
      try {
        const response = await axios.post('http://localhost:3000/user/register', { username, password, dataPrivacyConsent });
        if (response.status === 201) {
          message.info('Registration successful. Please login.');
          router.push({ name: 'login' });
        } else {
          message.error('Registration failed. Please try again.');
        }
      } catch (error) {
        if (error.response && error.response.status === 400) {
          message.error('Username already taken. Please choose a different username.');
        } else {
          console.error(error);
          message.error('An error occurred. Please try again.');
        }
      }
    },
    async login(username, password) {
      const hideLoading = message.info('Logging in...', 0);
      let hideLoading2;
      try {
        const response = await axios.post('http://localhost:3000/user/login', { username, password });
        if (response.status === 200 && response.data.message === 'Login successful') {
          this.isAuthenticated = true;
          this.preTestsCompleted = response.data.preTestsCompleted;
          if (response.data.postTestsCompleted) {
            this.postTestsCompleted = true;
            alert('You have completed the post-test and can no longer use the tool.');
            this.logout();
          } else {
            // Check quiz status
            hideLoading2 = message.info('Generating quiz if necessary...', 0);
            const quizResponse = await axios.get('http://localhost:3000/quiz/check-quiz');
            this.quizDueToday = quizResponse.data.quizDueToday;
            this.nextQuizDate = quizResponse.data.nextQuizDate ? quizResponse.data.nextQuizDate.split('T')[0].split('-').reverse().join('.') : null;

            if (this.quizDueToday) {
              message.info('Quiz is due today.');
            } else if(this.nextQuizDate) {
              message.info(`Next quiz date: ${this.nextQuizDate}`, 3);
            } else {
              setTimeout(() => {
                message.info('No quiz scheduled yet.', 3);
              }, 2000);
            }
            router.push({ name: 'home' });
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 403) {
          alert('You have completed the post-test and can no longer use the tool.');
        } else if (error.response && error.response.status === 401){
          message.error('Invalid credentials.')
        } else {
          message.error('An error occurred. Please try again.');
        }
      } finally {
        hideLoading();
        if (hideLoading2) hideLoading2();
      }
    },
    async logout() {
      try {
        await axios.post('http://localhost:3000/user/logout');
        this.isAuthenticated = false;
        this.preTestsCompleted = false;
        this.postTestsCompleted = false;
        router.push({ name: 'login' });
      } catch (error) {
        message.error('An error occurred. Please try again.');
      }
    },
    async checkAuthStatus() {
      try {
        const response = await axios.get('http://localhost:3000/user/pre-test-status');
        this.preTestsCompleted = response.data.preTestsCompleted;
      } catch (error) {
        console.error('Error checking auth status');
      }
    },
    setUsername(value) {
      this.username = value;
    },
    setLLM(model, value) {
      this[model] = value;
    },
    getLLM(model) {
      return this[model];
    },
    setDailyRequestsLeft(value) {
      this.dailyRequestsLeft = value;
    },
  },
});
