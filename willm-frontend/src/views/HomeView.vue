<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
import { useAuthStore } from '../stores/auth';
import Evaluation from '@/components/Evaluation.vue';
import Review from '@/components/Review.vue';
import { isAfter } from 'date-fns';
import { message } from 'ant-design-vue';

const textareaSmall = ref('Introduction');
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

const preTestSection = ref('');
const preTestText = ref('');
const preTestCount = ref(0);
const MIN_LENGTH = 250;
const MAX_LENGTH = 1500;
const postTestText = ref('');
const postTestSection = ref('');
const postTestSections = ref([]);
const preTestSections = ref([]);

const handleSwitchChange = (event) => {
  mode.value = event.target.checked ? 'learning' : 'productive';
};

const selectedComponent = ref('Review');

const replaceDoubleBackslash = (text) => {
  // Replace double backslashes with a single backslash
  text = text.replace(/\\\\/g, '\\');
  // Replace escaped double quotes with actual double quotes
  text = text.replace(/\\"/g, '"');
  // Optionally: Remove the outer single quotes if they're not needed
  if (text.startsWith("'") && text.endsWith("'")) {
    text = text.slice(1, -1);
  }

  return text;
};

const cleanContext = (text) => {
  return text
    .replace(/[\[\]\*\.\.\.]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const handleCorrect = async () => {
  let textToCorrect = editableDiv.value.innerText.replace(/\u00A0/g, ' ');
  if (!textToCorrect) {
    message.info('Please enter some text to correct');
    return;
  }

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

  const hideLoading = message.loading("Evaluating text...", 0);
  try {
    const correctionResponse = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/correct', {
      text: textToCorrect,
      section: textareaSmall.value,
      mode: mode.value,
      language: authStore.getLanguage(),
      correctionModel: authStore.getLLM('correctionModel'),
      furtherCorrectionModel: authStore.getLLM('furtherCorrectionModel'),
      scoreModel: authStore.getLLM('scoreModel'),
    });

    explanations.value = correctionResponse.data.explanations.map(explanation => {
      return explanation.replace(/(\n[T|X]:.*)/g, '').trim();
    });

    categories.value = correctionResponse.data.categories.map(category => {
      return category.replace(/(\n[X]:.*)/g, '').trim();
    });

    // Process initial correction response
    mistakes.value = correctionResponse.data.mistakes.map(replaceDoubleBackslash);
    corrections.value = correctionResponse.data.corrections.map(replaceDoubleBackslash);
    explanations.value = correctionResponse.data.explanations.map(replaceDoubleBackslash);
    categories.value = correctionResponse.data.categories.map(replaceDoubleBackslash);
    contexts.value = correctionResponse.data.contexts.map(replaceDoubleBackslash);
    contexts.value = contexts.value.map(cleanContext);

    scores.value = correctionResponse.data.scores;

    highlightMistakes();
    selectedComponent.value = 'Evaluation';

    // Process further correction response if available
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
    } else {
      message.error('Error processing requests. Please try again.');
    }
  } finally {
    hideLoading();
  }

  try {
    // Trigger question generation
    await axios.post('http://willm.corinth.informatik.rwth-aachen.de/question/generate');
  } catch (error) {
    message.error('Error generating questions. Please contact the administrator.', 3);
  }
};

const generateReview = async () => {
  const hideLoading = message.loading("Generating review...", 0);
  try {
    const response = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/review/generate', { reviewModel: authStore.getLLM('reviewModel') });
    if (response.data.reviewData === 'No text available.') {
      message.info('Not enough texts to generate the review');
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
    } else {
      message.error('Error generating review.');
    }
  } finally {
    hideLoading();
  }
};

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

