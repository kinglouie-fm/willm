<script setup>
</script>

<template>
  <div class="container-fluid h-100 mt-5">
    <div class="row h-50">
      <!-- Upper Left -->
      <div class="col-6 d-flex justify-content-center align-items-center">
        <textarea class="form-control textarea-custom mx-5" placeholder="Enter writing..."></textarea>
      </div>
    </div>
    <div class="row h-50 mt-5">
      <!-- Lower Left -->
      <div class="col-6">
        <div class="mx-5">
          <button type="button" class="btn btn-md">Correct</button>
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

.textarea-custom {
  height: 300px;
  word-wrap: break-word;
  overflow: auto;
  resize: none;
  line-height: 1.5rem;
  font-size: 1.1rem;
}

input {
  border: 1px solid #c5c5c5
}

.paraphrase-p {
  white-space: nowrap;
}

.textarea-custom-prompt {
  word-wrap: break-word;
  overflow: auto;
  resize: none;
  color: #c5c5c5;
}

input {
  color: #838383;
}

.slider {
  width: 300px;
}
</style>
