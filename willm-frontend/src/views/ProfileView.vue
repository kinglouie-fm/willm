<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import ScoreProgressBar from '../components/ScoreProgressBar.vue';
import * as bootstrap from 'bootstrap';

const sections = ref([]);
const selectedSection = ref('');
const comparisonData = ref(null);
const message = ref('');

const getSections = async () => {
    try {
        const response = await axios.get('http://localhost:3000/score/sections');
        console.log("sections: ", response);
        if (response.data.length === 0) {
            alert("No sections available for comparison. Please ensure you have scores older than 5 days for a section.");
        } else {
            sections.value = response.data;
        }
    } catch (error) {
        console.error("Error fetching sections: ", error);
    }
};

const fetchComparison = async () => {
    if (selectedSection.value) {
        try {
            const response = await axios.get(`http://localhost:3000/score/comparison/${selectedSection.value}`, { withCredentials: true });
            console.log("Comparison data: ", response.data);
            if (response.data.message) {
                message.value = response.data.message;
                comparisonData.value = null;
            } else {
                comparisonData.value = response.data;
                message.value = '';
            }
        } catch (error) {
            console.error("Error fetching comparison data: ", error);
        }
    }
};

const selectSection = (section) => {
    selectedSection.value = section;
    fetchComparison();
};

const initPopover = () => {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach((popoverTriggerEl) => {
        new bootstrap.Popover(popoverTriggerEl, {
            trigger: 'hover',
            html: true,
            content: document.querySelector('#popover-content').innerHTML,
            customClass: 'wide-popover'
        });
    });
};

onMounted(() => {
    getSections();
    initPopover();
});
</script>

<template>
    <div>
        <div class="container border mt-5 rounded p-3">
            <div>
                <h3>
                    Comparison of your scores
                    <img class="info-icon" src="/icons/icon-info-01.svg" data-bs-toggle="popover"
                        data-bs-placement="right" />
                </h3>
                <p>Select a section for which you want to compare your scores. </p>
                <div class="d-flex flex-wrap">
                    <button v-for="section in sections" :key="section" type="button" class="btn me-2 section-button"
                        :class="selectedSection === section ? 'btn-selected' : 'btn-unselected'"
                        @click="selectSection(section)">
                        {{ section }}
                    </button>
                </div>
            </div>
            <div v-if="message">
                <p>{{ message }}</p>
            </div>
            <div class="container" v-if="comparisonData">
                <div class="d-flex flex-wrap">
                    <div v-for="(value, key) in comparisonData.comparison" :key="key" class="me-3">
                        <p>{{ key.charAt(0).toUpperCase() + key.slice(1) }}:</p>
                        <ScoreProgressBar :latestScore="comparisonData.latestScore[key]"
                            :medianScore="comparisonData.medianOlderScore[key]" />
                    </div>
                </div>
            </div>
        </div>

        <div id="popover-content" style="display: none;">
            <h4>How the scores are calculated:</h4>
            <p>
                The median of all older scores for the selected section is calculated and compared to your
                latest score.
                The progress bar represents the comparison:
            </p>
            <ul>
                <li><strong class="median">Median Color:</strong> The median score of all
                    previous
                    scores.
                </li>
                <li><strong class="green">Green:</strong> Improvement above the median score.</li>
                <li><strong class="red">Red:</strong> Decline below the median score.</li>
            </ul>
            <p>
                If your latest score is higher than the median, the bar from the median to the latest score is
                green.
                If your latest score is lower than the median, the bar up to the latest score is the median
                color, and the rest is red.
            </p>
        </div>
    </div>
</template>

<style scoped>
.btn-selected {
    background-color: #eabc7c;
    color: white;
    border: 1px solid black;
    border-radius: 20px;
}

.btn-unselected {
    background-color: white;
    color: black;
    border: 1px solid black;
    border-radius: 20px;
}

.btn-selected:hover {
    background-color: #eabc7c;
    color: white;
}

.container {
    padding: 20px;
}

.info-icon {
    width: 20px;
    height: 20px;
    cursor: pointer;
}
</style>
