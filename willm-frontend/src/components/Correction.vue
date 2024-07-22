<script setup>
import { ref } from 'vue';
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

const handleSelectFeedback = (event) => {
    selectedFeedback.value = event.target.value;
};
</script>

<template>
    <div>
        <div class="d-flex justify-content-start mb-3">
            <div class="custom-select-wrapper">
                <select class="custom-select" @change="handleSelectFeedback">
                    <option value="organization" selected>Organization</option>
                    <option value="coherence">Coherence</option>
                    <option value="writingStyle">Writing Style</option>
                </select>
            </div>
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
.custom-select-wrapper {
    display: inline-block;
}

.custom-select {
    border: 1px solid #c5c5c5;
    color: #838383;
    padding: 0.375rem 1.75rem 0.375rem 0.75rem;
    appearance: none;
    background: url('data:image/svg+xml;utf8,<svg fill="%23838383" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat right 0.75rem center/16px 16px;
    background-color: #fff;
    border-radius: 0.25rem;
    cursor: pointer;
}

.custom-select:focus {
    border-color: #eabc7c;
    box-shadow: none;
    outline: 0;
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
