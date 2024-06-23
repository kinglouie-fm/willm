<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import axios from 'axios';

const isSidebarOpen = ref(false);
const textareaSmall = ref('Introduction');
const textareaBig = ref("Mastering writing present a significant challenge for learners, despite occasional oversight regarding the critical role of writing proficiency for students. In particular, achiving proficiency in academic writing, which is one of the most important genres of writing, proves difficult for many due to it's complexity and the necessity for engaging in both critical thinking and high-quality writing techniques.");
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

const toggleSidebar = () => {
  if (!isSidebarOpen.value) {
    isSidebarOpen.value = true;
  }
};

const handleCorrect = async () => {
  const textToCorrect = textareaBig.value;
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
            <textarea v-model="textareaBig" class="form-control textarea-big" placeholder="Enter writing..."
              required></textarea>
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
      <h4>Explanations</h4>
      <ul>
        <li v-for="explanation in explanations" :key="explanation">{{ explanation }}</li>
      </ul>
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

input {
  border: 1px solid #c5c5c5;
  color: #838383;
}
</style>
