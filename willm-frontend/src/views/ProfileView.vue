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

onMounted(getSections);
</script>

<template>
    <div>
        <h1>Profile Page</h1>
        <button class="btn btn-primary" @click="getSections">Fetch Comparison</button>
        <div>
            <label for="sections">Select Section:</label>
            <select id="sections" v-model="selectedSection" @change="fetchComparison">
                <option v-for="section in sections" :key="section" :value="section">{{ section }}</option>
            </select>
        </div>
        <div v-if="message">
            <p>{{ message }}</p>
        </div>
        <div v-if="comparisonData">
            <h2>Comparison for {{ selectedSection }}</h2>
            <div v-for="(value, key) in comparisonData.comparison" :key="key">
                <p>{{ key }}: {{ comparisonData.latestScore[key] }} (Improvement: {{ value.toFixed(2) }}%)</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.container {
    padding: 20px;
}
</style>
