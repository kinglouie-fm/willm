<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
    furtherCorrectionData: Object
});

const organizationOpen = ref(true);
const coherenceOpen = ref(true);
const writingStyleOpen = ref(true);
const feedbackDiv = ref(null);

const toggleSection = (section) => {
    if (section === 'organization') {
        organizationOpen.value = !organizationOpen.value;
    } else if (section === 'coherence') {
        coherenceOpen.value = !coherenceOpen.value;
    } else if (section === 'writingStyle') {
        writingStyleOpen.value = !writingStyleOpen.value;
    }
};

const isSectionOpen = (section) => {
    if (section === 'organization') {
        return organizationOpen.value;
    } else if (section === 'coherence') {
        return coherenceOpen.value;
    } else if (section === 'writingStyle') {
        return writingStyleOpen.value;
    }
    return false;
};

const sectionIcon = (section) => {
    return isSectionOpen(section) ? 'arrow-icon open' : 'arrow-icon closed';
};

const handleScroll = () => {
    const element = feedbackDiv.value;
    if (!element) return;

    const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

    if (isAtBottom) {
        element.classList.remove('has-shadow-bottom');
    } else {
        element.classList.add('has-shadow-bottom');
    }
};

const checkInitialOverflow = () => {
    const element = feedbackDiv.value;
    if (!element) return;

    if (element.scrollHeight > element.clientHeight - 1) {
        element.classList.add('has-shadow-bottom');
    } else {
        element.classList.remove('has-shadow-bottom');
    }
};

onMounted(async () => {
    const element = feedbackDiv.value;
    if (element) {
        element.addEventListener('scroll', handleScroll);
        checkInitialOverflow();
    }
});
</script>

<template>
    <div class="feedback" ref="feedbackDiv">
        <h3 class="text-center">Further Correction</h3>
        <div>
            <h5 @click="toggleSection('organization')" class="expandable-header">
                <span :class="sectionIcon('organization')"></span>
                Organization Feedback
            </h5>
            <div v-show="organizationOpen">
                <div v-if="props.furtherCorrectionData.organization.message">
                    <p>{{ props.furtherCorrectionData.organization.message }}</p>
                </div>
                <div v-else>
                    <div v-for="(mistake, index) in props.furtherCorrectionData.organization.mistakes" :key="index">
                        <h6><strong>Feedback {{ index + 1 }}</strong></h6>
                        <ul class="mt-2">
                            <li><strong>Mistake:</strong> {{ mistake }} </li>
                            <li><strong>Correction:</strong> {{
                props.furtherCorrectionData.organization.corrections[index] }}</li>
                            <li><strong>Explanation:</strong> {{
                props.furtherCorrectionData.organization.explanations[index] }}</li>
                            <li><strong>Category:</strong> {{ props.furtherCorrectionData.organization.categories[index]
                                }}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h5 @click="toggleSection('coherence')" class="expandable-header">
                <span :class="sectionIcon('coherence')"></span>
                Coherence Feedback
            </h5>
            <div v-show="coherenceOpen">
                <div v-if="props.furtherCorrectionData.coherence.message">
                    <p>{{ props.furtherCorrectionData.coherence.message }}</p>
                </div>
                <div v-else>
                    <div v-for="(mistake, index) in props.furtherCorrectionData.coherence.mistakes" :key="index">
                        <h6><strong>Feedback {{ index + 1 }}</strong></h6>
                        <ul class="mt-2">
                            <li><strong>Mistake:</strong> {{ mistake }}</li>
                            <li><strong>Correction:</strong> {{ props.furtherCorrectionData.coherence.corrections[index]
                                }}</li>
                            <li><strong>Explanation:</strong> {{
                props.furtherCorrectionData.coherence.explanations[index] }}</li>
                            <li><strong>Category:</strong> {{ props.furtherCorrectionData.coherence.categories[index] }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h5 @click="toggleSection('writingStyle')" class="expandable-header">
                <span :class="sectionIcon('writingStyle')"></span>
                Writing Style Feedback
            </h5>
            <div v-show="writingStyleOpen">
                <div v-if="props.furtherCorrectionData.writingStyle.message">
                    <p>{{ props.furtherCorrectionData.writingStyle.message }}</p>
                </div>
                <div v-else>
                    <div v-for="(mistake, index) in props.furtherCorrectionData.writingStyle.mistakes" :key="index">
                        <h6><strong>Feedback {{ index + 1 }}</strong></h6>
                        <ul class="mt-2">
                            <li><strong>Mistake:</strong> {{ mistake }}</li>
                            <li><strong>Correction:</strong> {{
                props.furtherCorrectionData.writingStyle.corrections[index] }}</li>
                            <li><strong>Explanation:</strong> {{
                props.furtherCorrectionData.writingStyle.explanations[index] }}</li>
                            <li><strong>Category:</strong> {{ props.furtherCorrectionData.writingStyle.categories[index]
                                }}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="props.furtherCorrectionData === 'Not enough sessions to generate review.'">
            <p>{{ props.furtherCorrectionData }}</p>
        </div>
    </div>
</template>

<style scoped>
h3 {
    color: #eabc7c;
}

.expandable-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    user-select: none;
}

.arrow-icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    background: url('data:image/svg+xml;utf8,<svg fill="%23838383" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat center;
    transition: transform 0.3s ease;
    margin-right: 0.5rem;
}

.arrow-icon.open {
    transform: rotate(360deg);
}

.arrow-icon.closed {
    transform: rotate(270deg);
}

h6 {
    color: #eabc7c;
}

a {
    cursor: pointer;
    font-size: 1.2rem;
    color: #eabc7c;
}

a:hover {
    text-decoration: underline;
}

.feedback {
    overflow-y: auto;
    max-height: 70vh;
    box-shadow: none;
    transition: box-shadow 0.3s ease-in-out;
}

.feedback.has-shadow-bottom {
    box-shadow: inset 0 -6px 6px -6px rgba(0, 0, 0, 0.3);
}

.scrollable {
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease-in-out;
}
</style>
