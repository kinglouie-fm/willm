<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { message } from 'ant-design-vue';
import axios from 'axios';
import { isAfter } from 'date-fns';
import SmallLevelProgressBar from '../components/SmallLevelProgressBar.vue';
import * as bootstrap from 'bootstrap';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const selectedLanguage = ref();
const correctionModel = ref();
const furtherCorrectionModel = ref();
const scoreModel = ref();
const reviewModel = ref();
const gamificationData = ref();

const languages = [
    'English', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Bengali', 'Bosnian', 'Bulgarian', 'Burmese', 'Catalan', 'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Estonian', 'Finnish', 'French', 'Georgian', 'German', 'Greek', 'Gujarati', 'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Italian', 'Japanese', 'Kannada', 'Kazakh', 'Korean', 'Latvian', 'Lithuanian', 'Macedonian', 'Malay', 'Malayalam', 'Marathi', 'Mongolian', 'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese'
];

const modelKeys = {
    'Grammar/Vocabulary': 'correctionModel',
    'Organization/Coherence/Writing Style': 'furtherCorrectionModel',
    Score: 'scoreModel',
    Review: 'reviewModel'
};

// Computed property to check if a quiz is due today
const isQuizDueToday = computed(() => authStore.quizDueToday);

// Update LLM in the store and backend
const updateLLM = async (modelKey, value) => {
    const newValue = value === '3.5-turbo-1106' ? '3.5-turbo-1106' : '4o';

    try {
        await axios.patch('https://willm.corinth.informatik.rwth-aachen.de/user/updateModel', {
            [modelKey]: newValue,
        });
        authStore.setLLM(modelKey, newValue);
        // Update the local reactive variable
        if (modelKey === 'correctionModel') correctionModel.value = newValue;
        else if (modelKey === 'furtherCorrectionModel') furtherCorrectionModel.value = newValue;
        else if (modelKey === 'scoreModel') scoreModel.value = newValue;
        else if (modelKey === 'reviewModel') reviewModel.value = newValue;
    } catch (error) {
        message.error(`Failed to update ${modelKey}`);
    }
};

// Update explanation language in the store and backend
const updateLanguage = async () => {
    try {
        await axios.patch('https://willm.corinth.informatik.rwth-aachen.de/user/updateLanguage', {
            language: authStore.language,
        });
        authStore.setLanguage(authStore.language);
    } catch (error) {
        message.error('Failed to update language');
    }
};

const getNextLevelXP = (level) => {
    const levels = {
        0: 0,
        1: 100,
        2: 300,
        3: 600,
        4: 1000,
        5: 1500,
        6: 2100,
        7: 2800,
        8: 3600,
        9: 4500,
        10: 5500
    };
    return levels[level + 1] || levels[10];
};

// Logout function
const logout = async () => {
    await authStore.logout();
    router.push('/login');
};

// Navigation handling
const navigateTo = (path) => {
    router.push(path);
};

// Check quiz availability
const checkQuiz = async () => {
    try {
        const response = await axios.get('https://willm.corinth.informatik.rwth-aachen.de/quiz/check-quiz');
        if (response.data.quizDueToday) {
            message.info('Quiz is due today. Redirecting...');
            router.push('/quiz');
        } else {
            message.info('No quiz due today.', 2);
        }
    } catch (error) {
        message.error('Error checking quiz.');
    }
};

// Determine if the post-test is enabled
const isPostTestEnabled = ref(isAfter(new Date(), new Date('2024-09-07')));

// Show post-test modal if enabled
const showPostTestModal = () => {
    if (isPostTestEnabled.value) {
        const postTestModal = new bootstrap.Modal(document.getElementById('postTestModal'));
        postTestModal.show();
    }
};

// Computed property to determine the navigation links based on the current route
const navigationLinks = computed(() => {
    if (route.name === 'home') {
        return ['Profile', 'Quiz', 'Logout'];
    } else if (route.name === 'profile') {
        return [{ name: 'Home', path: '/' }, 'Quiz', 'Logout'];
    } else if (route.name === 'quiz') {
        return [{ name: 'Home', path: '/' }, 'Profile', 'Logout'];
    } else {
        return ['Logout'];
    }
});

// Handle navigation to different routes
const handleNavigation = (link) => {
    if (typeof link === 'string') {
        if (link.toLowerCase() === 'logout') {
            logout();
        } else if (link.toLowerCase() === 'quiz') {
            checkQuiz();
        } else {
            navigateTo(`/${link.toLowerCase()}`);
        }
    } else if (typeof link === 'object' && link.path) {
        navigateTo(link.path);
    }
};

