<script setup>
import { computed, ref, onMounted } from 'vue';

const feedbackDiv = ref(null);
const isTipSelected = ref(true);

// Define props
const props = defineProps({
    reviewData: {
        type: [Object, String],
        default: () => null
    }
});

// Handle switch toggle
const toggleSwitch = () => {
    isTipSelected.value = !isTipSelected.value;
};

// Get the data to display (tips or improvements based on the switch state)
const displayData = computed(() => {
    if (typeof props.reviewData === 'string' || !props.reviewData) {
        return [];
    }

    return Object.entries(props.reviewData).map(([key, value]) => ({
        key,
        title: key === 'grammar_vocab'
            ? 'Grammar and Vocabulary'
            : key === 'writingStyle'
                ? 'Writing Style'
                : key.charAt(0).toUpperCase() + key.slice(1),
        items: isTipSelected.value ? value.tips : value.improvements,
    })).filter(entry => entry.items && entry.items.length);
});

// // Add shadow to bottom of feedback div if overflow to indicate that there is more content
// const handleScroll = () => {
//     const element = feedbackDiv.value;
//     if (!element) return;

//     const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

//     if (isAtBottom) {
//         element.classList.remove('has-shadow-bottom');
//     } else {
//         element.classList.add('has-shadow-bottom');
//     }
// };

// // Check if feedback div has overflow and add shadow to bottom if it does
// const checkInitialOverflow = () => {
//     const element = feedbackDiv.value;
//     if (!element) return;

//     if (element.scrollHeight > element.clientHeight - 1) {
//         element.classList.add('has-shadow-bottom');
//     } else {
//         element.classList.remove('has-shadow-bottom');
//     }
// };

// Get right display key
const getDisplayKey = (key) => {
    if (key === 'grammar_vocab') {
        return 'Grammar and Vocabulary';
    }
    if (key === 'writingStyle') {
        return 'Writing Style';
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
};

// Filter out keys with empty improvements and tips arrays
const filteredReviewData = computed(() => {
    if (typeof props.reviewData === 'string' || !props.reviewData) {
        return {};
    }

    let filtered = Object.fromEntries(
        Object.entries(props.reviewData).map(([key, value]) => {
            // If tips array is empty, add "everything's fine"
            if (value.tips && value.tips.length === 0) {
                value.tips.push("everything's fine");
            }

            // If improvements array is empty, add "everything's fine"
            if (value.improvements && value.improvements.length === 0) {
                value.improvements.push("everything's fine");
            }

            if (value.tips) {
                // Check if tips contain any generated tips (i.e., real tips) aside from the "not generated" ones
                const hasGeneratedTips = value.tips.some(tip =>
                    tip !== 'organization_tip not generated' && tip !== 'coherence_tip not generated'
                );

                // If there are valid tips, remove "organization_tip not generated" and "coherence_tip not generated"
                if (hasGeneratedTips) {
                    value.tips = value.tips.filter(tip =>
                        tip !== 'organization_tip not generated' && tip !== 'coherence_tip not generated'
                    );
                } else {
                    // If there are no other tips besides the "not generated" ones, replace with "everything's fine"
                    const hasOnlyNotGeneratedTips = value.tips.every(tip =>
                        tip === 'organization_tip not generated' || tip === 'coherence_tip not generated'
                    );

                    if (hasOnlyNotGeneratedTips && value.tips.length > 0) {
                        value.tips = ["everything's fine"];
                    }
                }
            }

            return [key, value];
        }).filter(([key, value]) => {
            return (
                (value.improvements && value.improvements.length) ||
                (value.tips && value.tips.length) ||
                (value.frequencies && value.frequencies.length)
            );
        })
    );

    return filtered;
});

onMounted(async () => {
    const element = feedbackDiv.value;
    if (element) {
        element.addEventListener('scroll', handleScroll);
        checkInitialOverflow();
    }
});
</script>

<template>
    <div class="container">
        <div class="d-flex align-items-center justify-content-center mb-3">
            <img class="info-icon me-2" src="/icons/icon-info-01.svg" data-bs-toggle="popover"
                data-bs-placement="bottom" data-bs-content='
                <h5>What are reviews?</h5>
                <ul>
                    <li>Reviews serve as reminders of your current writing challenges.</li>
                    <ul>
                        <li>Tips: A recap of your most frequent mistakes in each category.</li>
                        <li>Improvements: Areas where you improved your writing.</li>
                    </ul>
                    <li>If there is no recent review available:</li>
                    <ul>
                        <li>Click on "Review" to generate one.</li>
                        <li><b>Remember:</b></li>
                        <ul>
                            <li>A review is generated by using your last 5 submissions.</li>
                            <li>You need to have at least two sessions and one submitted text to generate a review. These are generated when you evaluate your writing. Only one is generated each day.</li>
                        </ul>
                    </ul>
                </ul>' />
            <h2 class="mb-0">Review</h2>
        </div>
        <div class="d-flex align-items-center justify-content-center mb-3">
            <div class="form-check form-switch">
                <label class="form-check-label me-2" for="reviewSwitch">Tips</label>
                <input class="form-check-input" type="checkbox" role="switch" id="reviewSwitch" @change="toggleSwitch"
                    :checked="!isTipSelected" />
                <label class="form-check-label ms-2" for="reviewSwitch">Recent Improvements</label>
            </div>
        </div>
        <div class="feedback" ref="feedbackDiv">
            <div v-if="typeof props.reviewData === 'string'">
                <p>{{ props.reviewData }}</p>
            </div>
            <div v-else-if="displayData.length">
                <div v-for="(entry, index) in displayData" :key="index" class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">{{ entry.title }}</h6>
                        <ul class="card-text">
                            <li v-for="(item, idx) in entry.items" :key="idx">{{ item }}</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div v-else>
                <p>No data available.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.info-icon {
    width: 25px;
    height: 25px;
    cursor: pointer;
}

.feedback {
    overflow-y: auto;
    max-height: 70vh;
    box-shadow: none;
    transition: box-shadow 0.3s ease-in-out;
}

/* .feedback.has-shadow-bottom {
    box-shadow: inset 0 -6px 6px -6px rgba(0, 0, 0, 0.3);
}

.scrollable {
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease-in-out;
} */

.card {
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
}

.card-title {
    font-weight: bold;
}

.card-text li {
    list-style: none;
    margin-left: 20px;
}

.card-text ul {
    list-style: none;
    padding-left: 0;
    margin-left: 0;
}

.form-check-input {
    cursor: pointer;
}
</style>
