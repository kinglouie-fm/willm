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
        <div class="progress-bar-container my-5">
            <div class="progress">
                <div class="progress-bar current" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <div class="scores mt-2">
                <span>Level {{ currentLevel }}</span>
                <span>{{ currentXP }} / {{ maxXP }} XP</span>
                <span>Level {{ nextLevel }}</span>
            </div>
            <div class="xp-label">

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
    height: 10px;
    border-radius: 5px;
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
    font-size: 1rem;
    font-weight: bold;
}

.xp-label {
    margin-top: 5px;
    font-size: 1rem;
}
</style>
