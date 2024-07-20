<script setup>
import { computed } from 'vue';

const props = defineProps({
    reviewData: {
        type: [Object, String],
        default: () => null
    }
});

const getDisplayKey = (key) => {
    if (key === 'grammar_vocab') {
        return 'Grammar and Vocabulary';
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
};

// Filter out keys with empty improvements and tips arrays
const filteredReviewData = computed(() => {
    if (typeof props.reviewData === 'string' || !props.reviewData) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(props.reviewData).filter(([key, value]) => {
            return (value.improvements && value.improvements.length) || (value.tips && value.tips.length);
        })
    );
});
</script>

<template>
    <div class="container">
        <h2 class="text-center">Review</h2>
        <div v-if="typeof props.reviewData === 'string'">
            <p>{{ props.reviewData }}</p>
        </div>
        <div v-else-if="Object.keys(filteredReviewData).length">
            <div v-for="(categoryData, key) in filteredReviewData" :key="key">
                <h4>{{ getDisplayKey(key) }}</h4>
                <div v-if="categoryData.improvements && categoryData.improvements.length">
                    <h5>Improvements</h5>
                    <ul>
                        <li v-for="(improvement, index) in categoryData.improvements" :key="index">{{ improvement }}
                        </li>
                    </ul>
                </div>
                <div v-if="categoryData.tips && categoryData.tips.length">
                    <h5>Tips</h5>
                    <ul>
                        <li v-for="(tip, index) in categoryData.tips" :key="index">{{ tip }}</li>
                    </ul>
                </div>
            </div>
        </div>
        <div v-else>
            <p>No review data available.</p>
        </div>
    </div>
</template>

<style scoped></style>
