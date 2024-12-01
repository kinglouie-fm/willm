<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
import { useAuthStore } from '../stores/auth';
import Evaluation from '@/components/Evaluation.vue';
import Review from '@/components/Review.vue';
import { message } from 'ant-design-vue';

/* 
 * CONSTANTS/REACTIVE VARIABLES
*/
const textareaSmall = ref('');
const mistakes = ref([]);
const corrections = ref([]);
const explanations = ref([]);
const categories = ref([]);
const contexts = ref([]);
const organizationMistakes = ref([]);
const organizationCorrections = ref([]);
const organizationExplanations = ref([]);
const coherenceMistakes = ref([]);
const coherenceCorrections = ref([]);
const coherenceExplanations = ref([]);
const writingStyleMistakes = ref([]);
const writingStyleCorrections = ref([]);
const writingStyleExplanations = ref([]);
const unhighlightedMistakes = ref([]);
const unhighlightedCorrections = ref([]);
const unhighlightedExplanations = ref([]);
const editableDiv = ref(null);
const reviewData = ref(null);
const scores = ref({});
const furtherCorrectionData = ref({
  organization: { mistakes: [], corrections: [], explanations: [], categories: [] },
  coherence: { mistakes: [], corrections: [], explanations: [], categories: [] },
  writingStyle: { mistakes: [], corrections: [], explanations: [], categories: [] },
});

const authStore = useAuthStore();
const mode = ref('productive');

const currentMistake = ref('');
const currentCorrection = ref('');
const currentExplanation = ref('');
const currentCategory = ref('');
const userCorrection = ref('');
const correctionError = ref('');
let currentMistakeElement = null;

// Handle switch change between learning and productive mode
const handleSwitchChange = (event) => {
  mode.value = event.target.checked ? 'learning' : 'productive';
};

const selectedComponent = ref('Review');

// Replace backslashes and clean up text for display
const replaceBackslash = (text) => {
  text = text.replace(/\\\\/g, '\\');
  text = text.replace(/\\'/g, "'");
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\\(?=\W)/g, '');

  return text;
};

// Clean up context text for display
const cleanContext = (text) => {
  return text
    .replace(/\[.*?\]/g, '')
    .replace(/[\*\.\.\.]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\u200B/g, '')  // Remove zero-width spaces if present
    .trim();
};

