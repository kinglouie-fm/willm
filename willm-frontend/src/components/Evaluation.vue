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
        <Scores :scores="props.scores" />
        <Correction :furtherCorrectionData="props.furtherCorrectionData" />
    </div>
</template>
