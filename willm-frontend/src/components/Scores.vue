<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    scores: Object
});
</script>

<template>
    <div class="scores-container">
        <div class="score-card" v-for="(data, category) in scores" :key="category">
            <h3>{{ category.charAt(0).toUpperCase() + category.slice(1) }}</h3>
            <div class="score-bar">
                <div class="score-bar-fill" :style="{ width: (data.score / 9) * 100 + '%' }"></div>
            </div>
            <div class="score-label">{{ data.score }} / 9</div>
            <p>{{ data.explanation }}</p>
        </div>
    </div>
</template>

<style scoped>
.scores-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
}

.score-card {
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
    text-align: center;
}

.score-card h3 {
    font-size: 1rem;
    margin: 0;
}

.score-bar {
    background-color: #ddd;
    border-radius: 4px;
    height: 15px;
    margin-top: 5px;
    position: relative;
}

.score-bar-fill {
    background-color: #eabc7c;
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
}

.score-label {
    margin-top: 5px;
    font-size: 0.8rem;
    font-weight: bold;
}
</style>