// Handle correct button click
const handleCorrect = async () => {
  let textToCorrect = editableDiv.value.innerText.replace(/\u00A0/g, ' ');
  if (!textToCorrect) {
    message.info('Please enter some text to correct');
    return;
  }

  if (!textareaSmall.value) {
    message.info('Please enter the section for the text.');
    return;
  }

  // Strip HTML tags from text for processing
  textToCorrect = stripHtmlTags(textToCorrect);
  editableDiv.value.innerText = textToCorrect;

  // Reset correction states
  mistakes.value = [];
  corrections.value = [];
  explanations.value = [];
  categories.value = [];
  contexts.value = [];
  organizationMistakes.value = [];
  organizationCorrections.value = [];
  organizationExplanations.value = [];
  coherenceMistakes.value = [];
  coherenceCorrections.value = [];
  coherenceExplanations.value = [];
  writingStyleMistakes.value = [];
  writingStyleCorrections.value = [];
  writingStyleExplanations.value = [];
  unhighlightedMistakes.value = [];
  unhighlightedCorrections.value = [];
  unhighlightedExplanations.value = [];
  furtherCorrectionData.value = {
    organization: { mistakes: [], corrections: [], explanations: [], categories: [] },
    coherence: { mistakes: [], corrections: [], explanations: [], categories: [] },
    writingStyle: { mistakes: [], corrections: [], explanations: [], categories: [] },
  };

  // Show loading spinner as long as the request is being processed
  const hideLoading = message.loading("Evaluating text...", 0);
  try {
    // Request correction from the backend
    const correctionResponse = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/correct', {
      text: textToCorrect,
      section: textareaSmall.value,
      mode: mode.value,
      language: authStore.getLanguage(),
      correctionModel: authStore.getLLM('correctionModel'),
      furtherCorrectionModel: authStore.getLLM('furtherCorrectionModel'),
      scoreModel: authStore.getLLM('scoreModel'),
    });

    // console.log(correctionResponse)

    // Process response data (explanations/categories)
    explanations.value = correctionResponse.data.explanations.map(explanation => {
      return explanation.replace(/(\n[T|X]:.*)/g, '').trim();
    });

    // Process response data (categories)
    categories.value = correctionResponse.data.categories.map(category => {
      return category.replace(/(\n[X]:.*)/g, '').trim();
    });

    // Process initial correction response
    mistakes.value = correctionResponse.data.mistakes.map(replaceBackslash);
    corrections.value = correctionResponse.data.corrections.map(replaceBackslash);
    explanations.value = correctionResponse.data.explanations.map(replaceBackslash);
    categories.value = correctionResponse.data.categories.map(replaceBackslash);
    contexts.value = correctionResponse.data.contexts.map(replaceBackslash).map(cleanContext);

    scores.value = correctionResponse.data.scores;

    // Highlight mistakes in the text
    highlightMistakes();
    selectedComponent.value = 'Evaluation';

    // Process further correction response by storing the data in the reactive variable
    if (correctionResponse.data.furtherCorrection) {
      const furtherCorrection = correctionResponse.data.furtherCorrection;

      if (furtherCorrection.organization.message) {
        furtherCorrectionData.value.organization = { message: furtherCorrection.organization.message };
      } else {
        furtherCorrectionData.value.organization.mistakes = furtherCorrection.organization.mistakes
        furtherCorrectionData.value.organization.corrections = furtherCorrection.organization.corrections
        furtherCorrectionData.value.organization.explanations = furtherCorrection.organization.explanations
        furtherCorrectionData.value.organization.categories = furtherCorrection.organization.categories
      }

      if (furtherCorrection.coherence.message) {
        furtherCorrectionData.value.coherence = { message: furtherCorrection.coherence.message };
      } else {
        furtherCorrectionData.value.coherence.mistakes = furtherCorrection.coherence.mistakes
        furtherCorrectionData.value.coherence.corrections = furtherCorrection.coherence.corrections
        furtherCorrectionData.value.coherence.explanations = furtherCorrection.coherence.explanations
        furtherCorrectionData.value.coherence.categories = furtherCorrection.coherence.categories
      }

      if (furtherCorrection.writingStyle.message) {
        furtherCorrectionData.value.writingStyle = { message: furtherCorrection.writingStyle.message };
      } else {
        furtherCorrectionData.value.writingStyle.mistakes = furtherCorrection.writingStyle.mistakes
        furtherCorrectionData.value.writingStyle.corrections = furtherCorrection.writingStyle.corrections
        furtherCorrectionData.value.writingStyle.explanations = furtherCorrection.writingStyle.explanations
        furtherCorrectionData.value.writingStyle.categories = furtherCorrection.writingStyle.categories
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.info('Please log in again.');
    } else if (error.response && error.response.status === 403) {
      message.info("No requests left for GPT 4o. Please try again tomorrow.", 4);
    } else {
      message.error('Error processing requests. Please try again.');
    }
  } finally {
    // Hide loading spinner
    hideLoading();
  }

  try {
    // Trigger question generation
    await axios.post('http://willm.corinth.informatik.rwth-aachen.de/question/generate');
  } catch (error) {
    message.error('Error generating questions. Please contact the administrator.', 3);
  }
};

