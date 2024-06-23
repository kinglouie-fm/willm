<script setup>
import { ref } from 'vue';

const props = defineProps({
    isOpen: Boolean
});

const emit = defineEmits(['close']);

const closeSidebar = () => {
    emit('close');
};
</script>

<template>
    <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
        <div class="sidebar-content d-flex flex-column align-items-end">
            <button class="btn-close m-2" @click="closeSidebar"></button>
            <div class="w-100 mt-2">
                <h1 class="text-center">Feedback</h1>
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sidebar {
    position: fixed;
    top: 0;
    right: -40%;
    width: 40%;
    height: 100%;
    background-color: white;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.5);
    transition: right 0.3s ease;
    overflow-y: auto;
}

.sidebar-open {
    right: 0;
}

.sidebar-content {
    padding: 20px;
}
</style>
