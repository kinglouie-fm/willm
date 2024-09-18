<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const username = ref('');
const password = ref('');

// Login function
const login = async () => {
    await authStore.login(username.value, password.value);
};
</script>

<template>
    <div class="login-container">
        <h2>Login</h2>
        <form @submit.prevent="login">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" v-model="username" id="username" class="form-control" />
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" v-model="password" id="password" class="form-control" />
            </div>
            <button type="submit" class="btn btn-primary mt-2 me-2">Login</button>
        </form>
        <p class="mt-2">
            Don't have an account yet? Go to <a @click.prevent="$router.push({ name: 'register' })"
                href="#">registration</a>
        </p>
    </div>
</template>

<style scoped>
.login-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
}
</style>