// Generate review
const generateReview = async () => {
  // Show loading spinner as long as the request is being processed
  const hideLoading = message.loading("Generating review...", 0);
  try {
    // Request review generation from the backend
    const response = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/review/generate', { reviewModel: authStore.getLLM('reviewModel') });
    if (response.data.reviewData === 'Not enough texts available to generate a review.') {
      message.info('Not enough texts to generate the review.');
    } else if (response.data.reviewData === '<2') {
      message.info('Not enough sessions to generate the review');
    } else {
      reviewData.value = response.data.reviewData;
      message.success("Review generated successfully");
    }
    selectedComponent.value = 'Review';
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.info('Please log in again.');
    } else if (error.response && error.response.status === 403) {
      message.info("No requests left for GPT 4o. Please try again tomorrow.", 4);
    } else {
      message.error('Error processing requests. Please try again.');
    }
  } finally {
    // Hide loading spinner
    hideLoading();
  }
};

// Get recent review
const getRecentReview = async () => {
  try {
    const response = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/review/recent');
    reviewData.value = response.data.reviewData || 'No recent review available. Click on "Review" to generate one. Remember that you need to have at least 2 sessions to generate a review.';
    selectedComponent.value = 'Review';
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.info('Please log in again.');
    } else {
      message.error('Error fetching recent review.');
    }
  }
};

// Strip HTML tags from text
const stripHtmlTags = (html) => {
  let div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Highlight mistakes in the text
const highlightMistakes = () => {
  let htmlContent = editableDiv.value.innerHTML;

  // For each mistake, find the context in the text and highlight it
  contexts.value.forEach((context, index) => {
    const mistake = mistakes.value[index];
    const correction = corrections.value[index];
    const explanation = explanations.value[index];
    const category = categories.value[index];
    let contextFound = false;

    context = context.replace(/M:.*$/, '').trim();
    context = context.replace(/\\/g, '').trim();
    if (context.includes('___')) {
      context = context.replace('___', mistake);
    }

    // First attempt: strict match within the exact context
    const strictRegex = new RegExp(`(${escapeRegExp(context)})`, 'gi');

    htmlContent = htmlContent.replace(strictRegex, (match) => {
      const mistakeRegex = new RegExp(`\\b${escapeRegExp(mistake)}\\b`, 'gi');
      if (mistakeRegex.test(match)) {
        contextFound = true;
        return match.replace(mistakeRegex, `<span class="mistake" data-bs-toggle="popover" data-bs-html="true" data-bs-content="${escapeHTML(`<b>Mistake</b>: ${mistake}<br><b>Type</b>: ${category}<br><b>Correction</b>: ${correction}<br><b>Explanation</b>: ${explanation}`)}">${mistake}</span>`);
      }
      return match;
    });

    // If strict match was not successful, broaden the search context
    if (!contextFound) {
      const surroundingText = `.{0,20}`;
      const broadRegex = new RegExp(`(${surroundingText}${escapeRegExp(context)}${surroundingText})`, 'gi');

      htmlContent = htmlContent.replace(broadRegex, (match) => {
        const mistakeRegex = new RegExp(`\\b${escapeRegExp(mistake)}\\b`, 'gi');
        if (mistakeRegex.test(match)) {
          return match.replace(mistakeRegex, `<span class="mistake" data-bs-toggle="popover" data-bs-html="true" data-bs-content="${escapeHTML(`<b>Mistake</b>: ${mistake}<br><b>Type</b>: ${category}<br><b>Correction</b>: ${correction}<br><b>Explanation</b>: ${explanation}`)}">${mistake}</span>`);
        }
        return match;
      });
    }

    // If neither strict nor broad match was successful, add to unhighlighted arrays
    if (!contextFound) {
      unhighlightedMistakes.value.push(mistake);
      unhighlightedCorrections.value.push(correction);
      unhighlightedExplanations.value.push(explanation);
    }
  });
  editableDiv.value.innerHTML = htmlContent;
  activatePopovers();
};

// Helper function to escape special characters for regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to escape HTML special characters
const escapeHTML = (string) => {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Activate popovers over highlighted mistakes
const activatePopovers = () => {
  if (!editableDiv.value) {
    return;
  }

  // Add popovers to all highlighted mistakes
  const popoverElements = editableDiv.value.querySelectorAll('.mistake');
  popoverElements.forEach((el, index) => {
    new bootstrap.Popover(el, {
      trigger: 'hover',
      html: true,
      container: 'body',
      placement: 'top'
    });

    // Show popover on hover
    el.addEventListener('mouseenter', () => {
      const popoverInstance = bootstrap.Popover.getInstance(el);
      if (popoverInstance) {
        popoverInstance.show();
      }
    });

    // Hide popover on mouse leave
    el.addEventListener('mouseleave', () => {
      const popoverInstance = bootstrap.Popover.getInstance(el);
      if (popoverInstance) {
        popoverInstance.hide();
      }
    });

    // Handle click on popover depending on the mode (either learning or productive)
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = el.getAttribute('data-index');
      const content = el.getAttribute('data-bs-content');
      const correction = content.split('<br>')[2].replace('<b>Correction</b>: ', '');

      if (mode.value === 'productive') {
        el.innerText = correction;
        el.classList.remove('mistake');
        el.removeAttribute('data-bs-toggle');
        el.removeAttribute('data-bs-content');
        const popoverInstance = bootstrap.Popover.getInstance(el);
        if (popoverInstance) {
          popoverInstance.dispose();
          el.replaceWith(el.cloneNode(true));
        }
      } else if (mode.value === 'learning') {
        currentMistake.value = el.innerText;
        currentCategory.value = categories.value[index];
        currentCorrection.value = correction;
        currentExplanation.value = explanations.value[index];
        userCorrection.value = '';
        correctionError.value = '';
        currentMistakeElement = el;
        const modal = new bootstrap.Modal(document.getElementById('correctionModal'));
        modal.show();
      }
    });
  });
};

