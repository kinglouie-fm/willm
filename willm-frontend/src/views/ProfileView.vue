<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

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

onMounted(getSections);
</script>

<template>
    <div>
        <div class="container border mt-5 rounded p-3">
            <div>
                <h3>Comparison of your scores</h3>
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
                <p>You improved your score from before {{ comparisonData.daysDifference }} days by the
                    following
                    amount:</p>
                <div class="d-flex flex-wrap">
                    <div v-for="(value, key) in comparisonData.comparison" :key="key" class="me-3">
                        <p>{{ key.charAt(0).toUpperCase() + key.slice(1) }}: {{ value.toFixed(2) }}%</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="container border rounded mt-3">
            <h3>Gamification</h3>
            <p>Below you can see your gamification progress.</p>
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
</style>
