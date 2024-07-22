<script setup>
import Scores from './Scores.vue';
import Correction from './Correction.vue';

const props = defineProps({
    scores: Object,
    furtherCorrectionData: Object
});
</script>

<template>
    <div>
        <Scores :scores="props.scores" class="mb-3" />
        <Correction :furtherCorrectionData="props.furtherCorrectionData" />
    </div>
</template>
