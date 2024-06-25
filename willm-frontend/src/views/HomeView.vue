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

const toggleSidebar = () => {
  if (!isSidebarOpen.value) {
    isSidebarOpen.value = true;
  }
};

const handleCorrect = async () => {
  const textToCorrect = editableDiv.value.innerText;
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
    });
    console.log(response.data)

    mistakes.value = response.data.mistakes;
    corrections.value = response.data.corrections;
    explanations.value = response.data.explanations;

    highlightMistakes();

    // After initial feedback, get further analysis
    const furtherResponse = await axios.post('http://localhost:3000/correct/further-correct', {
      text: response.data.correctedText,
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
    const regex = new RegExp(`(${mistake})`, 'gi');
    htmlContent = htmlContent.replace(regex,
      `<span class="mistake" data-bs-toggle="popover" data-bs-html="true" data-bs-content="<b>Correction</b>: ${corrections.value[index]}<br><b>Explanation</b>: ${explanations.value[index]}">$1</span>`);
  });
  editableDiv.value.innerHTML = htmlContent;
  activatePopovers();
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
        </div>
      </div>
    </div>

    <!-- Sidebar Component -->
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false">
      <!-- <h4>Explanations</h4>
      <ul>
        <li v-for="explanation in explanations" :key="explanation">{{ explanation }}</li>
      </ul> -->
      <h4>Organization Feedback</h4>
      <ul>
        <li v-for="(mistake, index) in organizationMistakes" :key="index">
          <strong>M:</strong> {{ mistake }} <br>
          <strong>C:</strong> {{ organizationCorrections[index] }} <br>
          <strong>E:</strong> {{ organizationExplanations[index] }}
        </li>
      </ul>
      <h4>Coherence Feedback</h4>
      <ul>
        <li v-for="(mistake, index) in coherenceMistakes" :key="index">
          <strong>M:</strong> {{ mistake }} <br>
          <strong>C:</strong> {{ coherenceCorrections[index] }} <br>
          <strong>E:</strong> {{ coherenceExplanations[index] }}
        </li>
      </ul>
      <h4>Writing Style Feedback</h4>
      <ul>
        <li v-for="(mistake, index) in writingStyleMistakes" :key="index">
          <strong>M:</strong> {{ mistake }} <br>
          <strong>C:</strong> {{ writingStyleCorrections[index] }} <br>
          <strong>E:</strong> {{ writingStyleExplanations[index] }}
        </li>
      </ul>
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
</style>