// Check if the text is over the maximum word limit and cut it off if necessary
const updateText = () => {
  limitTextLength();
};

// Limit the text length to 500 words
const limitTextLength = () => {
  const maxLength = 500;
  let textContent = editableDiv.value.innerText;
  let words = textContent.trim().split(/\s+/).filter(word => word.length > 0);

  if (words.length > maxLength) {
    editableDiv.value.innerText = words.slice(0, maxLength).join(" ");
    message.info(`Maximum limit of ${maxLength} words reached.`);
  }
};

// Apply correction to the text
const applyCorrection = () => {
  if (userCorrection.value.trim() === currentCorrection.value.trim()) {
    if (currentMistakeElement) {
      currentMistakeElement.innerText = userCorrection.value;
      currentMistakeElement.classList.remove('mistake');
      currentMistakeElement.removeAttribute('data-bs-toggle');
      currentMistakeElement.removeAttribute('data-bs-content');
      const popoverInstance = bootstrap.Popover.getInstance(currentMistakeElement);
      if (popoverInstance) {
        popoverInstance.dispose();
        currentMistakeElement.replaceWith(currentMistakeElement.cloneNode(true));
      }
      currentMistakeElement = null;
      correctionError.value = '';
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById('correctionModal'));
    if (modal) {
      modal.hide();
    }
  } else {
    correctionError.value = 'The correction entered is incorrect. Please try again.';
  }
};

// Initialize popovers for the info icons
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
  if (authStore.isAuthenticated && authStore.preTestCompleted) {
    activatePopovers();
    initPopover();
    await getRecentReview();
  }
});
</script>

