<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import ScoreProgressBar from '../components/ScoreProgressBar.vue';
import LevelProgressBar from '../components/LevelProgressBar.vue'; // Import the new component
import * as bootstrap from 'bootstrap';
import { message } from 'ant-design-vue';

const sections = ref([]);
const selectedSection = ref('');
const comparisonData = ref(null);
const response_message = ref('');
const achievementsOpen = ref(true);

const gamificationData = ref(null);

const levels = {
    1: 100,
    2: 300,
    3: 600,
    4: 1000,
    5: 1500,
    6: 2100,
    7: 2800,
    8: 3600,
    9: 4500,
    10: 5500,
};

const getNextLevelXP = (level) => {
    return levels[level + 1] || levels[10];
};

const getSections = async () => {
    try {
        const response = await axios.get('http://localhost:3000/score/sections');
        if (response.data.length === 0) {
            message.info("No sections available for comparison. Please ensure you have scores older than 5 days for a section.", 7);
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
            if (response.data.message) {
                response_message.value = response.data.message;
                comparisonData.value = null;
            } else {
                comparisonData.value = response.data;
                response_message.value = '';
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

const fetchGamification = async () => {
    try {
        const response = await axios.get('http://localhost:3000/user/gamification', { withCredentials: true });
        gamificationData.value = response.data;
        console.log(response.data);
    } catch (error) {
        console.error("Error fetching gamification: ", error)
    }
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

const toggleSection = (section) => {
    if (section === 'achievements') {
        achievementsOpen.value = !achievementsOpen.value;
    }
};

const isSectionOpen = (section) => {
    if (section === 'achievements') {
        return achievementsOpen.value;
    }
    return false;
};

const sectionIcon = (section) => {
    return isSectionOpen(section) ? 'arrow-icon open' : 'arrow-icon closed';
};

onMounted(() => {
    getSections();
    initPopover();
    fetchGamification();
});
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <div class="container border mt-5 rounded p-3">
                    <div>
                        <h3>
                            Comparison of your scores
                            <img class="info-icon" src="/icons/icon-info-01.svg" data-bs-toggle="popover"
                                data-bs-placement="right" />
                        </h3>
                        <p>Select a section for which you want to compare your scores. </p>
                        <div class="d-flex flex-wrap">
                            <button v-for="section in sections" :key="section" type="button"
                                class="btn me-2 section-button"
                                :class="selectedSection === section ? 'btn-selected' : 'btn-unselected'"
                                @click="selectSection(section)">
                                {{ section }}
                            </button>
                        </div>
                    </div>
                    <div v-if="response_message">
                        <p>{{ response_message }}</p>
                    </div>
                    <div v-if="comparisonData">
                        <div class="d-flex flex-wrap">
                            <div v-for="(value, key) in comparisonData.comparison" :key="key" class="me-3 mt-3">
                                <h5>{{ key.charAt(0).toUpperCase() + key.slice(1) }}:</h5>
                                <ScoreProgressBar :latestScore="comparisonData.latestScore[key]"
                                    :medianScore="comparisonData.medianOlderScore[key]" />
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
                            If your latest score is higher than the median, the bar from the median to the latest score
                            is
                            green.
                            If your latest score is lower than the median, the bar up to the latest score is the median
                            color, and the rest is red.
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="container border mt-5 rounded p-3">
                    <div>
                        <h3 class="text-center">Progress</h3>
                        <div v-if="gamificationData">
                            <LevelProgressBar :currentLevel="gamificationData.level" :currentXP="gamificationData.xp"
                                :maxXP="getNextLevelXP(gamificationData.level)"
                                :nextLevel="gamificationData.level + 1" />
                            <h5>Current Badge: {{ gamificationData.badges.length ?
                                gamificationData.badges[gamificationData.badges.length - 1].name : 'No badge yet' }}
                            </h5>
                            <p>Daily Streak: {{ gamificationData.daily_streak }} days</p>
                            <p>Weekly Streak: {{ gamificationData.weekly_streak }} weeks</p>
                        </div>
                        <div v-else>
                            <p>Loading...</p>
                        </div>
                    </div>
                    <div>
                        <h5 @click="toggleSection('achievements')" class="expandable-header">
                            <span :class="sectionIcon('achievements')"></span>
                            Achievements
                        </h5>
                        <div v-show="achievementsOpen">
                            <ul>
                                <li v-for="(value, key) in gamificationData?.achievements" :key="key">
                                    {{ key }}: {{ value }}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
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

.expandable-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    user-select: none;
}

.arrow-icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    background: url('data:image/svg+xml;utf8,<svg fill="%23838383" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat center;
    transition: transform 0.3s ease;
    margin-right: 0.5rem;
}

.arrow-icon.open {
    transform: rotate(360deg);
}

.arrow-icon.closed {
    transform: rotate(270deg);
}
</style>
