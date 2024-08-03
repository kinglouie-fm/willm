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
    <div class="small-level-progress-container">
        <div class="progress-bar-container">
            <div class="progress">
                <div class="progress-bar current" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <div class="scores mt-2">
                <span>Lvl {{ currentLevel }}</span>
                <span>{{ currentXP }} XP</span>
                <span>Lvl {{ nextLevel }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.small-level-progress-container {
    width: 100%;
    margin-top: 5px;
    text-align: center;
}

.progress-bar-container {
    width: 100%;
    margin-top: 5px;
    position: relative;
}

.progress {
    height: 6px;
    border-radius: 3px;
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
    background-color: #eabc7c;
    z-index: 1;
}

.scores {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: bold;
}
</style>
