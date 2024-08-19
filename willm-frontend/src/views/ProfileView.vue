<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import ScoreProgressBar from '../components/ScoreProgressBar.vue';
import LevelProgressBar from '../components/LevelProgressBar.vue';
import AchievementProgressBar from '../components/AchievementProgressBar.vue';
import * as bootstrap from 'bootstrap';
import { message } from 'ant-design-vue';

const sections = ref([]);
const selectedSection = ref('');
const comparisonData = ref(null);
const response_message = ref('');

const gamificationData = ref(null); // Initialize as null to check for loading state

const levels = {
    0: 0,
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
    11: 6600,
    12: 7800,
};

const achievementsConfig = {
    quizzes_completed: {
        "1": 100,
        "3": 200,
        "5": 300,
    },
    correct_answers: {
        "5": 100,
        "10": 200,
        "20": 300,
    },
    max_weekly_streaks: {
        "1": 100,
        "2": 200,
        "3": 300,
        "4": 400,
    },
    max_consecutive_days: {
        "3": 50,
        "7": 150,
        "14": 300,
        "21": 500,
    },
};

const getNextLevelXP = (level) => {
    return levels[level + 1] || levels[10];
};

const getSections = async () => {
    try {
        const response = await axios.get('https://willm.corinth.informatik.rwth-aachen.de/score/sections');
        if (response.data.length === 0) {
            message.info("Please ensure you have scores older than 5 days for a section.", 5);
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
            const response = await axios.get(`https://willm.corinth.informatik.rwth-aachen.de/score/comparison/${selectedSection.value}`, { withCredentials: true });
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
        const response = await axios.get('https://willm.corinth.informatik.rwth-aachen.de/user/gamification', { withCredentials: true });
        gamificationData.value = response.data;
    } catch (error) {
        console.error("Error fetching gamification: ", error)
    }
};

const getAchievementProgress = (key, achievements) => {
    const stages = achievementsConfig[key];
    const achievedStages = Object.keys(stages).filter(stage => achievements[key] >= Number(stage));
    const nextStage = Object.keys(stages).find(stage => achievements[key] < Number(stage));
    const currentStep = achievedStages.length;
    const totalStep = Object.keys(stages).length;
    const rewardXP = nextStage ? stages[nextStage] : stages[Object.keys(stages).pop()];
    const targetCount = nextStage ? Number(nextStage) : Number(Object.keys(stages).pop());

    let nextText;
    if (key === 'quizzes_completed') {
        nextText = `Complete ${targetCount} quizzes`;
    } else if (key === 'correct_answers') {
        nextText = `Give ${targetCount} correct answers`;
    } else if (key === 'max_weekly_streaks') {
        nextText = `Reach ${targetCount} weekly streak${targetCount > 1 ? 's' : ''}`;
    } else if (key === 'max_consecutive_days') {
        nextText = `Maintain a ${targetCount}-day streak`;
    }

    return {
        currentStep,
        totalStep,
        next: nextText,
        rewardXP,
        progress: achievements[key],
        targetCount
    };
};

const renderStars = (currentStep, totalStep) => {
    const stars = [];
    for (let i = 0; i < currentStep; i++) {
        stars.push('<span style="color: #eabc7c;">&#9733;</span>'); // filled star
    }
    for (let i = currentStep; i < totalStep; i++) {
        stars.push('<span style="color: grey;">&#9733;</span>'); // grey star
    }
    return stars.join('');
};

const formatKey = (key) => {
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

const initPopover = () => {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach((popoverTriggerEl) => {
        const popover = new bootstrap.Popover(popoverTriggerEl, {
            trigger: 'hover',
            html: true,
            template: '<div class="popover wide-popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        });

        popoverTriggerEl.addEventListener('inserted.bs.popover', () => {
            const popoverElement = document.querySelector('.popover.wide-popover');
            if (popoverElement) {
                popoverElement.style.maxWidth = '600px';
                popoverElement.style.fontSize = '16px';
            }
        });
    });
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
                                data-bs-placement="bottom" data-bs-content='
                                <h5>Calculation of the Scores:</h5>
                                <p>
                                    The median of all older scores for the selected section is calculated and compared to your
                                    latest score.
                                    The progress bar represents the comparison:
                                </p>
                                <ul>
                                    <li><strong class=" median">Median Color:</strong> The median score of all
                                    previous
                                    scores.
                                    </li>
                                    <li><strong class="green">Green:</strong> Improvement above the median score.</li>
                                    <li><strong class="red">Red:</strong> Decline below the median score.</li>
                                    </ul>
                                    <p>
                                        If your latest score is higher than the median, the bar from the median to the latest
                                        score
                                        is
                                        green.
                                        If your latest score is lower than the median, the bar up to the latest score is the
                                        median
                                        color, and the rest is red.
                                    </p>
                                ' />
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
                                <h5>{{ formatKey(key) }}:</h5>
                                <ScoreProgressBar :latestScore="comparisonData.latestScore[key]"
                                    :medianScore="comparisonData.medianOlderScore[key]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="container border mt-5 rounded p-3">
                    <div>
                        <h3 class="text-center">
                            Progress
                            <img class="info-icon me-2" src="/icons/icon-info-01.svg" data-bs-toggle="popover"
                                data-bs-placement="bottom" data-bs-content='
                                <h5>XP and Levels:</h5>
                                <ul>
                                    <li>You earn XP for various actions such as logging in daily, completing quizzes, and giving correct answers. XP is used to level up.</li>
                                </ul>
                                
                                <h5>Daily and Weekly Streaks:</h5>
                                <ul>
                                    <li><strong>Daily Streak:</strong> Each consecutive day you log in, your daily streak increases. Missing a day resets the streak.</li>
                                    <li><strong>Weekly Streak:</strong> Every week you log in at least once, your weekly streak increases. Missing a week resets the streak.</li>
                                </ul>

                                <h5>Badges:</h5>
                                <ul>
                                    <li><strong>Rookie:</strong> Awarded for completing 2 quizzes.</li>
                                    <li><strong>Pro:</strong>
                                        <ul>
                                            <li>Complete 3 quizzes</li>
                                            <li>Maintain a 5-day streak</li>
                                            <li>Give 20 correct answers</li>
                                        </ul>
                                    </li>
                                    <li><strong>Leader:</strong>
                                        <ul>
                                            <li>Complete 4 quizzes</li>
                                            <li>Give 25 correct answers</li>
                                            <li>Reach 1 weekly streak</li>
                                        </ul>
                                    </li>
                                    <li><strong>Guru:</strong>
                                        <ul>
                                            <li>Complete 5 quizzes</li>
                                            <li>Give 30 correct answers</li>
                                        </ul>
                                    </li>
                                </ul>
                            ' />
                        </h3>
                        <div v-if="gamificationData">
                            <h5>Your Badges: {{ gamificationData.badges.length ?
                                gamificationData.badges[gamificationData.badges.length - 1].name.charAt(0).toUpperCase()
                                + gamificationData.badges[gamificationData.badges.length - 1].name.slice(1) : 'None yet'
                                }}
                            </h5>
                            <LevelProgressBar :currentLevel="gamificationData.level" :currentXP="gamificationData.xp"
                                :maxXP="getNextLevelXP(gamificationData.level)"
                                :nextLevel="gamificationData.level + 1" />
                            <div class="d-flex justify-content-between">
                                <h5>Daily Streak: {{ gamificationData.daily_streak }}</h5>
                                <h5>Weekly Streak: {{ gamificationData.weekly_streak }}</h5>
                            </div>
                        </div>
                        <div v-else>
                            <p>Loading...</p>
                        </div>
                    </div>
                    <div>
                        <h5 class="text-center">Achievements</h5>
                        <ul class="list-group">
                            <li v-for="(value, key) in gamificationData?.achievements" :key="key"
                                class="list-group-item achievement-item p-2 border rounded d-flex align-items-center justify-content-between">
                                <div class="me-3">{{ getAchievementProgress(key, gamificationData.achievements).next }}
                                </div>
                                <div class="me-3"><strong>Reward:</strong> {{ getAchievementProgress(key,
                                gamificationData.achievements).rewardXP }} XP</div>
                                <AchievementProgressBar :currentCount="gamificationData.achievements[key]"
                                    :targetCount="getAchievementProgress(key, gamificationData.achievements).targetCount" />
                                <div
                                    v-html="renderStars(getAchievementProgress(key, gamificationData.achievements).currentStep, getAchievementProgress(key, gamificationData.achievements).totalStep)">
                                </div>
                            </li>
                        </ul>
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

.achievement-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    flex-wrap: nowrap;
}

.list-group-item {
    flex: 1;
}
</style>
