<script setup>
import { computed } from 'vue';

// Define props
const props = defineProps({
    currentCount: Number,
    targetCount: Number,
});

// Calculate progress percentage
const progressPercentage = computed(() => {
    return (props.currentCount / props.targetCount) * 100;
});
</script>

<template>
    <div class="achievement-progress-bar-container">
        <div class="progress-bar">
            <div class="progress" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="count-label">
            {{ currentCount }} / {{ targetCount }}
        </div>
    </div>
</template>

<style scoped>
.achievement-progress-bar-container {
    width: 100%;
    max-width: 150px;
    margin-top: 5px;
    position: relative;
}

.progress-bar {
    height: 10px;
    border-radius: 5px;
    background-color: #ddd;
    position: relative;
    width: 100%;
}

.progress {
    height: 100%;
    background-color: #eabc7c;
    border-radius: 5px;
}

.count-label {
    margin-top: 5px;
    font-size: 0.8rem;
    text-align: center;
}
</style>