<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
import { useAuthStore } from '../stores/auth';
import Evaluation from '@/components/Evaluation.vue';
import Review from '@/components/Review.vue';

const textareaSmall = ref('Introduction');
const textareaBig = ref();
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
const editableDiv = ref(null);
const reviewData = ref(null);
const scores = ref({});
const furtherCorrectionData = ref({
  organization: { mistakes: [], corrections: [], explanations: [] },
  coherence: { mistakes: [], corrections: [], explanations: [] },
  writingStyle: { mistakes: [], corrections: [], explanations: [] },
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

const handleSwitchChange = (event) => {
  mode.value = event.target.checked ? 'learning' : 'productive';
};

const selectedComponent = ref('Review');

const handleCorrect = async () => {
  let textToCorrect = editableDiv.value.innerText;
  if (!textToCorrect) {
    alert('Please enter some text to correct');
    return;
  }

  textToCorrect = stripHtmlTags(textToCorrect);
  editableDiv.value.innerText = textToCorrect;

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

  try {
    const [correctionResponse, scoresResponse] = await Promise.all([
      axios.post('http://localhost:3000/correct', {
        text: textToCorrect,
        section: textareaSmall.value,
        mode: mode.value,
      }),
      axios.post('http://localhost:3000/score/generate', {
        text: textToCorrect,
        section: textareaSmall.value,
      })
    ]);

    mistakes.value = correctionResponse.data.mistakes;
    corrections.value = correctionResponse.data.corrections;
    explanations.value = correctionResponse.data.explanations;
    categories.value = correctionResponse.data.categories;
    contexts.value = correctionResponse.data.contexts;

    explanations.value = correctionResponse.data.explanations.map(explanation => {
      return explanation.replace(/(\n[T|X]:.*)/g, '').trim();
    });

    scores.value = scoresResponse.data;

    highlightMistakes();
    selectedComponent.value = 'Evaluation';
  } catch (error) {
    console.error('Error processing requests:', error);
  }
};

const handleFurtherCorrect = async () => {
  let textToCorrect = editableDiv.value.innerText;
  if (!textToCorrect) {
    alert('Please enter some text to correct');
    return;
  }
  textToCorrect = stripHtmlTags(textToCorrect);
  editableDiv.value.innerText = textToCorrect;

  organizationMistakes.value = [];
  organizationCorrections.value = [];
  organizationExplanations.value = [];
  coherenceMistakes.value = [];
  coherenceCorrections.value = [];
  coherenceExplanations.value = [];
  writingStyleMistakes.value = [];
  writingStyleCorrections.value = [];
  writingStyleExplanations.value = [];

  try {
    const furtherResponse = await axios.post('http://localhost:3000/correct/further-correct', {
      text: textToCorrect,
      section: textareaSmall.value,
    });
    furtherCorrectionData.value = furtherResponse.data;

    selectedComponent.value = 'Evaluation';
  } catch (error) {
    console.error('Error getting further corrections:', error);
  }
};

const generateReview = async () => {
  try {
    const response = await axios.post('http://localhost:3000/review/generate');
    if (response.data.reviewData === '<2') {
      reviewData.value = 'Not enough sessions to generate the review';
    } else {
      reviewData.value = response.data.reviewData;
    }
    selectedComponent.value = 'Review';
  } catch (error) {
    console.error('Error generating review:', error);
  }
};

const getRecentReview = async () => {
  try {
    const response = await axios.get('http://localhost:3000/review/recent');
    reviewData.value = response.data.reviewData || 'No recent review available. Click on "Review" to generate one. Remember that you need to have at least 2 sessions to generate a review.';
    selectedComponent.value = 'Review';
  } catch (error) {
    console.error('Error fetching recent review:', error);
  }
};

const stripHtmlTags = (html) => {
  let div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const highlightMistakes = () => {
  let htmlContent = editableDiv.value.innerHTML;
  contexts.value.forEach((context, index) => {
    const mistake = mistakes.value[index];
    const regex = new RegExp(`(${context.replace(/\s+/g, '\\s+')})`, 'gi');
    htmlContent = htmlContent.replace(regex, (match) => {
      return match.replace(new RegExp(`\\b${escapeRegExp(mistake)}\\b`, 'gi'), `<span class="mistake" data-bs-toggle="popover" data-bs-html="true" data-bs-content="${escapeHTML(`<b>Mistake</b>: ${mistake}<br><b>Type</b>: ${categories.value[index]}<br><b>Correction</b>: ${corrections.value[index]}<br><b>Explanation</b>: ${explanations.value[index]}`)}">${mistake}</span>`);
    });
  });
  editableDiv.value.innerHTML = htmlContent;
  activatePopovers();
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeHTML = (string) => {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const activatePopovers = () => {
  const popoverElements = editableDiv.value.querySelectorAll('.mistake');
  popoverElements.forEach((el, index) => {
    new bootstrap.Popover(el, {
      trigger: 'hover',
      html: true,
      container: 'body',
      placement: 'top'
    });

    el.addEventListener('mouseenter', () => {
      const popoverInstance = bootstrap.Popover.getInstance(el);
      if (popoverInstance) {
        popoverInstance.show();
      }
    });

    el.addEventListener('mouseleave', () => {
      const popoverInstance = bootstrap.Popover.getInstance(el);
      if (popoverInstance) {
        popoverInstance.hide();
      }
    });

    el.addEventListener('click', (e) => {
      e.stopPropagation();
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

const updateText = () => {
  textareaBig.value = editableDiv.value.innerText;
  limitTextLength();
};

const limitTextLength = () => {
  const maxLength = 2000;
  let textContent = editableDiv.value.innerText;
  if (textContent.length > maxLength) {
    editableDiv.value.innerText = textContent.slice(0, maxLength);
    alert(`Maximum length of ${maxLength} characters reached.`);
  }
};

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

onMounted(() => {
  getRecentReview();
  activatePopovers();
  initPopover();
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
                  <li>Select the text section you want to correct.</li>
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
                      <li>productive: you only need to click the correction to apply it.</li>
                      <li>learning: you need to type the correction on your own. This enhances the learning process</li>
                      <li><b>Important</b>: First choose the learning mode, then evaluate your text with the tool by clicking on "AI Evaluation"</li>
                    </ul>
                  </li>
                </ul>' />
              <h5 class="mb-0 me-auto">How to use the tool?</h5>
              <div class="form-check form-switch d-flex align-items-center ms-auto" v-if="authStore.isAuthenticated">
                <input class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault"
                  @change="handleSwitchChange">
                <label class="form-check-label ms-2" for="flexSwitchCheckDefault">{{ mode }}</label>
              </div>
            </div>
            <textarea v-model="textareaSmall" class="form-control textarea-small" placeholder="Enter section..."
              required></textarea>
          </div>
        </div>

        <div class="row mx-5">
          <div class="col-12 p-0">
            <div ref="editableDiv" contenteditable="true" class="form-control textarea-big" @input="updateText">
              {{ textareaBig }}
            </div>
          </div>
        </div>
      </div>
      <!-- Upper Right -->
      <div class="col-5 d-flex flex-column">
        <div class="feedback flex-grow-1">
          <component :is="selectedComponent === 'Review' ? Review : Evaluation" :reviewData="reviewData"
            :furtherCorrectionData="furtherCorrectionData" :scores="scores" />
        </div>
      </div>
    </div>
    <div class="row h-50 mt-3">
      <!-- Lower Left -->
      <div class="col-6">
        <div class="mx-5">
          <button type="button" class="btn btn-md" @click="handleCorrect">AI Evaluation</button>
          <button type="button" class="btn btn-md" @click="generateReview">Review</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal -->
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
          <button type="button" class="btn" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn" @click="applyCorrection">Apply Correction</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  border: 1px solid #c5c5c5;
  color: #838383;
}

.btn:hover {
  background-color: #eabc7c;
  color: white;
}

.feedback {
  overflow-y: auto;
  max-height: 70vh;
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
</style>
