<script setup>
import Scores from './Scores.vue';
import Correction from './Correction.vue';

const props = defineProps({
    scores: Object,
    furtherCorrectionData: Object,
    unhighlightedMistakes: Array,
    unhighlightedCorrections: Array,
    unhighlightedExplanations: Array
});
</script>

<template>
    <div>
        <Scores :scores="props.scores" class="mb-3" />
        <Correction :furtherCorrectionData="props.furtherCorrectionData" :unhighlightedMistakes="unhighlightedMistakes"
            :unhighlightedCorrections="unhighlightedCorrections"
            :unhighlightedExplanations="unhighlightedExplanations" />
    </div>
</template>
