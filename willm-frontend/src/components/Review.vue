<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    reviewData: Object
});
</script>

<template>
    <div>
        <h4>Review Section</h4>
        <div v-if="props.reviewData === 'Not enough sessions to generate review.'">
            <p>{{ props.reviewData }}</p>
        </div>
        <div v-else-if="props.reviewData">
            <div v-for="(category, key) in props.reviewData" :key="key">
                <h3>{{ key.charAt(0).toUpperCase() + key.slice(1) }}</h3>
                <div v-if="category.improvements && category.improvements.length">
                    <h4>Improvements</h4>
                    <ul>
                        <li v-for="(improvement, index) in category.improvements" :key="index">{{ improvement }}</li>
                    </ul>
                </div>
                <div v-if="category.tips && category.tips.length">
                    <h4>Tips</h4>
                    <ul>
                        <li v-for="(tip, index) in category.tips" :key="index">{{ tip }}</li>
                    </ul>
                </div>
            </div>
        </div>
        <div v-else>
            <p>No review data available.</p>
        </div>
    </div>
</template>

<style scoped>
h3 {
    margin-top: 20px;
}

h4 {
    margin-top: 10px;
}

ul {
    list-style-type: disc;
    margin-left: 20px;
}
</style>
