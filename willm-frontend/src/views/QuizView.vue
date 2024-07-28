<template>
    <div>
        <h1>Quiz</h1>
        <div v-if="currentQuestion">
            <p>{{ currentQuestion.question_text }}</p>
            <input v-model="userAnswer" placeholder="Your answer" />
            <button @click="submitAnswer">Submit Answer</button>
            <div v-if="answerResult">
                <p v-if="answerResult.isCorrect">Correct!</p>
                <p v-else>Incorrect. <button @click="requestExplanation">Get Explanation</button></p>
                <p v-if="explanation">Explanation: {{ explanation }}</p>
                <button v-if="currentQuestionIndex < quiz.questions.length - 1" @click="nextQuestion">Next
                    Question</button>
                <button v-else @click="completeQuiz">Complete Quiz</button>
            </div>
        </div>
        <div v-else>
            <p>No quiz available.</p>
        </div>
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
                        <p>Score: {{ quizScore }}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

const quiz = ref(null);
const currentQuestionIndex = ref(0);
const userAnswer = ref('');
const answerResult = ref(null);
const explanation = ref('');
const quizScore = ref(null);

const router = useRouter();

const fetchQuiz = async () => {
    try {
        const response = await axios.get('http://localhost:3000/quiz/get-todays-quiz');
        quiz.value = response.data.quiz;
        if (!quiz.value) {
            message.info(response.data.message);
            router.push('/');
        }
    } catch (error) {
        console.error('Error fetching quiz:', error);
        message.error('Error fetching quiz.');
    }
};

const submitAnswer = async () => {
    try {
        const response = await axios.post('http://localhost:3000/quiz/submit-answer', {
            quizId: quiz.value.quiz_id,
            questionId: currentQuestion.value.question_id,
            userAnswer: userAnswer.value,
        });
        answerResult.value = response.data;
    } catch (error) {
        console.error('Error submitting answer:', error);
        message.error('Error submitting answer.');
    }
};

const requestExplanation = async () => {
    try {
        const response = await axios.post('http://localhost:3000/question/explain-answer', {
            question: currentQuestion.value.question_text,
            correct_answer: currentQuestion.value.correct_answer,
            user_answer: userAnswer.value,
            options: currentQuestion.value.options,
            excerpts: currentQuestion.value.excerpts,
            text: currentQuestion.value.text,
            word: currentQuestion.value.word,
            sentence: currentQuestion.value.sentence,
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
        const response = await axios.post('http://localhost:3000/quiz/complete', {
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

onMounted(fetchQuiz);

const currentQuestion = computed(() => quiz.value?.questions[currentQuestionIndex.value] || null);
</script>

<style scoped>
/* Add your styles here */
</style>
