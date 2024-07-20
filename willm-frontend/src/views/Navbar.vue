<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const logout = async () => {
    await authStore.logout();
    router.push('/login');
};

const navigateTo = (path) => {
    router.push(path);
};
</script>

<template>
    <nav class="navbar navbar-expand">
        <div class="container-fluid d-flex flex-column align-items-stretch my-0 mx-3">
            <div class="row align-items-center justify-content-between">
                <div class="col-4 text-start mt-1 d-flex align-items-center">
                    <button class="btn me-2" v-if="authStore.isAuthenticated && route.path !== '/profile'"
                        @click="navigateTo('/profile')">
                        <h4>Profile Page</h4>
                    </button>
                    <button class="btn me-2" v-if="authStore.isAuthenticated && route.path !== '/'"
                        @click="navigateTo('/')">
                        <h4>Home</h4>
                    </button>
                </div>
                <div class="col-4 text-center mt-2">
                    <h1 class="title">WILLM</h1>
                </div>
                <div class="col-4 text-end mt-1">
                    <button class="btn" v-if="authStore.isAuthenticated" @click="logout">
                        <h4>Logout</h4>
                    </button>
                </div>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    height: 100px;
    background: #eabc7c;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px;
}

.title {
    white-space: nowrap;
}

.btn {
    margin: 0 5px;
}
</style>
