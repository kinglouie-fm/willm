<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import axios from 'axios';

const isSidebarOpen = ref(false);
const textareaSmall = ref('');
const textareaBig = ref('');

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const handleCorrect = async () => {
  toggleSidebar();
  const textToCorrect = textareaBig.value;
  try {
    const response = await axios.post('http://localhost:3000/correct', {
      text: textToCorrect,
    });
    console.log(response.data); // Handle the response as needed
  } catch (error) {
    console.error('Error correcting text:', error);
  }
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
    <Sidebar :isOpen="isSidebarOpen" @close="toggleSidebar" />
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
