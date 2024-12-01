<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";

const test = ref(null);
const answers = ref({});
const currentIndex = ref(0);
let loadingMessage = null;

// Track already displayed exercise types
const displayedTypes = ref(new Set());

const currentElement = computed(() => {
    return test.value?.randomizedWritingElements[currentIndex.value];
});

const currentQuestions = computed(() => {
    return test.value?.results.filter(
        (q) => q.writingElement === currentElement.value
    );
});

const isLastElement = computed(() => {
    return currentIndex.value === test.value?.randomizedWritingElements.length - 1;
});

function formatAdjectiveOrAdverb(text, options, questionId) {
    const regex = /\(([^)]+)\)/g;
    let index = 0;
    return text.replace(regex, (match) => {
        const optionsArray = match.slice(1, -1).split(',').map((o) => o.trim());
        return `
            <select v-model="answers['${questionId}'][${index++}]" class="form-select-inline">
                <option value="" disabled>Select</option> <!-- Default unselected option -->
                ${optionsArray.map((option) => `<option value="${option}">${option}</option>`).join("")}
            </select>
        `;
    });
}

function formatPrepositions(text, options, questionId) {
    const regex = /______/g;
    let index = 0;
    return text.replace(regex, () => {
        return `
            <select v-model="answers['${questionId}'][${index++}]" class="form-select-inline">
                <option value="" disabled>Select</option> <!-- Default unselected option -->
                ${options.map((option) => `<option value="${option}">${option}</option>`).join("")}
            </select>
        `;
    });
}

function formatTransition(text, options, questionId) {
    const regex = /___/g;
    let index = 0;
    return text.replace(regex, () => {
        return `
            <select v-model="answers['${questionId}'][${index++}]" class="form-select-inline">
                <option value="" disabled>Select</option>
                ${options.map((option) => `<option value="${option}">${option}</option>`).join("")}
            </select>
        `;
    });
}

const loadTest = async () => {
    try {
        console.log("Loading Pre-Test...");
        loadingMessage = message.info("Loading Pre-Test...", 0);
        const response = await axios.get(
            "http://willm.corinth.informatik.rwth-aachen.de/test/pre-test"
        );
        console.log("Pre-Test loaded:", response.data);
        test.value = response.data;

        // Initialize answers object
        test.value.results.forEach((q) => {
            if (q.exerciseType === 'adjectiveOrAdverb') {
                answers.value[q.questionId] = ["", ""]; // Initialize as empty array for multiple blanks
            } else if (q.exerciseType === 'prepositions') {
                answers.value[q.questionId] = new Array(q.options.length).fill(""); // Initialize for each blank
            } else if (q.exerciseType === 'replacement') {
                answers.value[q.questionId] = []; // Multiple choice, initialized empty
            } else if (q.exerciseType === 'reorganizing') {
                answers.value[q.questionId] = new Array(q.options.length).fill(""); // Initialize for reordering
            } else {
                answers.value[q.questionId] = ""; // Single-answer exercises
            }
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
        displayedTypes.value.clear();
        currentIndex.value++;
    }
};

const prevElement = () => {
    if (currentIndex.value > 0) {
        displayedTypes.value.clear();
        currentIndex.value--;
    }
};

const submitTest = async () => {
    try {
        loadingMessage = message.info("Submitting Pre-Test...", 0);
        await axios.post(
            `http://willm.corinth.informatik.rwth-aachen.de/test/${test.value._id}/pre-test/complete`,
            answers.value
        );
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
                    <p>Loading...</p>
                </div>
                <div v-else>
                    <!-- Dynamic content for each writing element -->
                    <div id="test-content" class="mb-4">
                        <h5 class="mb-3">
                            {{ currentElement.charAt(0).toUpperCase() + currentElement.slice(1) }} Questions
                        </h5>
                        <!-- Track already displayed exercise types -->
                        <div v-for="(question, index) in currentQuestions" :key="index" class="mb-3">
                            <!-- Question text -->
                            <p>
                                <span v-html="question.exerciseType === 'adjectiveOrAdverb'
                                    ? formatAdjectiveOrAdverb(question.questionText, question.options, question.questionId)
                                    : question.exerciseType === 'prepositions'
                                        ? formatPrepositions(question.questionText, question.options, question.questionId)
                                        : question.exerciseType === 'transition'
                                            ? formatTransition(question.questionText, question.options, question.questionId)
                                            : question.questionText
                                    ">
                                </span>
                            </p>

                            <!-- Coherence: Insertion -->
                            <div v-if="question.exerciseType === 'insertion'">
                                <div class="form-check" v-for="(option, idx) in question.options"
                                    :key="'insertion-' + idx">
                                    <input type="radio" :id="'insertion-' + question.questionId + '-' + idx"
                                        :value="option" v-model="answers[question.questionId]" />
                                    <label :for="'insertion-' + question.questionId + '-' + idx">
                                        {{ option }}
                                    </label>
                                </div>
                            </div>

                            <!-- Vocabulary: Multiple Choice -->
                            <div v-else-if="question.exerciseType === 'replacement'">
                                <div class="form-check" v-for="(option, idx) in question.options" :key="'multi-' + idx">
                                    <input type="checkbox" :id="'multi-' + question.questionId + '-' + idx"
                                        :value="option" v-model="answers[question.questionId]" />
                                    <label :for="'multi-' + question.questionId + '-' + idx">
                                        {{ option }}
                                    </label>
                                </div>
                            </div>

                            <!-- Organization: Reordering Sentences -->
                            <div v-else-if="question.exerciseType === 'reorganizing'">
                                <div v-for="(sentence, idx) in question.options" :key="idx"
                                    class="d-flex mb-2 align-items-center">
                                    <select class="form-select form-select-sm me-2 w-auto"
                                        v-model="answers[question.questionId][idx]">
                                        <option disabled value="">Select</option>
                                        <option v-for="n in question.options.length" :key="n" :value="n">
                                            {{ n }}
                                        </option>
                                    </select>
                                    <span>{{ sentence }}</span>
                                </div>
                            </div>

                            <!-- Grammar: Adjective or Adverb -->
                            <div v-else-if="question.exerciseType === 'adjectiveOrAdverb'">
                                <p>
                                    <span
                                        v-html="formatAdjectiveOrAdverb(question.questionText, question.options, question.questionId)"></span>
                                </p>
                            </div>

                            <!-- Grammar: Prepositions -->
                            <div v-else-if="question.exerciseType === 'prepositions'">
                                <p>
                                    <span
                                        v-html="formatPrepositions(question.questionText, question.options, question.questionId)"></span>
                                </p>
                            </div>

                            <!-- Default: Textarea Input -->
                            <textarea v-else-if="['tenseConsistency', 'paraphrasing'].includes(question.exerciseType)"
                                class="form-control" :placeholder="'Write your answer here...'"
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