// Fetch user data from the store
const fetchData = () => {
    gamificationData.value = authStore.getGamificationData();
    selectedLanguage.value = authStore.getLanguage();
    correctionModel.value = authStore.getLLM('correctionModel');
    furtherCorrectionModel.value = authStore.getLLM('furtherCorrectionModel');
    scoreModel.value = authStore.getLLM('scoreModel');
    reviewModel.value = authStore.getLLM('reviewModel');
}
</script>

<template>
    <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
            <a class="navbar-brand ms-2" @click="router.push('/')">WILLM</a>

            <div class="flex-grow-1"></div>

            <div v-if="authStore.isAuthenticated" class="d-flex align-items-center">
                <button v-if="isPostTestEnabled" class="btn btn-post-test" @click="showPostTestModal">
                    Start Post-Test
                </button>

                <div class="dropdown">
                    <button id="userDropdown" class="btn btn-link ms-3" data-bs-toggle="dropdown" aria-expanded="false"
                        @click="fetchData">
                        <i class="bi bi-person-circle fs-3"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" id="customDropdownMenu" aria-labelledby="userDropdown">
                        <li>
                            <h1 class="dropdown-header text-center">User: {{ authStore.username }}</h1>
                        </li>
                        <li>
                            <h1 class="dropdown-header">Your Progress</h1>
                        </li>
                        <li v-if="gamificationData">
                            <div class="px-3 pb-2 pt-1">
                                <SmallLevelProgressBar :currentLevel="gamificationData.level"
                                    :currentXP="gamificationData.xp" :maxXP="getNextLevelXP(gamificationData.level)"
                                    :nextLevel="gamificationData.level + 1" />
                                <div class="d-flex justify-content-between mt-1">
                                    <small>Daily Streak: {{ gamificationData.daily_streak }}</small>
                                    <small>Weekly Streak: {{ gamificationData.weekly_streak }}</small>
                                </div>
                            </div>
                        </li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li>
                            <h1 class="dropdown-header mt-2">Language Settings</h1>
                        </li>
                        <li>
                            <div class="d-flex justify-content-between px-4">
                                <span>Explanations in: </span>
                                <select v-model="authStore.language" @change="updateLanguage"
                                    class="form-select-sm ms-3 text-center" style="width: auto;">
                                    <option v-for="language in languages" :key="language" :value="language">
                                        {{ language }}
                                    </option>
                                </select>
                            </div>
                        </li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li>
                            <h6 class="dropdown-header mt-2">Model Settings</h6>
                        </li>
                        <li v-for="(modelKey, name) in modelKeys" :key="name"
                            class="d-flex justify-content-between align-items-center px-4 pb-2">
                            <span>{{ name }}:</span>
                            <select v-model="authStore[modelKey]" @change="updateLLM(modelKey, authStore[modelKey])"
                                class="form-select-sm ms-3 text-center">
                                <option value="3.5-turbo-1106">gpt-3.5-turbo</option>
                                <option value="4o">gpt-4o</option>
                            </select>
                        </li>
                        <li>
                            <div class="d-flex justify-content-between align-items-center ps-4 pe-4">
                                <span>Requests left for gpt-4o:</span>
                                <span>{{ authStore.dailyRequestsLeft }}</span>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="dropdown ms-3">
                    <button id="hamburgerDropdown" class="btn btn-link" href="#" data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <i class="bi bi-list fs-3"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="hamburgerDropdown">
                        <li v-for="link in navigationLinks" :key="link.name || link">
                            <a class="dropdown-item" @click="handleNavigation(link)">
                                <img v-if="link === 'Quiz' && isQuizDueToday" class="marker-icon me-2"
                                    src="/icons/marker-new-01.svg" alt="Quiz Due Today" />
                                {{ link.name || link }}
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px;
    background: #eabc7c;
}

#customDropdownMenu {
    min-width: 300px;
}

.navbar-brand {
    color: #4a3b31;
}

i {
    color: #4a3b31;
}

a,
.form-select-sm {
    cursor: pointer;
}

.dropdown-submenu {
    position: relative;
}

.dropdown-submenu .dropdown-menu {
    top: 0;
    left: 100%;
    margin-left: 0;
    margin-right: 0;
}

.btn-post-test {
    color: #ee3636;
}

.btn-check-quiz {
    color: #5a9ae0;
}

.btn:hover {
    color: #ffffff;
    background-color: #eabc7c;
}

a:active {
    background-color: #eabc7c;
}

.marker-icon {
    width: 15px;
    height: 15px;
}
</style>