const stripHtmlTags = (html) => {
  let div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const normalizeText = (text) => {
  return text.toLowerCase()
    .replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const highlightMistakes = () => {
  let htmlContent = editableDiv.value.innerHTML;
  const mistakesNotFound = []; // To store indices of mistakes not found

  contexts.value.forEach((context, index) => {
    const mistake = mistakes.value[index];
    const normalizedContext = normalizeText(context);
    const regex = new RegExp(`(${escapeRegExp(normalizedContext)})`, 'gi');

    if (!regex.test(htmlContent)) {
      // Track mistakes that are not found
      mistakesNotFound.push(index);
    }

    htmlContent = htmlContent.replace(regex, (match) => {
      const normalizedMatch = normalizeText(match);
      const mistakeRegex = new RegExp(`\\b${escapeRegExp(mistake)}\\b`, 'gi');
      if (mistakeRegex.test(normalizedMatch)) {
        const mistakeElement = `<span class="mistake" data-index="${index}" data-bs-toggle="popover" data-bs-html="true" data-bs-content="${escapeHTML(`<b>Mistake</b>: ${mistake}<br><b>Type</b>: ${categories.value[index]}<br><b>Correction</b>: ${corrections.value[index]}<br><b>Explanation</b>: ${explanations.value[index]}`)}">${mistake}</span>`;
        return match.replace(mistakeRegex, mistakeElement);
      }
      return match;
    });
  });

  editableDiv.value.innerHTML = htmlContent;
  activatePopovers();

  // Handle unhighlighted mistakes
  unhighlightedMistakes.value = mistakesNotFound.map(index => mistakes.value[index]);
  unhighlightedCorrections.value = mistakesNotFound.map(index => corrections.value[index]);
  unhighlightedExplanations.value = mistakesNotFound.map(index => explanations.value[index]);
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
  if (!editableDiv.value) {
    return;
  }

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

const updateText = () => {
  limitTextLength();
};

const limitTextLength = () => {
  const maxLength = 1500;
  let textContent = editableDiv.value.innerText;
  if (textContent.length > maxLength) {
    editableDiv.value.innerText = textContent.slice(0, maxLength);
    message.info(`Maximum length of ${maxLength} characters reached.`);
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

const validatePreTestTextLength = (text) => {
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount >= MIN_LENGTH && wordCount <= MAX_LENGTH;
};

const completePreTestProcess = async () => {
  try {
    if (preTestCount.value >= 1) {
      await axios.post('http://willm.corinth.informatik.rwth-aachen.de/user/complete-pre-test');
      authStore.preTestsCompleted = true;
      const preTestModal = bootstrap.Modal.getInstance(document.getElementById('preTestModal'));
      preTestModal.hide();
      location.reload();
      message.success("Pre-test process completed. You can start using the tool.");
    } else {
      message.info("You need to submit at least one pre-test to complete the process.");
    }
  } catch (error) {
    message.error("Error completing pre-test process.");
  }
};

const checkPreTestStatus = async () => {
  try {
    const response = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/user/pre-test-status');
    if (response.data.preTestsCompleted) {
      authStore.preTestsCompleted = true;
    } else {
      authStore.preTestsCompleted = false;
      preTestCount.value = response.data.preTestCount;
      const preTestModal = new bootstrap.Modal(document.getElementById('preTestModal'));
      preTestModal.show();
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.info('Please log in again.');
    } else {
      message.error('Error checking pre-test status.');
    }
  }
};

const submitPreTest = async () => {
  if (!preTestSection.value) {
    message.info('Please enter the section for the text.');
    return;
  }

  if (!validatePreTestTextLength(preTestText.value)) {
    message.info(`Please ensure your text is between ${MIN_LENGTH} and ${MAX_LENGTH} words.`, 5);
    return;
  }

  try {
    await axios.post('http://willm.corinth.informatik.rwth-aachen.de/user/pre-test', { text: preTestText.value, section: preTestSection.value });
    preTestCount.value++;
    preTestText.value = '';
    preTestSection.value = '';
    if (preTestCount.value >= 3) {
      authStore.preTestsCompleted = true;
      const preTestModal = bootstrap.Modal.getInstance(document.getElementById('preTestModal'));
      preTestModal.hide();
      location.reload();
    } else if (preTestCount.value >= 1) {
      message.success(`Pre-test ${preTestCount.value}/3 submitted. You can submit up to ${3 - preTestCount.value} more pre-tests.`, 5)
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.info('Please log in again.');
    } else {
      message.error('Error submitting pre-test.');
    }
  }
};

const showPreTestModal = () => {
  const preTestModal = new bootstrap.Modal(document.getElementById('preTestModal'));
  preTestModal.show();
};


const submitPostTest = async () => {
  if (!validatePreTestTextLength(postTestText.value)) {
    message.info(`Please ensure your text is between ${MIN_LENGTH} and ${MAX_LENGTH} words.`, 5);
    return;
  }

  const nextPreTestSection = preTestSections.value[postTestSections.value.length]?.trim().toLowerCase();
  const currentPostTestSection = postTestSection.value.trim().toLowerCase();

  if (currentPostTestSection !== nextPreTestSection) {
    message.info(`Entered section does not match the expected pre-test section: ${nextPreTestSection}`, 5);
    return;
  }

  try {
    const response = await axios.post('http://willm.corinth.informatik.rwth-aachen.de/user/post-test', { text: postTestText.value, section: postTestSection.value });

    if (response.data.postTestsCompleted) {
      message.success('Post-test submitted successfully. You have completed the post-tests and will be logged out.');
      await authStore.logout();
    } else {
      message.success('Post-test submitted successfully.');
    }

    postTestText.value = '';
    postTestSections.value.push(postTestSection.value);
    postTestSection.value = '';
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.info('Please log in again.');
    } else {
      message.error('Error submitting post-test.');
    }
  }
};


const fetchPreTestSections = async () => {
  const currentDate = new Date();
  const enableDate = new Date('2024-08-28');
  if (isAfter(currentDate, enableDate)) {
    try {
      const preTestResponse = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/user/pre-test-sections');
      preTestSections.value = preTestResponse.data.sections;

      const postTestResponse = await axios.get('http://willm.corinth.informatik.rwth-aachen.de/user/post-test-sections');
      postTestSections.value = postTestResponse.data.sections;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        message.info('Please log in again.');
      } else {
        message.error('Error fetching sections');
      }
    }
  }
};

onMounted(async () => {
  await authStore.checkAuthStatus();
  if (!authStore.preTestsCompleted) {
    checkPreTestStatus();
  } else {
    activatePopovers();
  }
  initPopover();
  await getRecentReview();
  await fetchPreTestSections();
});
</script>

<template>
  <div class="container-fluid h-100 mt-4">
    <div v-if="authStore.preTestsCompleted">
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
                      <li>productive: you only need to click the correction to apply it.</li>
                      <li>learning: you need to type the correction on your own. This enhances the learning process</li>
                    </ul>
                  </li>
                </ul>
                ' />
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
              </div>
            </div>
          </div>
        </div>
        <!-- Upper Right -->
        <div class="col-5 d-flex flex-column">
          <div class="flex-grow-1">
            <component :is="selectedComponent === 'Review' ? Review : Evaluation" :reviewData="reviewData"
              :furtherCorrectionData="furtherCorrectionData" :scores="scores" />
          </div>
        </div>
      </div>
      <div class="row h-50 mt-3">
        <!-- Lower Left -->
        <div class="col-6">
          <div class="mx-5">
            <button type="button" class="btn btn-md me-2" @click="handleCorrect">AI Evaluation</button>
            <button type="button" class="btn btn-md" @click="generateReview">Review</button>
          </div>
          <span v-if="unhighlightedMistakes.length > 0">
            <h5>Unhighlighted Mistakes:</h5>
            <ul>
              <li v-for="(mistake, index) in unhighlightedMistakes" :key="index">
                <strong>Mistake:</strong> {{ mistake }}<br>
                <strong>Correction:</strong> {{ unhighlightedCorrections[index] }}<br>
                <strong>Explanation:</strong> {{ unhighlightedExplanations[index] }}
              </li>
            </ul>
          </span>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Please complete the pre-test submissions to start using the tool.</p>
      <button type="button" class="btn" @click="showPreTestModal">Start Pre-Test</button>
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
          <button type="button" class="btn" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn" @click="applyCorrection">Apply Correction</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Pre-test Modal -->
  <div class="modal fade" id="preTestModal" tabindex="-1" aria-labelledby="preTestModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <img class="info-icon me-2" src="/icons/icon-info-01.svg" data-bs-toggle="popover" data-bs-placement="bottom"
            data-bs-content='
              <h5>Length Requirements:</h5>
              <p>Minimum Length: 250 words<br>Maximum Length: 1500 words</p>
              <h5>Number of Samples:</h5>
              <p>You can submit up to 3 different writing samples.</p>
              <h5>Consistency for Post-Test:</h5>
              <p>You must use the same topic and sections for both the pre-test and post-test writing samples to
                ensure comparability.</p>
              <h5>Writing Requirements:</h5>
              <p>Write the samples on your own without the help of writing improvement tools. This is crucial for an
                effective evaluation.</p>
              <h5>Suggested Writing Types:</h5>
              <p><strong>Research Paper Scenario:</strong> Sections from a research paper, such as the introduction,
                literature review, or methodology.<br>
                <strong>Essays:</strong> Academic essays on a chosen topic, with a clear thesis and supporting
                arguments.<br>
                <strong>Reports:</strong> Academic or project reports, including executive summaries or analysis sections.
              </p>
          ' />
          <h5 class="modal-title" id="preTestModalLabel">Pre-Test Submission</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <textarea v-model="preTestSection" class="form-control mb-2" rows="1"
            placeholder="Enter the section..."></textarea>
          <textarea v-model="preTestText" class="form-control" rows="20"
            placeholder="Enter your text here..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" v-if="preTestCount > 0" @click="completePreTestProcess">Complete
            Pre-Test</button>
          <button type="button" class="btn" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn" @click="submitPreTest">Submit</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Post-Test Modal -->
  <div class="modal fade" id="postTestModal" tabindex="-1" aria-labelledby="postTestModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <img class="info-icon me-2" src="/icons/icon-info-01.svg" data-bs-toggle="popover" data-bs-placement="bottom"
            data-bs-content='
        <h5>Length Requirements:</h5>
        <p>Minimum Length: 250 words<br>Maximum Length: 1500 words</p>
        <h5>Number of Samples:</h5>
        <p>You can submit up to 3 different writing samples.</p>
        <h5>Consistency for Post-Test:</h5>
        <p>You must use the same topic and sections for both the pre-test and post-test writing samples to
          ensure comparability.</p>
        <h5>Writing Requirements:</h5>
        <p>Write the samples on your own without the help of writing improvement tools. This is crucial for an
          effective evaluation.</p>
        <h5>Suggested Writing Types:</h5>
        <p><strong>Research Paper Scenario:</strong> Sections from a research paper, such as the introduction,
          literature review, or methodology.<br>
          <strong>Essays:</strong> Academic essays on a chosen topic, with a clear thesis and supporting
          arguments.<br>
          <strong>Reports:</strong> Academic or project reports, including executive summaries or analysis sections.
        </p>
    ' />
          <h5 class="modal-title" id="postTestModalLabel">Post-Test Submission</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="preTestSections.length > 0">
            <p>Please enter the text for the following sections in the same order as the pre-test:</p>
            <ul>
              <li v-for="(section, index) in preTestSections" :key="index">{{ section }}</li>
            </ul>
            <textarea v-model="postTestSection" class="form-control mb-2" rows="1"
              placeholder="Enter the section..."></textarea>
            <textarea v-model="postTestText" class="form-control" rows="20"
              placeholder="Enter your text here..."></textarea>
          </div>
          <div v-else>
            <p>No pre-test sections found. Please complete the pre-test first.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn" @click="submitPostTest"
            :disabled="preTestSections.length === 0">Submit</button>
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
