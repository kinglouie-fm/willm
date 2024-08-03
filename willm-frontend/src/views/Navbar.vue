<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { message } from 'ant-design-vue';
import axios from 'axios';
import { isAfter } from 'date-fns';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const languages = [
    'English', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Bengali', 'Bosnian', 'Bulgarian', 'Burmese', 'Catalan', 'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Estonian', 'Finnish', 'French', 'Georgian', 'German', 'Greek', 'Gujarati', 'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Italian', 'Japanese', 'Kannada', 'Kazakh', 'Korean', 'Latvian', 'Lithuanian', 'Macedonian', 'Malay', 'Malayalam', 'Marathi', 'Mongolian', 'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese'
];
const selectedLanguage = ref('English');

// Update LLM in the store
const updateLLM = async (modelKey, value) => {
    const newValue = value === 'gpt-3.5-turbo' ? '3.5-turbo-1106' : '4o';

    try {
        await axios.patch('http:localhost:3000/user/updateModel', {
            modelKey: newValue,
        });
        authStore.setLLMModel(modelKey, newValue);
    } catch (error) {
        console.error(`Failed to update ${modelKey}`, error);
        message.error(`Failed to update ${modelKey}`);
    }
};

const updateLanguage = async () => {
    try {
        await axios.patch('http://localhost:3000/user/updateLanguage', {
            language: selectedLanguage.value,
        });

        authStore.setLanguage(selectedLanguage.value);
    } catch (error) {
        console.error('Failed to update language', error);
        message.error('Failed to update language');
    }
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
        const response = await axios.get('http://localhost:3000/quiz/check-quiz');
        if (response.data.quizDueToday) {
            message.info('Quiz is due today. Redirecting...');
            router.push('/quiz');
        } else {
            message.info('No quiz due today.', 2);
        }
    } catch (error) {
        console.error('Error checking quiz:', error);
        message.error('Error checking quiz.');
    }
};

// Determine if the post-test is enabled
const isPostTestEnabled = ref(isAfter(new Date(), new Date('2024-08-28')));

// Show post-test modal if enabled
const showPostTestModal = () => {
    if (isPostTestEnabled.value) {
        const postTestModal = new bootstrap.Modal(document.getElementById('postTestModal'));
        postTestModal.show();
    }
};

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
</script>

<template>
    <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">WILLM</a>

            <div class="flex-grow-1"></div>

            <div class="d-flex align-items-center">
                <button v-if="authStore.isAuthenticated && isPostTestEnabled" class="btn btn-post-test"
                    @click="showPostTestModal">
                    Start Post-Test
                </button>

                <div class="dropdown">
                    <button id="userDropdown" class="btn btn-link ms-3" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-person-circle fs-3"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" id="customDropdownMenu" aria-labelledby="userDropdown">
                        <li>
                            <h1 class="dropdown-header text-center">User: {{ authStore.username }}</h1>
                        </li>
                        <li>
                            <h1 class="dropdown-header">Language Settings</h1>
                        </li>
                        <li>
                            <div class="d-flex justify-content-between px-4">
                                <span>Explanations in: </span>
                                <select v-model="selectedLanguage" @change="updateLanguage" class="form-select-sm ms-3"
                                    style="width: auto;">
                                    <option v-for="language in languages" :key="language" :value="language">{{ language
                                        }}
                                    </option>
                                </select>
                            </div>
                        </li>
                        <li>
                            <h6 class="dropdown-header">Model Settings</h6>
                        </li>
                        <li v-for="(modelKey, name) in { Correction: 'correctionModel', 'Further Correction': 'furtherCorrectionModel', Score: 'scoreModel', Review: 'reviewModel' }"
                            :key="name" class="d-flex justify-content-between align-items-center px-4 pb-2">
                            <span>{{ name }}:</span>
                            <select @change="updateLLM(modelKey, $event.target.value)"
                                :value="authStore[modelKey] === '3.5-turbo-1106' ? 'gpt-3.5-turbo' : 'gpt-4o'"
                                class="form-select-sm ms-3">
                                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                                <option value="gpt-4o">gpt-4o</option>
                            </select>
                        </li>
                        <li>
                            <div class="d-flex justify-content-between align-items-center ps-4 pe-3">
                                <span>Request left for gpt-4o:</span>
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
                            <a class="dropdown-item" @click="typeof link === 'string' && link.toLowerCase() === 'logout' ? logout() :
                    link.toLowerCase() === 'quiz' ? checkQuiz() : navigateTo(link.path || `/${link.toLowerCase()}`)">
                                {{ link.name || link }}
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>

    <div class="modal fade" id="postTestModal" tabindex="-1" aria-labelledby="postTestModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="postTestModalLabel">Post-Test</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Post-Test Content -->
                    <p>Your post-test instructions or content goes here.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary">Start Post-Test</button>
                </div>
            </div>
        </div>
    </div>
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

a {
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
</style>
