<script setup>
import { computed } from 'vue';

const props = defineProps({
    currentLevel: Number,
    currentXP: Number,
    maxXP: Number,
    nextLevel: Number,
});

const progressPercentage = computed(() => {
    return (props.currentXP / props.maxXP) * 100;
});
</script>

<template>
    <div class="level-progress-container">
        <div class="scores">
            <span>{{ currentLevel }}</span>
            <span>{{ nextLevel }}</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress">
                <!-- Fill up to the current XP -->
                <div class="progress-bar current" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <div class="xp-label">
                <span>{{ currentXP }} / {{ maxXP }} XP</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.level-progress-container {
    width: 100%;
    margin-top: 10px;
    text-align: center;
}

.progress-bar-container {
    width: 100%;
    margin-top: 5px;
    position: relative;
}

.progress {
    height: 20px;
    border-radius: 10px;
    background-color: #ddd;
    display: flex;
    position: relative;
}

.progress-bar {
    height: 100%;
    position: absolute;
    top: 0;
}

.current {
    background-color: #4caf50;
    z-index: 1;
}

.scores {
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
    font-weight: bold;
}

.xp-label {
    margin-top: 5px;
    font-size: 1rem;
}
</style>
