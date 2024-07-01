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

const selectedFeedback = ref('organization');

const toggleSidebar = () => {
  if (!isSidebarOpen.value) {
    isSidebarOpen.value = true;
  }
};

const generateImprovements = async () => {
  try {
    const response = await axios.post('http://localhost:3000/correct/improve');
    if (response.data === "<2") {
      console.log("Not enough sessions to generate improvements.");
      return;
    }

    console.log(response.data);
  } catch (error) {
    console.error('Error generating improvements:', error);
  }
};

const stripHtmlTags = (html) => {
  let div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const handleCorrect = async () => {
  let textToCorrect = editableDiv.value.innerText;
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
    const response = await axios.post('http://localhost:3000/correct', {
      text: textToCorrect,
      section: textareaSmall.value,
    });
    console.log(response.data)

    mistakes.value = response.data.mistakes;
    corrections.value = response.data.corrections;
    explanations.value = response.data.explanations;

    highlightMistakes();

    // After initial feedback, get further analysis
    const furtherResponse = await axios.post('http://localhost:3000/correct/further-correct', {
      text: textToCorrect,
      section: textareaSmall.value,
    });

    console.log(furtherResponse.data)

    organizationMistakes.value = furtherResponse.data.organization.mistakes;
    organizationCorrections.value = furtherResponse.data.organization.corrections;
    organizationExplanations.value = furtherResponse.data.organization.explanations;
    coherenceMistakes.value = furtherResponse.data.coherence.mistakes;
    coherenceCorrections.value = furtherResponse.data.coherence.corrections;
    coherenceExplanations.value = furtherResponse.data.coherence.explanations;
    writingStyleMistakes.value = furtherResponse.data.writingStyle.mistakes;
    writingStyleCorrections.value = furtherResponse.data.writingStyle.corrections;
    writingStyleExplanations.value = furtherResponse.data.writingStyle.explanations;
  } catch (error) {
    console.error('Error correcting text:', error);
  }

  toggleSidebar();
};

const highlightMistakes = () => {
  let htmlContent = editableDiv.value.innerHTML;
  mistakes.value.forEach((mistake, index) => {
    // Escape content before assigning it to data-bs-content because of the way it handles special characters and escaping in HTML
    const regex = new RegExp(`(${escapeRegExp(mistake)})`, 'gi');
    htmlContent = htmlContent.replace(regex,
      `<span class="mistake" data-bs-toggle="popover" data-bs-html="true" data-bs-content="${escapeHTML(`<b>Correction</b>: ${corrections.value[index]}<br><b>Explanation</b>: ${explanations.value[index]}`)}">$1</span>`);
  });
  editableDiv.value.innerHTML = htmlContent;
  activatePopovers();
};

// Escape special characters
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

const toggleCollapse = (index, category) => {
  const collapseElement = document.getElementById(`${category}-collapse-${index}`);
  const bsCollapse = new bootstrap.Collapse(collapseElement, {
    toggle: true
  });
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
      <div class="col-5 d-flex ml-5">
        <div>
          <h3>Past Reviews</h3>
          <p>Some text here</p>
        </div>
      </div>
    </div>
    <div class="row h-50 mt-3">
      <!-- Lower Left -->
      <div class="col-6">
        <div class="mx-5">
          <button type="button" class="btn btn-md" @click="handleCorrect">Correct</button>
          <button type="button" class="btn btn-md" @click="generateImprovements">Generate Improvements</button>
        </div>
      </div>
    </div>

    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false">
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
        <!-- <ul> -->
        <div v-for="(mistake, index) in organizationMistakes" :key="index">
          <a @click="toggleCollapse(index, 'organization')" href="javascript:void(0)">
            <strong>Feedback {{ index + 1 }}</strong>
          </a>
          <ul :id="'organization-collapse-' + index" class="collapse mt-2" :class="{ show: index === 0 }">
            <li><strong>Mistake:</strong> {{ mistake }} </li>
            <li><strong>Correction:</strong> {{ organizationCorrections[index] }}</li>
            <li><strong>Explanation:</strong> {{ organizationExplanations[index] }}</li>
          </ul>
        </div>
        <!-- </ul> -->
      </div>
      <div v-if="selectedFeedback === 'coherence'">
        <h4>Coherence Feedback</h4>
        <!-- <ul> -->
        <div v-for="(mistake, index) in coherenceMistakes" :key="index">
          <a @click="toggleCollapse(index, 'coherence')" href="javascript:void(0)">
            <strong>Feedback {{ index + 1 }}</strong>
          </a>
          <ul :id="'coherence-collapse-' + index" class="collapse mt-2" :class="{ show: index === 0 }">
            <li><strong>Mistake:</strong> {{ mistake }}</li>
            <li><strong>Correction:</strong> {{ coherenceCorrections[index] }}</li>
            <li><strong>Explanation:</strong> {{ coherenceExplanations[index] }}</li>
          </ul>
        </div>
        <!-- </ul> -->
      </div>
      <div v-if="selectedFeedback === 'writingStyle'">
        <h4>Writing Style Feedback</h4>
        <!-- <ul> -->
        <div v-for="(mistake, index) in writingStyleMistakes" :key="index">
          <a @click="toggleCollapse(index, 'writingStyle')" href="javascript:void(0)">
            <strong>Feedback {{ index + 1 }}</strong>
          </a>
          <ul :id="'writingStyle-collapse-' + index" class="collapse mt-2" :class="{ show: index === 0 }">
            <li><strong>Mistake:</strong> {{ mistake }}</li>
            <li><strong>Correction:</strong> {{ writingStyleCorrections[index] }}</li>
            <li><strong>Explanation:</strong> {{ writingStyleExplanations[index] }}</li>
          </ul>
        </div>
        <!-- </ul> -->
      </div>
    </Sidebar>
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
