import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';
import { message } from 'ant-design-vue';

axios.defaults.withCredentials = true;

export const useAuthStore = defineStore('auth', {
  // Set initial state
  state: () => ({
    isAuthenticated: false,
    preTestsCompleted: false,
    postTestsCompleted: false,
    quizDueToday: false,
    nextQuizDate: null,
    username: '',
    language: '',
    correctionModel: '',
    furtherCorrectionModel: '',
    scoreModel: '',
    reviewModel: '',
    dailyRequestsLeft: 0,
    gamificationData: null,
    showQuizModal: false,
  }),
  // Define actions
  actions: {
    // Define action to register a new user
    async register(username, password) {
      try {
        const response = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/user/register', { username, password, dataPrivacyConsent });
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
    // Define action to login a user
    async login(username, password) {
      // Show loading spinner while logging in
      const hideLoading = message.info('Logging in...', 0);
      let hideLoading2;
      try {
        const response = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/user/login', { username, password });
        if (response.status === 200 && response.data.message === 'Login successful') {
          this.isAuthenticated = true;
          this.preTestsCompleted = response.data.preTestsCompleted;

          // Check if post-tests are completed
          if (response.data.postTestsCompleted) {
            this.postTestsCompleted = true;
            alert('You have completed the post-test and can no longer use the tool.');
            this.logout();
          } else {
            // Check quiz status
            // Show loading spinner while checking quiz status
            hideLoading2 = message.info('Generating quiz if necessary...', 0);
            const quizResponse = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/quiz/check-quiz');
            this.quizDueToday = quizResponse.data.quizDueToday;
            this.nextQuizDate = quizResponse.data.nextQuizDate ? quizResponse.data.nextQuizDate.split('T')[0].split('-').reverse().join('.') : null;

            // Notify user about quiz status
            if (this.quizDueToday) {
              // message.info('Quiz is due today.', 5);
              this.toggleQuizModal(true);
            } else if(this.nextQuizDate) {
              message.info(`Next quiz date: ${this.nextQuizDate}`, 7);
            } else {
              setTimeout(() => {
                message.info('No quiz scheduled yet.', 3);
              }, 2000);
            }

            // Redirect user to home page
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
          console.error(error);
        }
      } finally {
        // Hide loading spinner
        hideLoading();
        // Hide loading spinner if quiz got generated
        if (hideLoading2) hideLoading2();
      }
    },
    // Define action to logout a user
    async logout() {
      try {
        await axios.post('http://willm.corinth.informatik.rwth-aachen.de/user/logout');
        this.isAuthenticated = false;
        this.preTestsCompleted = false;
        this.postTestsCompleted = false;
        router.push({ name: 'login' });
      } catch (error) {
        message.error('An error occurred. Please try again.');
      }
    },
    toggleQuizModal(show) {
      this.showQuizModal = show;
    },
    // Define action to check if user is authenticated
    async checkAuthStatus() {
      try {
        const response = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/user/pre-test-status');
        this.preTestsCompleted = response.data.preTestsCompleted;
      } catch (error) {
        console.error('Error checking auth status');
      }
    },
    // Define action to set authentication status
    setIsAuthenticated(value) {
      this.isAuthenticated = value;
    },
    // Define action to set username
    setUsername(value) {
      this.username = value;
    },
    // Define action to set explanation language
    setLanguage(value) {
      this.language = value;
    },
    // Define action to get explanation language
    getLanguage() {
      return this.language;
    },
    // Define action to set LLM
    setLLM(model, value) {
      this[model] = value;
    },
    // Define action to get LLM
    getLLM(model) {
      return this[model];
    },
    // Define action to set daily requests left
    setDailyRequestsLeft(value) {
      this.dailyRequestsLeft = value;
    },
    // Define action to get gamification data
    getGamificationData() {
      return this.gamificationData;
    },
    // Define action to set gamification data
    setGamificationData(value) {
      this.gamificationData = value;
    },
  },
});
