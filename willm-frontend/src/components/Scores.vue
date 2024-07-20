<script setup>
const scoreOrder = ['grammar', 'vocabulary', 'organization', 'coherence', 'writing_style'];

const props = defineProps({
    scores: {
        type: Object,
        default: () => ({
            grammar: { score: 0, explanation: 'N/A' },
            vocabulary: { score: 0, explanation: 'N/A' },
            organization: { score: 0, explanation: 'N/A' },
            coherence: { score: 0, explanation: 'N/A' },
            writing_style: { score: 0, explanation: 'N/A' }
        })
    }
});
</script>

<template>
    <div class="container">
        <div class="score-card" v-for="category in scoreOrder" :key="category">
            <h3>{{ category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ') }}</h3>
            <div class="score-bar">
                <div v-if="props.scores[category]" class="score-bar-fill"
                    :style="{ width: (props.scores[category].score / 9) * 100 + '%' }">
                </div>
            </div>
            <div v-if="props.scores[category]" class="score-label">{{ props.scores[category].score }} / 9</div>
            <p v-if="props.scores[category]">{{ props.scores[category].explanation }}</p>
        </div>
    </div>
</template>

<style scoped>
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
