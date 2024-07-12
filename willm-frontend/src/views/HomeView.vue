<script setup>
import { ref, onMounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import axios from 'axios';
import * as bootstrap from 'bootstrap';

const isSidebarOpen = ref(false);
const textareaSmall = ref('Introduction');
const textareaBig = ref();
const mistakes = ref([]);
const corrections = ref([]);
const explanations = ref([]);
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

const selectedTab = ref('Correction');

const toggleSidebar = () => {
  if (!isSidebarOpen.value) {
    isSidebarOpen.value = true;
  }
};

const generateReview = async () => {
  try {
    const response = await axios.post('http://localhost:3000/review/generate');
    if (response.data.reviewData === '<2') {
      reviewData.value = 'Not enough sessions to generate the review';
    } else {
      reviewData.value = response.data.reviewData;
      console.log(response.data)
    }
    selectedTab.value = 'Review';
    toggleSidebar();
  } catch (error) {
    console.error('Error generating review:', error);
  }
};

const stripHtmlTags = (html) => {
  let div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

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
      }),
      axios.post('http://localhost:3000/score/generate', {
        text: textToCorrect,
        section: textareaSmall.value,
      })
    ]);

    // Handle correction response
    mistakes.value = correctionResponse.data.mistakes;
    corrections.value = correctionResponse.data.corrections;
    explanations.value = correctionResponse.data.explanations;

    explanations.value = correctionResponse.data.explanations.map(explanation => {
      return explanation.replace(/(\nT:.*)/g, '').trim();
    });

    scores.value = scoresResponse.data;

    highlightMistakes();
    selectedTab.value = 'Scores';
    toggleSidebar();
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

    console.log(furtherResponse.data)
    toggleSidebar();
  }
  catch (error) {
    console.error('Error getting further corrections:', error);
  }
};

const highlightMistakes = () => {
  let htmlContent = editableDiv.value.innerHTML;
  mistakes.value.forEach((mistake, index) => {
    // Create a safe regex to find the exact mistake word
    const regex = new RegExp(`\\b${escapeRegExp(mistake)}\\b`, 'gi');

    // Use replace function to replace the mistake with a highlighted version
    htmlContent = htmlContent.replace(regex, (match) => {
      return `<span class="mistake" data-bs-toggle="popover" data-bs-html="true" data-bs-content="${escapeHTML(`<b>Correction</b>: ${corrections.value[index]}<br><b>Explanation</b>: ${explanations.value[index]}`)}">${match}</span>`;
    });
  });
  editableDiv.value.innerHTML = htmlContent;
  activatePopovers();
};

// Escape special characters for regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Escape HTML characters
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
  popoverElements.forEach((el) => {
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
      const correction = content.split('<br>')[0].replace('<b>Correction</b>: ', '');
      el.innerText = correction;
      el.classList.remove('mistake');
      el.removeAttribute('data-bs-toggle');
      el.removeAttribute('data-bs-content');
      const popoverInstance = bootstrap.Popover.getInstance(el);
      if (popoverInstance) {
        popoverInstance.dispose();
        el.replaceWith(el.cloneNode(true));
      }
    });
  });
};

const updateText = () => {
  textareaBig.value = editableDiv.value.innerText;
};
</script>

<template>
  <div class="container-fluid h-100 mt-5">
    <div class="row h-50">
      <!-- Upper Left -->
      <div class="col-7">
        <div class="row mx-5 mb-3">
          <div class="col-12 p-0">
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
      <div class="col-5 d-flex flex-column ml-5">
        <div class="d-flex justify-content-end align-items-center">
          <button type="button" class="btn" @click="toggleSidebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list"
              viewBox="0 0 16 16">
              <path fill-rule="evenodd"
                d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="row h-50 mt-3">
      <!-- Lower Left -->
      <div class="col-6">
        <div class="mx-5">
          <button type="button" class="btn btn-md" @click="handleCorrect">Correct</button>
          <button type="button" class="btn btn-md" @click="handleFurtherCorrect">Get further Feedback</button>
          <button type="button" class="btn btn-md" @click="generateReview">Generate Review</button>
        </div>
      </div>
    </div>

    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" :review-data="reviewData"
      :furtherCorrectionData="furtherCorrectionData" :selectedTab="selectedTab" :scores="scores" />
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

.textarea-big {
  height: 300px;
  word-wrap: break-word;
  overflow: auto;
  resize: none;
  line-height: 1.5rem;
  font-size: 1.1rem;
}

.textarea-small {
  height: 50px;
  line-height: 1.5rem;
  font-size: 1.1rem;
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
