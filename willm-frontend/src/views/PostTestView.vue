<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const test = ref(null);
const answers = ref({});
const currentIndex = ref(0);
const showModal = ref(false);
const showInitialModal = ref(true);
let loadingMessage = null;

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

const splitQuestionText = (text, options, questionId) => {
    const regex = /___/g;
    const segments = [];
    let lastIndex = 0;
    let index = 0;

    text.replace(regex, (match, offset) => {
        // Push preceding text
        if (offset > lastIndex) {
            segments.push({
                type: "text",
                content: text.slice(lastIndex, offset),
            });
        }

        // Push placeholder for select
        segments.push({
            type: "select",
            index: index++, // Index for v-model binding
        });

        lastIndex = offset + match.length;
    });

    // Push remaining text after the last placeholder
    if (lastIndex < text.length) {
        segments.push({
            type: "text",
            content: text.slice(lastIndex),
        });
    }

    return segments;
};

const loadTest = async () => {
    try {
        // console.log("Loading Post-Test...");
        loadingMessage = message.info("Loading Post-Test...", 0);
        const response = await axios.get(
            "http://willm.corinth.informatik.rwth-aachen.de/test/post-test"
        );
        // console.log("Post-Test loaded:", response.data);
        test.value = response.data;

        // Initialize answers object
        test.value.results.forEach((q) => {
            if (["adjectiveOrAdverb", "prepositions", "transition"].includes(q.exerciseType)) {
                answers.value[q.questionId] = new Array((q.questionText.match(/___/g) || []).length).fill(""); // Multi-blank questions
            } else if (q.exerciseType === "replacement") {
                answers.value[q.questionId] = []; // Multiple choice
            } else if (q.exerciseType === "reorganizing") {
                answers.value[q.questionId] = new Array(q.options.length).fill(""); // Reordering
            } else {
                answers.value[q.questionId] = ""; // Single-answer exercises
            }
        });

        if (loadingMessage) loadingMessage(); // Dismiss loading message
    } catch (error) {
        console.error("Error loading Post-Test:", error);
        if (loadingMessage) loadingMessage(); // Dismiss loading message
        message.error("Failed to load Post-Test. Please try again.");
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

const openSubmitModal = () => {
    showModal.value = true;
};

const closeSubmitModal = () => {
    showModal.value = false;
};

const submitTest = async () => {
    try {
        // console.log(answers.value)
        closeSubmitModal();
        loadingMessage = message.info("Submitting Post-Test...", 0);
        await axios.post(
            `http://willm.corinth.informatik.rwth-aachen.de/test/${test.value._id}/post-test/complete`,
            answers.value
        );
        if (loadingMessage) loadingMessage();
        message.success("Post-Test submitted successfully!");
        await authStore.logout();

    } catch (error) {
        if (error.response && error.response.data.message === 'Test has already been completed.') {
            message.error("You have already submitted this test. Progress cannot be saved again.");
        } else {
            console.error("Error submitting Post-Test:", error);
            message.error("Failed to submit Post-Test. Please try again.");
        }
        if (loadingMessage) loadingMessage();
    }
};

const closeInitialModal = () => {
    showInitialModal.value = false;
};

onMounted(loadTest);
</script>

<template>
    <div class="container-fluid h-100 mt-4">
        <div class="row h-100">
            <div class="col-12">
                <h2 class="text-center mb-4">Post-Test</h2>
                <div v-if="showInitialModal" class="modal fade show" tabindex="-1" role="dialog"
                    style="display: block; background-color: rgba(0,0,0,0.5);">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Warning</h5>
                            </div>
                            <div class="modal-body">
                                <p>If you cancel the Post-Test, all progress will be lost. You will have to start
                                    over.</p>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-primary" @click="closeInitialModal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else>
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
                                            <strong>to, toward, on, onto, in,</strong> or <strong>into</strong>.
                                            Remember
                                            that a few verbs of motion take only "on" rather than "onto.”
                                        </span>
                                        <span v-else-if="exerciseType === 'tenseConsistency'">
                                            Task: Check the following sentences for confusing shifts in tense. Write the
                                            answer in the corresponding field. If there is no mistake, simply leave the
                                            field empty. Reading the sentences aloud will help you recognize differences
                                            in
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

                                <!-- Questions -->
                                <div v-for="(question, index) in questions" :key="question.questionId" class="mb-3">
                                    <div v-if="exerciseType === 'reorganizing'">
                                        <p>{{ question.questionText }}</p>
                                        <div v-for="(sentence, idx) in question.options" :key="idx"
                                            class="d-flex align-items-center">
                                            <select class="form-select form-select-sm me-2 w-auto"
                                                v-model="answers[question.questionId][idx]">
                                                <option disabled value="">Select</option>
                                                <option v-for="n in 4" :key="n" :value="n">
                                                    {{ n }}
                                                </option>
                                            </select>
                                            <span>{{ sentence }}</span>
                                        </div>
                                    </div>
                                    <div
                                        v-else-if="['adjectiveOrAdverb', 'prepositions', 'transition'].includes(exerciseType)">
                                        <p>
                                            <span
                                                v-for="(segment, idx) in splitQuestionText(question.questionText, question.options, question.questionId)"
                                                :key="idx">
                                                <template v-if="segment.type === 'text'">{{ segment.content
                                                    }}</template>
                                                <template v-else-if="segment.type === 'select'">
                                                    <select class="form-select d-inline-block w-auto"
                                                        v-model="answers[question.questionId][segment.index]">
                                                        <option value="" disabled>Select</option>
                                                        <option v-for="option in question.options" :key="option"
                                                            :value="option">{{ option }}</option>
                                                    </select>
                                                </template>
                                            </span>
                                        </p>
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
                                            <input type="checkbox"
                                                :id="'replacement-' + question.questionId + '-' + idx" :value="option"
                                                v-model="answers[question.questionId]" />
                                            <label :for="'replacement-' + question.questionId + '-' + idx">{{ option
                                                }}</label>
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

        <!-- Submit Confirmation Modal -->
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