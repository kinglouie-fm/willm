<script setup>
import { ref, onMounted } from 'vue';
import * as bootstrap from 'bootstrap';

// Define props
const props = defineProps({
    furtherCorrectionData: Object,
    unhighlightedMistakes: Array,
    unhighlightedCorrections: Array,
    unhighlightedExplanations: Array
});

const unhighlightedMistakesOpen = ref(false);
const organizationOpen = ref(false);
const coherenceOpen = ref(false);
const writingStyleOpen = ref(false);
const feedbackDiv = ref(null);

// Toggle section open/close
const toggleSection = (section) => {
    if (section === 'organization') {
        organizationOpen.value = !organizationOpen.value;
    } else if (section === 'coherence') {
        coherenceOpen.value = !coherenceOpen.value;
    } else if (section === 'writingStyle') {
        writingStyleOpen.value = !writingStyleOpen.value;
    } else if (section === 'unhighlightedMistakes') {
        unhighlightedMistakesOpen.value = !unhighlightedMistakesOpen.value;
    }
};

// Check if section is open
const isSectionOpen = (section) => {
    if (section === 'organization') {
        return organizationOpen.value;
    } else if (section === 'coherence') {
        return coherenceOpen.value;
    } else if (section === 'writingStyle') {
        return writingStyleOpen.value;
    } else if (section === 'unhighlightedMistakes') {
        return unhighlightedMistakesOpen.value;
    }
    return false;
};

// Get section icon
const sectionIcon = (section) => {
    if (section === 'organization') {
        return isSectionOpen('organization') ? 'arrow-icon open' : 'arrow-icon closed';
    } else if (section === 'coherence') {
        return isSectionOpen('coherence') ? 'arrow-icon open' : 'arrow-icon closed';
    } else if (section === 'writingStyle') {
        return isSectionOpen('writingStyle') ? 'arrow-icon open' : 'arrow-icon closed';
    } else if (section === 'unhighlightedMistakes') {
        return isSectionOpen('unhighlightedMistakes') ? 'arrow-icon open' : 'arrow-icon closed';
    }
};

// Add shadow to bottom of feedback div if overflow to indicate that there is more content
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

// Check if there is initial overflow to indicate that there is more content
const checkInitialOverflow = () => {
    const element = feedbackDiv.value;
    if (!element) return;

    if (element.scrollHeight > element.clientHeight - 1) {
        element.classList.add('has-shadow-bottom');
    } else {
        element.classList.remove('has-shadow-bottom');
    }
};

// Initialize the popover for info icons
const initPopover = () => {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach((popoverTriggerEl) => {
        const popover = new bootstrap.Popover(popoverTriggerEl, {
            trigger: 'hover',
            html: true,
            template: '<div class="popover wide-popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        });

        popoverTriggerEl.addEventListener('inserted.bs.popover', () => {
            const popoverElement = document.querySelector('.popover.wide-popover');
            if (popoverElement) {
                popoverElement.style.maxWidth = '600px';
                popoverElement.style.fontSize = '16px';
            }
        });
    });
};

onMounted(async () => {
    initPopover();
    const element = feedbackDiv.value;
    if (element) {
        element.addEventListener('scroll', handleScroll);
        checkInitialOverflow();
    }
});
</script>

<template>
    <div class="feedback" ref="feedbackDiv">
        <div class="d-flex align-items-center justify-content-center mb-3">
            <img class="info-icon me-2" src="/icons/icon-info-01.svg" data-bs-toggle="popover"
                data-bs-placement="bottom" data-bs-content='
                <h5>Understanding Writing Elements</h5>
                <ul>
                    <li><b>Coherence:</b> The logical connection and smooth flow of ideas throughout your text.
                        <ul>
                            <li>Ensure each sentence transitions smoothly to the next.</li>
                            <li>Avoid irrelevant content that disrupts the main argument.</li>
                        </ul>
                    </li>
                    <li><b>Organization:</b> The structural arrangement of ideas within paragraphs and the text as a whole.
                        <ul>
                            <li>Maintain a clear introduction, body, and conclusion.</li>
                            <li>Ensure paragraphs focus on one main idea with supporting evidence.</li>
                        </ul>
                    </li>
                    <li><b>Writing Style:</b> The tone, clarity, and formality of your text, adapted to the academic context.
                        <ul>
                            <li>Use precise and formal language appropriate for academic writing.</li>
                            <li>Avoid overly complex sentences that reduce clarity.</li>
                        </ul>
                    </li>
                </ul>
            ' />
            <h3 class="text-center">Evaluation</h3>
        </div>
        <!-- <div v-if="props.unhighlightedMistakes.length > 0">
            <h5 @click="toggleSection(' unhighlightedMistakes')" class="expandable-header">
        <span :class="sectionIcon('unhighlightedMistakes')"></span>
        Mistakes that were not highlighted
        </h5>
        <div v-show="unhighlightedMistakesOpen">
            <ul class="mt-2">
                <li v-for="(mistake, index) in props.unhighlightedMistakes" :key="index">
                    <strong>Mistake:</strong> {{ mistake }}<br>
                    <strong>Correction:</strong> {{ props.unhighlightedCorrections[index] }}<br>
                    <strong>Explanation:</strong> {{ props.unhighlightedExplanations[index] }}
                </li>
            </ul>
        </div>
    </div> -->
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
                            <!-- <li><strong>Mistake:</strong> {{ mistake }} </li> -->
                            <li><strong>Correction:</strong> {{
                                props.furtherCorrectionData.organization.corrections[index] }}</li>
                            <li><strong>Explanation:</strong> {{
                                props.furtherCorrectionData.organization.explanations[index] }}</li>
                            <li><strong>Category:</strong> {{
                                props.furtherCorrectionData.organization.categories[index]
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
                            <!-- <li><strong>Mistake:</strong> {{ mistake }}</li> -->
                            <li><strong>Correction:</strong> {{
                                props.furtherCorrectionData.coherence.corrections[index]
                            }}</li>
                            <li><strong>Explanation:</strong> {{
                                props.furtherCorrectionData.coherence.explanations[index] }}</li>
                            <li><strong>Category:</strong> {{
                                props.furtherCorrectionData.coherence.categories[index] }}
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
                            <!-- <li><strong>Mistake:</strong> {{ mistake }}</li> -->
                            <li><strong>Correction:</strong> {{
                                props.furtherCorrectionData.writingStyle.corrections[index] }}</li>
                            <li><strong>Explanation:</strong> {{
                                props.furtherCorrectionData.writingStyle.explanations[index] }}</li>
                            <li><strong>Category:</strong> {{
                                props.furtherCorrectionData.writingStyle.categories[index]
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
.info-icon {
    width: 25px;
    height: 25px;
    cursor: pointer;
}

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
    max-height: 50vh;
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
