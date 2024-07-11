<script setup>
import { ref } from 'vue';
import Correction from './Correction.vue';
import Review from './Review.vue';

const props = defineProps({
    isOpen: Boolean,
    reviewData: Object,
    furtherCorrectionData: Object
});

const emit = defineEmits(['close']);

const closeSidebar = () => {
    emit('close');
};

const selectedTab = ref('Correction');
</script>

<template>
    <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
        <div class="sidebar-content d-flex flex-column align-items-end">
            <button class="btn-close m-2" @click="closeSidebar"></button>
            <div class="w-100 mt-2 d-flex justify-content-center">
                <button class="tab-button btn-lg" @click="selectedTab = 'Correction'"
                    :class="{ active: selectedTab === 'Correction' }">Correction</button>
                <button class="tab-button btn-lg" @click="selectedTab = 'Review'"
                    :class="{ active: selectedTab === 'Review' }">Review</button>
            </div>
            <div class="content-container border rounded w-100">
                <component class="m-4" :is="selectedTab === 'Correction' ? Correction : Review"
                    :review-data="props.reviewData" :furtherCorrectionData="props.furtherCorrectionData" />
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

.tab-button {
    border: 1px solid #c5c5c5;
    border-bottom: none;
    background-color: white;
    border-radius: 0.375rem 0.375rem 0 0;
    margin: 0;
    padding: 10px 20px;
}

.tab-button.active {
    color: #eabc7c;
    border-bottom: 1px solid white;
}

.content-container {
    border-top: none;
}
</style>