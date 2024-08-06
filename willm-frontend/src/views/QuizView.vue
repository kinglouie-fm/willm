<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import * as bootstrap from 'bootstrap';

const quiz = ref(null);
const currentQuestionIndex = ref(0);
const userAnswer = ref('');
const answerResult = ref(null);
const explanation = ref('');
const quizScore = ref(null);

const router = useRouter();

const fetchQuiz = async () => {
    try {
        const response = await axios.get('http://localhost:3101/quiz/get-todays-quiz');
        quiz.value = response.data.quiz;
        if (!quiz.value) {
            message.info(response.data.message);
            router.push('/');
        } else {
            // Find the first unanswered question
            const firstUnansweredIndex = quiz.value.questions.findIndex(q => !q.answered);
            currentQuestionIndex.value = firstUnansweredIndex !== -1 ? firstUnansweredIndex : 0;
        }
    } catch (error) {
        console.error('Error fetching quiz:', error);
        message.error('Error fetching quiz.');
    }
};

const submitAnswer = async (selectedAnswer = null, option) => {
    const hideLoading = message.loading('Submitting answer...', 0);
    try {
        let answer;
        if (option === true) {
            answer = selectedAnswer;
        } else {
            answer = userAnswer.value;
        }
        const response = await axios.post('http://localhost:3101/quiz/submit-answer', {
            quizId: quiz.value.quiz_id,
            questionId: currentQuestion.value.question_id,
            userAnswer: answer,
        });
        answerResult.value = response.data;
        if (answerResult.value.message === 'Question already answered') {
            message.info('Question already answered. Please proceed.', 2);
        } else if (answerResult.value.isCorrect) {
            message.success('Correct answer!', 2);
        }
        else {
            message.error('Incorrect answer. The correct answer was: ' + answerResult.value.correctAnswer.charAt(0), 6);
        }
        currentQuestion.value.answered = true;
    } catch (error) {
        console.error('Error submitting answer:', error);
        message.error('Error submitting answer.');
    } finally {
        hideLoading();
    }
};

const requestExplanation = async () => {
    try {
        const response = await axios.post('http://localhost:3101/quiz/explain-answer', {
            quizId: quiz.value.quiz_id,
            questionId: currentQuestion.value.question_id,
            userAnswer: userAnswer.value,
        });
        explanation.value = response.data.explanation;
    } catch (error) {
        console.error('Error fetching explanation:', error);
        message.error('Error fetching explanation.');
    }
};

const nextQuestion = () => {
    currentQuestionIndex.value++;
    userAnswer.value = '';
    answerResult.value = null;
    explanation.value = '';
};

const completeQuiz = async () => {
    try {
        const response = await axios.post('http://localhost:3101/quiz/complete', {
            quizId: quiz.value.quiz_id,
        });
        quizScore.value = response.data.score;
        new bootstrap.Modal(document.getElementById('completionModal')).show();
        router.push('/');
    } catch (error) {
        console.error('Error completing quiz:', error);
        message.error('Error completing quiz.');
    }
};

const renderQuizScoreStars = (score) => {
    const totalStars = 3;
    const stars = [];
    for (let i = 0; i < score; i++) {
        stars.push('<span style="color: #eabc7c;">&#9733;</span>');
    }
    for (let i = score; i < totalStars; i++) {
        stars.push('<span style="color: grey;">&#9733;</span>');
    }
    return stars.join('');
};

onMounted(fetchQuiz);

const currentQuestion = computed(() => quiz.value?.questions[currentQuestionIndex.value] || null);
</script>

<template>
    <div class="container mt-3">
        <h1 class="text-center">Quiz</h1>
        <div v-if="currentQuestion">
            <h4>Question:</h4>
            <p>{{ currentQuestion.question_text }}</p>

            <!-- Display specific fields based on the question type -->
            <div v-if="currentQuestion.text">
                <h5>Text:</h5>
                <p>{{ currentQuestion.text }}</p>
            </div>
            <div v-if="currentQuestion.word">
                <h5>Word:</h5>
                <p>{{ currentQuestion.word }}</p>
            </div>
            <div v-if="currentQuestion.argument">
                <h5>Argument:</h5>
                <p>{{ currentQuestion.argument }}</p>
            </div>
            <div v-if="currentQuestion.sentence">
                <h5>Sentence:</h5>
                <p>{{ currentQuestion.sentence }}</p>
            </div>
            <div v-if="currentQuestion.scenario && currentQuestion.scenario.length">
                <h5>Scenario:</h5>
                <ul>
                    <li v-for="(excerpt, index) in currentQuestion.scenario" :key="index">{{ excerpt }}</li>
                </ul>
            </div>
            <div v-if="currentQuestion.options && currentQuestion.options.length">
                <h5>Options:</h5>
                <ul>
                    <li v-for="(option, index) in currentQuestion.options" :key="index" class="option"
                        @click="submitAnswer(option, true)">
                        {{ option }}
                    </li>
                </ul>
            </div>

            <!-- User input for the answer -->
            <textarea v-if="!currentQuestion.options || !currentQuestion.options.length" v-model="userAnswer"
                placeholder="Your answer" class="form-control textarea-large" required />
            <button v-if="(!currentQuestion.options || !currentQuestion.options.length) && !answerResult"
                class="btn mt-2" @click="submitAnswer(null, false)">Submit Answer</button>

            <!-- Display the result of the submitted answer -->
            <div v-if="answerResult">
                <h5 v-if="answerResult.isCorrect" class="correct mt-2">
                    <button v-if="currentQuestionIndex < quiz.questions.length - 1" class="btn"
                        @click="nextQuestion">Next Question
                    </button>
                    <button v-else class="btn" @click="completeQuiz">Complete Quiz</button>
                </h5>
                <h5 v-if="!answerResult.isCorrect" class="incorrect mt-2">
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <button class="btn" @click="requestExplanation">Get Explanation</button>
                        <button v-if="currentQuestionIndex < quiz.questions.length - 1" class="btn"
                            @click="nextQuestion">Next
                            Question</button>
                        <button v-else class="btn" @click="completeQuiz">Complete Quiz</button>
                    </div>
                </h5>
                <div v-if="explanation" class="container p-3">
                    <h5>Explanation:</h5>
                    <p>{{ explanation }}</p>
                </div>
            </div>
        </div>
        <div v-else>
            <p>No quiz available.</p>
        </div>

        <!-- Modal for quiz completion -->
        <div class="modal fade" id="completionModal" tabindex="-1" aria-labelledby="completionModalLabel"
            aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="completionModalLabel">Quiz Completed</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Quiz completed successfully!</p>
                        <p>Score: {{ quizScore }} / 3</p>
                        <div v-html="renderQuizScoreStars(quizScore)"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.btn {
    border: 1px solid #c5c5c5;
    color: #838383;
}

.btn:hover {
    background-color: #eabc7c;
    color: white;
}

.textarea-large {
    height: 200px;
}

.option {
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.option:hover {
    background-color: #eabc7c;
}

.correct {
    color: green;
}

.incorrect {
    color: red;
}
</style>
