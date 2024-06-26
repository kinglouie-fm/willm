<script setup>
import { ref } from 'vue'
import { auth } from '../stores/auth'

const username = ref('')
const password = ref('')

const login = async () => {
    await auth.login(username.value, password.value)
}
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
            <button type="submit" class="btn btn-primary mt-2">Login</button>
        </form>
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
