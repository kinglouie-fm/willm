<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";

const test = ref(null);
const answers = ref({});
const currentIndex = ref(0);
const showModal = ref(false);
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

const groupedQuestions = computed(() => {
    const groups = {};
    currentQuestions.value.forEach((question) => {
        if (!groups[question.exerciseType]) {
            groups[question.exerciseType] = [];
        }
        groups[question.exerciseType].push(question);
    });
    return groups;
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

const openSubmitModal = () => {
    showModal.value = true;
};

const closeSubmitModal = () => {
    showModal.value = false;
};

const submitTest = async () => {
    try {
        console.log("Submitting Pre-Test...", answers.value);
        closeSubmitModal();
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
                <div v-else class="m-4">
                    <!-- Dynamic content for each writing element -->
                    <div id="test-content" class="mb-4">
                        <h4 class="mb-3">
                            {{ currentElement.charAt(0).toUpperCase() + currentElement.slice(1) }} Questions
                        </h4>

                        <!-- Group Questions by Exercise Type -->
                        <div v-for="(questions, exerciseType) in groupedQuestions" :key="exerciseType" class="mb-4">
                            <!-- Task Description -->
                            <div class="mt-4 mb-2">
                                <h6>
                                    <span v-if="exerciseType === 'adjectiveOrAdverb'">Task: Choose the correct
                                        item.</span>
                                    <span v-else-if="exerciseType === 'prepositions'">
                                        Task: Complete the following sentences with the correct preposition:
                                        <strong>to, toward, on, onto, in,</strong> or <strong>into</strong>. Remember
                                        that a few verbs of motion take only "on" rather than "onto.”
                                    </span>
                                    <span v-else-if="exerciseType === 'tenseConsistency'">
                                        Task: Check the following sentences for confusing shifts in tense. Write the
                                        answer in the corresponding field. If there is no mistake, simply leave the
                                        field empty. Reading the sentences aloud will help you recognize differences in
                                        time.
                                    </span>
                                    <span v-else-if="exerciseType === 'replacement'">
                                        Task: Select all the words that best replace the bolded word in
                                        the sentence to make it more formal and academic. There may be more than one
                                        correct answer.
                                    </span>
                                    <span v-else-if="exerciseType === 'reorganizing'">
                                        Task: Reorganize the sentences in the paragraph to ensure proper structure.
                                    </span>
                                    <span v-else-if="exerciseType === 'insertion'">
                                        Task: Identify the best sentence to insert into the paragraph to improve
                                        coherence.
                                    </span>
                                    <span v-else-if="exerciseType === 'transition'">
                                        Task: Add appropriate transitions to improve the coherence of the paragraph.
                                    </span>
                                    <span v-else-if="exerciseType === 'paraphrasing'">
                                        Task: Revise these sentences to state their meaning in fewer words. Avoid
                                        passive voice, needless repetition, and wordy phrases and clauses.
                                    </span>
                                </h6>
                            </div>

                            <!-- Questions for the Current Exercise Type -->
                            <div v-for="(question, index) in questions" :key="question.questionId" class="mb-3">
                                <div v-if="['adjectiveOrAdverb', 'prepositions', 'transition'].includes(exerciseType)">
                                    <p v-html="question.questionText"></p>
                                </div>
                                <div v-else-if="exerciseType === 'insertion'">
                                    <p>{{ question.questionText }}</p>
                                    <div class="form-check" v-for="(option, idx) in question.options" :key="idx">
                                        <input type="radio" :id="'insertion-' + question.questionId + '-' + idx"
                                            :value="option" v-model="answers[question.questionId]" />
                                        <label :for="'insertion-' + question.questionId + '-' + idx">{{ option
                                            }}</label>
                                    </div>
                                </div>
                                <div v-else-if="exerciseType === 'replacement'">
                                    <p v-html="question.questionText"></p>
                                    <div class="form-check" v-for="(option, idx) in question.options" :key="idx">
                                        <input type="checkbox" :id="'replacement-' + question.questionId + '-' + idx"
                                            :value="option" v-model="answers[question.questionId]" />
                                        <label :for="'replacement-' + question.questionId + '-' + idx">{{ option
                                            }}</label>
                                    </div>
                                </div>
                                <div v-else-if="exerciseType === 'reorganizing'">
                                    <p>{{ question.questionText }}</p>
                                    <div v-for="(sentence, idx) in question.options" :key="idx"
                                        class="d-flex align-items-center">
                                        <select class="form-select form-select-sm me-2 w-auto"
                                            v-model="answers[question.questionId][idx]">
                                            <option disabled value="">Select</option>
                                            <option v-for="n in question.options.length" :key="n" :value="n">{{ n }}
                                            </option>
                                        </select>
                                        <span>{{ sentence }}</span>
                                    </div>
                                </div>
                                <div v-else-if="exerciseType === 'tenseConsistency'">
                                    <p>{{ question.questionText }}</p>
                                    <textarea class="form-control" :placeholder="'Write your answer here...'"
                                        v-model="answers[question.questionId]"></textarea>
                                </div>
                                <div v-else-if="exerciseType === 'paraphrasing'">
                                    <p>{{ question.questionText }}</p>
                                    <textarea class="form-control" :placeholder="'Write your answer here...'"
                                        v-model="answers[question.questionId]"></textarea>
                                </div>
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
                        <button v-else class="btn btn-success" @click="openSubmitModal">
                            Submit Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade show" tabindex="-1" role="dialog" aria-labelledby="submitModalLabel" aria-hidden="true"
        v-if="showModal" style="display: block; background-color: rgba(0,0,0,0.5);">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="submitModalLabel">Confirm Submission</h5>
                    <button type="button" class="btn-close" @click="closeSubmitModal"></button>
                </div>
                <div class="modal-body">
                    Are you sure you want to submit the test? Once submitted, you won't be able to change your
                    answers.
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" @click="closeSubmitModal">Cancel</button>
                    <button type="button" class="btn btn-success" @click="submitTest">Submit</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.btn-primary {
    background-color: #eabc7c;
    border-color: #eabc7c;
}

.btn-primary:hover {
    background-color: #e6b065;
    border-color: #e6b065;
}

.btn-success {
    background-color: #eabc7c;
    border-color: #eabc7c;
}

.btn-success:hover {
    background-color: #e6b065;
    border-color: #e6b065;
}
</style>
