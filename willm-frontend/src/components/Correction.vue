<script setup>
import { ref, defineProps } from 'vue';
import * as bootstrap from 'bootstrap';
const props = defineProps({
    furtherCorrectionData: Object
});

const selectedFeedback = ref('organization');

const toggleCollapse = (index, category) => {
    const collapseElement = document.getElementById(`${category}-collapse-${index}`);
    const bsCollapse = new bootstrap.Collapse(collapseElement, {
        toggle: true
    });
};
</script>

<template>
    <div>
        <div class="d-flex justify-content-center mb-4">
            <button type="button" class="btn btn-md" @click="selectedFeedback = 'organization'"
                :class="{ active: selectedFeedback === 'organization' }">Organization</button>
            <button type="button" class="btn btn-md" @click="selectedFeedback = 'coherence'"
                :class="{ active: selectedFeedback === 'coherence' }">Coherence</button>
            <button type="button" class="btn btn-md" @click="selectedFeedback = 'writingStyle'"
                :class="{ active: selectedFeedback === 'writingStyle' }">Writing Style</button>
        </div>
        <div v-if="selectedFeedback === 'organization'">
            <h4>Organization Feedback</h4>
            <div v-for="(mistake, index) in props.furtherCorrectionData.organization.mistakes" :key="index">
                <a @click="toggleCollapse(index, 'organization')" href="javascript:void(0)">
                    <strong>Feedback {{ index + 1 }}</strong>
                </a>
                <ul :id="'organization-collapse-' + index" class="collapse mt-2" :class="{ show: index === 0 }">
                    <li><strong>Mistake:</strong> {{ mistake }} </li>
                    <li><strong>Correction:</strong> {{ props.furtherCorrectionData.organization.corrections[index] }}
                    </li>
                    <li><strong>Explanation:</strong> {{ props.furtherCorrectionData.organization.explanations[index] }}
                    </li>
                </ul>
            </div>
        </div>
        <div v-if="selectedFeedback === 'coherence'">
            <h4>Coherence Feedback</h4>
            <div v-for="(mistake, index) in props.furtherCorrectionData.coherence.mistakes" :key="index">
                <a @click="toggleCollapse(index, 'coherence')" href="javascript:void(0)">
                    <strong>Feedback {{ index + 1 }}</strong>
                </a>
                <ul :id="'coherence-collapse-' + index" class="collapse mt-2" :class="{ show: index === 0 }">
                    <li><strong>Mistake:</strong> {{ mistake }}</li>
                    <li><strong>Correction:</strong> {{ props.furtherCorrectionData.coherence.corrections[index] }}</li>
                    <li><strong>Explanation:</strong> {{ props.furtherCorrectionData.coherence.explanations[index] }}
                    </li>
                </ul>
            </div>
        </div>
        <div v-if="selectedFeedback === 'writingStyle'">
            <h4>Writing Style Feedback</h4>
            <div v-for="(mistake, index) in props.furtherCorrectionData.writingStyle.mistakes" :key="index">
                <a @click="toggleCollapse(index, 'writingStyle')" href="javascript:void(0)">
                    <strong>Feedback {{ index + 1 }}</strong>
                </a>
                <ul :id="'writingStyle-collapse-' + index" class="collapse mt-2" :class="{ show: index === 0 }">
                    <li><strong>Mistake:</strong> {{ mistake }}</li>
                    <li><strong>Correction:</strong> {{ props.furtherCorrectionData.writingStyle.corrections[index] }}
                    </li>
                    <li><strong>Explanation:</strong> {{ props.furtherCorrectionData.writingStyle.explanations[index] }}
                    </li>
                </ul>
            </div>
        </div>
        <div v-if="props.furtherCorrectionData === 'Not enough sessions to generate review.'">
            <p>{{ props.furtherCorrectionData }}</p>
        </div>
    </div>
</template>

<style scoped>
.btn {
    border: 1px solid #c5c5c5;
    color: #838383;
}

.btn.active {
    background-color: #eabc7c;
    color: white;
}

a {
    cursor: pointer;
    font-size: 1.2rem;
    color: #eabc7c;
}

a:hover {
    text-decoration: underline;
}
</style>
