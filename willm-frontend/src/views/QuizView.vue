<script setup>
import { ref, onMounted, computed, watch } from 'vue';
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
        console.log(quiz.value)
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
    try {
        let answer;
        if (option === true) {
            answer = selectedAnswer;
        } else {
            answer = userAnswer.value;
        }
        console.log('Answer:', answer);
        const response = await axios.post('http://localhost:3000/quiz/submit-answer', {
            quizId: quiz.value.quiz_id,
            questionId: currentQuestion.value.question_id,
            userAnswer: answer,
        });
        answerResult.value = response.data;
        currentQuestion.value.answered = true;
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

watch(currentQuestion, (newQuestion) => {
    console.log('Current Question:', newQuestion);
});
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
            <div v-if="currentQuestion.sentence">
                <h5>Sentence:</h5>
                <p>{{ currentQuestion.sentence }}</p>
            </div>
            <div v-if="currentQuestion.excerpts && currentQuestion.excerpts.length">
                <h5>Excerpts:</h5>
                <ul>
                    <li v-for="(excerpt, index) in currentQuestion.excerpts" :key="index">{{ excerpt }}</li>
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
                <h5 v-if="answerResult.isCorrect" class="correct mt-2">Well done, your answer is correct!</h5>
                <h5 v-else class="incorrect mt-2">Incorrect. <button class="btn" @click="requestExplanation">Get
                        Explanation</button></h5>
                <p v-if="explanation">Explanation: {{ explanation }}</p>
                <button v-if="currentQuestionIndex < quiz.questions.length - 1" class="btn" @click="nextQuestion">Next
                    Question</button>
                <button v-else @click="completeQuiz">Complete Quiz</button>
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
