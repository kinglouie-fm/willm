<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { message } from 'ant-design-vue';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
import { isAfter } from 'date-fns';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

// Dropdown handling
const toggleDropdown = (id) => {
    const dropdownElement = document.getElementById(id);
    const dropdown = new bootstrap.Dropdown(dropdownElement);
    dropdown.toggle();
};

// Update LLM in the store
const updateLLM = async (modelKey, value) => {
    const newValue = value === 'gpt-3.5-turbo' ? '3.5-turbo' : '4o';

    try {
        await axios.patch('http:localhost:3000/user/updateModel', {
            [modelKey]: newValue,
        });
        authStore.setLLMModel(modelKey, newValue);
        // message.success(`${modelKey} updated successfully`);
    } catch (error) {
        console.error(`Failed to update ${modelKey}`, error);
        message.error(`Failed to update ${modelKey}`);
    }
}

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

// Define available links for the hamburger menu based on the current route
const availableLinks = ref([]);
onMounted(() => {
    const links = {
        '/': ['Profile', 'Quiz', 'Logout'],
        '/profile': ['Home', 'Quiz', 'Logout'],
        '/quiz': ['Home', 'Profile', 'Logout'],
    };
    availableLinks.value = links[route.path] || [];
});

onMounted(async () => {
    if (authStore.isAuthenticated) {
        try {
            const response = await axios.get('http://localhost:3000/user/getModels');
            const { correctionModel, furtherCorrectionModel, scoreModel, reviewModel, dailyRequestsLeft } = response.data;

            // Update the Pinia store with the values from the backend
            authStore.setLLM('correctionModel', correctionModel);
            authStore.setLLM('furtherCorrectionModel', furtherCorrectionModel);
            authStore.setLLM('scoreModel', scoreModel);
            authStore.setLLM('reviewModel', reviewModel);
            authStore.setDailyRequestsLeft(dailyRequestsLeft);
        } catch (error) {
            console.error('Failed to retrieve LLM models', error);
            message.error('Failed to retrieve LLM models');
        }
    }
});
</script>

<template>
    <nav class="navbar navbar-expand">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">WILLM</a>

            <div class="flex-grow-1"></div>

            <div class="d-flex align-items-center">
                <button v-if="authStore.isAuthenticated && isPostTestEnabled" class="btn btn-post-test"
                    @click="showPostTestModal">
                    Start Post-Test
                </button>

                <div class="dropdown">
                    <button id="userDropdown" class="btn btn-link ms-3" @click="toggleDropdown('userDropdown')">
                        <i class="bi bi-person-circle fs-3"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <h6 class="dropdown-header">{{ authStore.username }}</h6>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#">Settings</a>
                            <ul class="dropdown-menu dropdown-submenu dropdown-menu-start">
                                <li class="dropdown-header">Choose LLM</li>
                                <li v-for="(modelKey, name) in { Correction: 'correctionModel', 'Further Correction': 'furtherCorrectionModel', Score: 'scoreModel', Review: 'reviewModel' }"
                                    :key="name" class="d-flex justify-content-between align-items-center">
                                    <span>{{ name }}</span>
                                    <span>{{ authStore[modelKey] }}</span>
                                    <input type="checkbox" class="form-check-input ms-2"
                                        :checked="authStore[modelKey] === '3.5-turbo'"
                                        @change="updateLLM(modelKey, authStore[modelKey] === '3.5-turbo' ? 'gpt-4o' : 'gpt-3.5-turbo')" />
                                </li>
                                <li class="dropdown-item">
                                    Requests for gpt-4o left: {{ authStore[dailyRequestsLeft] }}
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>

                <div class="dropdown ms-3">
                    <button id="hamburgerDropdown" class="btn btn-link" @click="toggleDropdown('hamburgerDropdown')">
                        <i class="bi bi-list fs-3"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li v-for="link in availableLinks" :key="link">
                            <a class="dropdown-item" href="#" @click="navigateTo(`/${link.toLowerCase()}`)">
                                {{ link }}
                            </a>
                        </li>
                    </ul>
                </div>

                <!-- Check Quiz Button -->
                <button v-if="authStore.isAuthenticated" class="btn btn-check-quiz ms-3" @click="checkQuiz">
                    Check Quiz
                </button>

                <!-- Logout Button -->
                <button v-if="authStore.isAuthenticated" class="btn ms-3" @click="logout">
                    Logout
                </button>
            </div>
        </div>
    </nav>

    <!-- Post-Test Modal (if needed) -->
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
    color: #e09a9a;
}

.btn-check-quiz {
    color: #5a9ae0;
}

.btn:hover {
    color: #ffffff;
    background-color: #eabc7c;
}
</style>
