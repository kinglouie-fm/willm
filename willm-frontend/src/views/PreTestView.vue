<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const test = ref(null);
const answers = ref({});
const currentIndex = ref(0);
let loadingMessage = null;

const currentElement = computed(() => {
    return test.value?.randomizedWritingElements[currentIndex.value];
});

const currentQuestions = computed(() => {
    return test.value?.questions.filter(
        (q) => q.writingElement === currentElement.value
    );
});

const isLastElement = computed(() => {
    return currentIndex.value === test.value?.randomizedWritingElements.length - 1;
});

const loadTest = async () => {
    try {
        console.log("Loading Pre-Test...");
        loadingMessage = message.info("Loading Pre-Test...", 0);
        const response = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/test/pre-test');
        console.log("Pre-Test loaded:", response.data);
        test.value = response.data;

        // Initialize answers object
        test.value.questions.forEach((q) => {
            answers.value[q.questionId] = q.options ? "" : [];
        });

        if (loadingMessage) loadingMessage(); // Dismiss loading message
    } catch (error) {
        console.error("Error loading Pre-Test:", error);
        if (loadingMessage) loadingMessage(); // Dismiss loading message
        message.error("Failed to load Pre-Test. Please try again.");
    }
};

const nextElement = () => {
    if (currentIndex.value < test.value.randomizedWritingElements.length - 1) {
        currentIndex.value++;
    }
};

const prevElement = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    }
};

const submitTest = async () => {
    try {
        loadingMessage = message.info("Submitting Pre-Test...", 0);
        await axios.post(`http://willm.corinth.informatik.rwth-aachen.de/test/${testId}/pre-test/complete`, answers);
        if (loadingMessage) loadingMessage(); // Dismiss loading message
        message.success("Pre-Test submitted successfully!");
    } catch (error) {
        console.error("Error submitting Pre-Test:", error);
        if (loadingMessage) loadingMessage(); // Dismiss loading message
        message.error("Failed to submit Pre-Test. Please try again.");
    }
};

onMounted(loadTest);
</script>

<template>
    <div class="container-fluid h-100 mt-4">
        <div class="row h-100">
            <div class="col-12">
                <h2 class="text-center mb-4">Pre-Test</h2>
                <div v-if="!test">
                </div>
                <div v-else>
                    <!-- Dynamic content for each writing element -->
                    <div id="test-content" class="mb-4">
                        <h5 class="mb-3">{{ currentElement }} Questions</h5>
                        <div v-for="(question, index) in currentQuestions" :key="index" class="mb-3">
                            <p>{{ question.text }}</p>
                            <div v-if="question.options">
                                <div class="form-check" v-for="(option, idx) in question.options" :key="idx">
                                    <input type="radio" class="form-check-input"
                                        :id="'option-' + question.questionId + '-' + idx" :name="question.questionId"
                                        :value="option" v-model="answers[question.questionId]" />
                                    <label class="form-check-label" :for="'option-' + question.questionId + '-' + idx">
                                        {{ option }}
                                    </label>
                                </div>
                            </div>
                            <textarea v-else class="form-control" :placeholder="'Write your answer here...'"
                                v-model="answers[question.questionId]"></textarea>
                        </div>
                    </div>

                    <!-- Navigation buttons -->
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-secondary" @click="prevElement" :disabled="currentIndex === 0">
                            Previous
                        </button>
                        <button v-if="!isLastElement" class="btn btn-primary" @click="nextElement">
                            Next
                        </button>
                        <button v-else class="btn btn-success" @click="submitTest">
                            Submit Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>