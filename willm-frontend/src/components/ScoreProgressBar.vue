<script setup>
const scoreOrder = ['grammar', 'vocabulary', 'organization', 'coherence', 'writing_style'];

// Define props
const props = defineProps({
    latestScore: Number,
    medianScore: Number
});
</script>

<template>
    <div class="score-card">
        <div class="progress-bar-container">
            <div class="progress">
                <!-- Fill up to the median score -->
                <div class="progress-bar median" :style="{ width: ((props.medianScore - 1) / 8) * 100 + '%' }"></div>

                <!-- If the latest score is greater than or equal to the median, fill from the median to the latest score in green -->
                <div v-if="props.latestScore >= props.medianScore" class="progress-bar difference" :style="{
                    left: ((props.medianScore - 1) / 8) * 100 + '%',
                    width: ((props.latestScore - props.medianScore) / 8) * 100 + '%',
                    backgroundColor: 'green'
                }"></div>

                <!-- If the latest score is less than the median, fill up to the latest score in the median color and the rest in red -->
                <div v-else>
                    <div class="progress-bar median-latest"
                        :style="{ width: ((props.latestScore - 1) / 8) * 100 + '%' }"></div>
                    <div class="progress-bar difference" :style="{
                        left: ((props.latestScore - 1) / 8) * 100 + '%',
                        width: ((props.medianScore - props.latestScore) / 8) * 100 + '%',
                        backgroundColor: 'red'
                    }"></div>
                </div>
            </div>
            <div class="scores">
                <span>1</span>
                <span>9</span>
            </div>
            <div class="scores">
                <span class="pe-3">Median: {{ props.medianScore.toFixed(1) }}</span>
                <span>Latest: {{ props.latestScore.toFixed(1) }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.progress-bar-container {
    width: 100%;
    margin-top: 5px;
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

.median {
    background-color: #eabc7c;
    z-index: 1;
}

.median-latest {
    background-color: #eabc7c;
    z-index: 2;
}

.difference {
    z-index: 3;
}

.scores {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-top: 5px;
}
</style>
