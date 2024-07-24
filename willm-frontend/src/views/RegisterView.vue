<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const dataPrivacyConsent = ref(false);
const showPrivacyPolicy = ref(false);

const register = async () => {
    if (dataPrivacyConsent.value) {
        await authStore.register(username.value, password.value, dataPrivacyConsent.value);
    } else {
        alert('You must accept the data privacy consent to register.');
    }
};

const togglePrivacyPolicy = () => {
    showPrivacyPolicy.value = !showPrivacyPolicy.value;
};
</script>

<template>
    <div class="register-container">
        <h2>Register</h2>
        <form @submit.prevent="register">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" v-model="username" id="username" class="form-control" />
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" v-model="password" id="password" class="form-control" />
            </div>
            <div class="form-group">
                <input type="checkbox" v-model="dataPrivacyConsent" id="dataPrivacyConsent" class="me-2" />
                <label for="dataPrivacyConsent">
                    I accept the <a @click.prevent="togglePrivacyPolicy" href="#">data privacy consent</a>
                </label>
            </div>
            <button type="submit" class="btn btn-primary mt-2">Register</button>
        </form>
        <p class="mt-2">
            Already have an account? Go to <a @click.prevent="$router.push({ name: 'login' })" href="#">login</a>
        </p>

        <div v-if="showPrivacyPolicy" class="privacy-policy-modal">
            <div class="privacy-policy-content">
                <h3>Data Privacy Consent</h3>
                <p><strong>Purpose of Data Collection:</strong> As part of my bachelor thesis, I am conducting research
                    to develop and evaluate WILLM. The data collected will be used exclusively for academic purposes.
                </p>
                <p><strong>Types of Data Collected:</strong></p>
                <ul>
                    <li><strong>Personal Information:</strong> Username and password.</li>
                    <li><strong>Usage Data:</strong> Interaction with the tool, including actions performed and time
                        spent using different features.</li>
                </ul>
                <p><strong>Use of Data:</strong></p>
                <ul>
                    <li><strong>Confidentiality:</strong> All collected data will be kept confidential and used solely
                        for the purpose of this research.</li>
                    <li><strong>Anonymity:</strong> Any published results will be anonymized to ensure that individual
                        participants cannot be identified.</li>
                    <li><strong>Data Security:</strong> Data will be stored securely and accessible only to the research
                        team.</li>
                </ul>
                <p><strong>Data Sharing:</strong> Your data will not be shared with any third parties outside of the
                    research team, except as required by law or for academic publication in anonymized form.</p>
                <p><strong>Voluntary Participation:</strong> Participation in this study is voluntary. You may withdraw
                    at any time without any penalty. If you choose to withdraw, your data will be deleted immediately.
                </p>
                <p><strong>Contact Information:</strong> For any questions or concerns about the study or your data,
                    please contact me at <a href="mailto:ben.thillen@rwth-aachen.de">ben.thillen@rwth-aachen.de</a></p>
                <p><strong>Consent:</strong> By registering and participating in this study, you acknowledge that you
                    have read and understood the above information and consent to the collection and use of your data as
                    described.</p>
                <button @click="togglePrivacyPolicy" class="btn btn-secondary mt-2">Close</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.register-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.privacy-policy-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.privacy-policy-content {
    background-color: white;
    padding: 20px;
    border-radius: 4px;
    max-width: 600px;
    text-align: left;
    max-height: 800px;
    overflow-y: auto;
}
</style>
