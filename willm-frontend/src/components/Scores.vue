<script setup>
const scoreOrder = ['grammar', 'vocabulary', 'organization', 'coherence', 'writing_style'];

const props = defineProps({
    scores: {
        type: Object,
        default: () => ({
            grammar: 0,
            vocabulary: 0,
            organization: 0,
            coherence: 0,
            writing_style: 0
        })
    }
});
</script>

<template>
    <div class="container">
        <div class="d-flex align-items-center justify-content-center">
            <h2 class="mb-3">Scores</h2>
        </div>
        <div class="d-flex flex-wrap justify-content-center align-items-center">
            <div class="score-card mx-2 mb-2" v-for="category in scoreOrder" :key="category">
                <h6>{{ category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ') }}</h6>
                <div class="score-bar">
                    <div v-if="props.scores[category] !== null" class="score-bar-fill"
                        :style="{ width: (props.scores[category] / 9) * 100 + '%' }">
                    </div>
                </div>
                <div v-if="props.scores[category] !== null" class="score-label">{{ props.scores[category] }} / 9</div>
            </div>
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
