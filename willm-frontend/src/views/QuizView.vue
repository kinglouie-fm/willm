<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

const quiz = ref(null);
const answers = ref({});
const route = useRoute();
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

const submitQuiz = async () => {
    try {
        const response = await axios.post('http://localhost:3000/quiz/submit-answer', {
            quizId: quiz.value.quiz_id,
            answers: answers.value,
        });
        message.success('Quiz submitted successfully.');
        router.push('/');
    } catch (error) {
        console.error('Error submitting quiz:', error);
        message.error('Error submitting quiz.');
    }
};

onMounted(fetchQuiz);
</script>

<template>
    <div>
        <h1>Quiz</h1>
        <div v-if="quiz">
            <div v-for="question in quiz.questions" :key="question.question_id">
                <p>{{ question.question_text }}</p>
                <input v-model="answers[question.question_id]" placeholder="Your answer" />
            </div>
            <button @click="submitQuiz">Submit Quiz</button>
        </div>
        <div v-else>
            <p>No quiz available.</p>
        </div>
    </div>
</template>

<style scoped>
/* Add your styles here */
</style>