<template>
  <div class="container-fluid h-100 mt-4">
    <div class="row h-50">
      <!-- Upper Left -->
      <div class="col-7">
        <div class="row mx-5 mb-3">
          <div class="col-12 p-0">
            <div class="d-flex align-items-center mb-3">
              <img class="info-icon me-2" src="/icons/icon-info-01.svg" data-bs-toggle="popover"
                data-bs-placement="bottom" data-bs-content='
                <h5>How to use the tool?</h5>
                <ul>
                  <li>Select your preferred language from the dropdown menu.
                    <ul>
                      <li>This allows you to receive explanations in the language you are most comfortable with.</li>
                    </ul>
                  </li>
                  <li>Enter the text section you want to correct.</li>
                  <li>Enter your text in the large text area.</li>
                  <li>
                    Click <b>"AI Evaluation"</b> to receive scores and explanations.
                    <ul>
                      <li>Feedback on Organization, Coherence, and Writing Style considers the corrected version of your
                        text.</li>
                    </ul>
                  </li>
                  <li>Click <b>"Review"</b> to get tips and see recent improvements.</li>
                  <li>Use the switch to change the learning mode:
                    <ul>
                      <li>Productive: you only need to click the correction to apply it.</li>
                      <li>Learning: you need to type the correction on your own. This enhances the learning process.</li>
                    </ul>
                  </li>
                </ul>
                ' />
              <h5 class="mb-0 me-auto">How to use the tool?</h5>
              <div class="form-check form-switch d-flex align-items-center ms-auto" v-if="authStore.isAuthenticated">
                <label class="form-check-label me-5" for="flexSwitchCheckDefault">Productive</label>
                <input class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault"
                  @change="handleSwitchChange">
                <label class="form-check-label ms-2" for="flexSwitchCheckDefault">Learning</label>
              </div>
            </div>
            <textarea v-model="textareaSmall" class="form-control textarea-small" placeholder="Enter section..."
              required></textarea>
          </div>
        </div>

        <div class="row mx-5">
          <div class="col-12 p-0">
            <div ref="editableDiv" contenteditable="true" class="form-control textarea-big" @input="updateText">
            </div>
          </div>
        </div>
      </div>
      <!-- Upper Right -->
      <div class="col-5 d-flex flex-column">
        <div class="flex-grow-1">
          <component :is="selectedComponent === 'Review' ? Review : Evaluation" :reviewData="reviewData"
            :furtherCorrectionData="furtherCorrectionData" :scores="scores"
            :unhighlightedMistakes="unhighlightedMistakes" :unhighlightedCorrections="unhighlightedCorrections"
            :unhighlightedExplanations="unhighlightedExplanations" />
        </div>
      </div>
    </div>
    <div class="row h-50 mt-3">
      <!-- Lower Left -->
      <div class="col-6">
        <div class="mx-5">
          <button type="button" class="btn btn-custom btn-md me-2" @click="handleCorrect">AI Evaluation</button>
          <button type="button" class="btn btn-custom btn-md" @click="generateReview">Review</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Correction Modal -->
  <div class="modal fade" id="correctionModal" tabindex="-1" aria-labelledby="correctionModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="correctionModalLabel">Correction</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p><strong>Mistake:</strong> {{ currentMistake }}</p>
          <p><strong>Type:</strong> {{ currentCategory }}</p>
          <p><strong>Correction:</strong> {{ currentCorrection }}</p>
          <p><strong>Explanation:</strong> {{ currentExplanation }}</p>
          <input v-model="userCorrection" type="text" class="form-control" placeholder="Type the correction here">
          <p v-if="correctionError" class="text-danger">{{ correctionError }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" @click="applyCorrection">Apply Correction</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-custom {
  border: 1px solid #c5c5c5;
  color: #838383;
}

.btn-custom:hover {
  background-color: #eabc7c;
  color: white;
}

.info-icon {
  width: 25px;
  height: 25px;
  cursor: pointer;
}

.textarea-big {
  height: 500px;
  word-wrap: break-word;
  overflow: auto;
  resize: none;
  line-height: 1.5rem;
  font-size: 1.1rem;
}

.textarea-small {
  height: 30px;
  line-height: 1.5rem;
  font-size: 1.1rem;
  resize: none;
}

a {
  cursor: pointer;
  font-size: 1.2rem;
  color: #eabc7c;
}

a:hover {
  text-decoration: underline;
}

:deep(.popover.wide-popover) {
  max-width: none;
  font-size: 16px;
}

.modal-footer .btn-primary {
  background-color: #eabc7c;
  border-color: #eabc7c;
}

.modal-footer .btn-primary:hover {
  background-color: #e6b065;
  border-color: #e6b065;
}

.modal-footer .btn-secondary:hover {
  background-color: rgb(161, 165, 170);
  border-color: rgb(161, 165, 170);
}
</style>
