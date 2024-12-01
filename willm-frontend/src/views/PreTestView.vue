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
            if (q.exerciseType === "adjectiveOrAdverb") {
                answers.value[q.questionId] = ["", ""]; // Initialize as empty array for multiple blanks
            } else if (q.exerciseType === "prepositions") {
                answers.value[q.questionId] = new Array(q.options.length).fill(""); // Initialize for each blank
            } else if (q.exerciseType === "replacement") {
                answers.value[q.questionId] = []; // Multiple choice, initialized empty
            } else if (q.exerciseType === "reorganizing") {
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
                        <h4 class="mb-3">
                            {{ currentElement.charAt(0).toUpperCase() + currentElement.slice(1) }} Questions
                        </h4>

                        <!-- Task Description -->
                        <div class="mb-3">
                            <h5>
                                <!-- Grammar Tasks -->
                                <span v-if="currentElement === 'grammar'">
                                    <span v-if="currentQuestions[0]?.exerciseType === 'adjectiveOrAdverb'">Task: Choose
                                        the correct item.</span>
                                    <span v-else-if="currentQuestions[0]?.exerciseType === 'prepositions'">
                                        Task: Complete the following sentences with the correct preposition:
                                        <strong>to, toward, on, onto, in,</strong> or <strong>into</strong>. Remember
                                        that a few verbs of motion take only "on" rather than "onto.”
                                    </span>
                                    <span v-else-if="currentQuestions[0]?.exerciseType === 'tenseConsistency'">
                                        Task: Check the following sentences for confusing shifts in tense. Write the
                                        answer in the corresponding field. If there is no mistake, simply leave the
                                        field empty. Reading the sentences aloud will help you recognize differences in
                                        time.
                                    </span>
                                </span>

                                <!-- Vocabulary Tasks -->
                                <span v-else-if="currentElement === 'vocabulary'">
                                    <span v-if="currentQuestions[0]?.exerciseType === 'replacement'">
                                        Task: Select all the words that best replace the bolded word in
                                        the sentence to make it more formal and academic. There may be more than one
                                        correct answer.
                                    </span>
                                </span>

                                <!-- Organization Tasks -->
                                <span v-else-if="currentElement === 'organization'">
                                    <span v-if="currentQuestions[0]?.exerciseType === 'reorganizing'">
                                        Task: Reorganize the sentences in the paragraph to ensure proper structure.
                                    </span>
                                </span>

                                <!-- Coherence Tasks -->
                                <span v-else-if="currentElement === 'coherence'">
                                    <span v-if="currentQuestions[0]?.exerciseType === 'insertion'">
                                        Task: Identify the best sentence to insert into the paragraph to improve
                                        coherence.
                                    </span>
                                    <span v-else-if="currentQuestions[0]?.exerciseType === 'transition'">
                                        Task: Add appropriate transitions to improve the coherence of the paragraph.
                                    </span>
                                </span>

                                <!-- Writing Style Tasks -->
                                <span v-else-if="currentElement === 'writingStyle'">
                                    <span v-if="currentQuestions[0]?.exerciseType === 'paraphrasing'">
                                        Task: Revise these sentences to state their meaning in fewer words. Avoid
                                        passive voice, needless repetition, and wordy phrases and clauses.
                                    </span>
                                </span>
                            </h5>
                        </div>

                        <!-- Questions -->
                        <div v-for="(question, index) in currentQuestions" :key="index" class="mb-3">
                            <!-- Render questionText directly if it contains embedded HTML (e.g., for prepositions, adjectives, etc.) -->
                            <div
                                v-if="['adjectiveOrAdverb', 'prepositions', 'transition'].includes(question.exerciseType)">
                                <p v-html="question.questionText"></p>
                            </div>

                            <!-- Handle Coherence: Insertion -->
                            <div v-else-if="question.exerciseType === 'insertion'">
                                <p>{{ question.questionText }}</p>
                                <div class="form-check" v-for="(option, idx) in question.options"
                                    :key="'insertion-' + idx">
                                    <input type="radio" :id="'insertion-' + question.questionId + '-' + idx"
                                        :value="option" v-model="answers[question.questionId]" />
                                    <label :for="'insertion-' + question.questionId + '-' + idx">
                                        {{ option }}
                                    </label>
                                </div>
                            </div>

                            <!-- Handle Vocabulary: Multiple Choice -->
                            <div v-else-if="question.exerciseType === 'replacement'">
                                <p v-html="question.questionText"></p>
                                <div class="form-check" v-for="(option, idx) in question.options" :key="'multi-' + idx">
                                    <input type="checkbox" :id="'multi-' + question.questionId + '-' + idx"
                                        :value="option" v-model="answers[question.questionId]" />
                                    <label :for="'multi-' + question.questionId + '-' + idx">
                                        {{ option }}
                                    </label>
                                </div>
                            </div>

                            <!-- Handle Organization: Reordering Sentences -->
                            <div v-else-if="question.exerciseType === 'reorganizing'">
                                <p>{{ question.questionText }}</p>
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

                            <!-- Default: Textarea Input -->
                            <div v-else-if="['tenseConsistency', 'paraphrasing'].includes(question.exerciseType)">
                                <p>{{ question.questionText }}</p>
                                <textarea class="form-control" :placeholder="'Write your answer here...'"
                                    v-model="answers[question.questionId]"></textarea>
                            </div>

                            <!-- Fallback for unsupported types -->
                            <div v-else>
                                <p>{{ question.questionText }}</p>
                                <p>Unsupported question type.</p>
                            </div>
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
