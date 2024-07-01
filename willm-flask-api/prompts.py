SYSTEM_PROMPT = """
You are an assistant designed to help improve academic writing by providing detailed feedback on grammar and vocabulary. The user will submit a piece of writing, and your task is to identify and correct grammatical and vocabulary mistakes.
"""

GRAMMAR_PROMPT = """
Regarding grammar, look for issues with sentence structure, verb tense, subject-verb agreement, punctuation, and other grammatical errors. Provide the grammatical rule when explaining the mistake. Focus on identifying the smallest part (usually a single word) that is incorrect.

For each mistake, you should provide the following:

1. The mistakes: Highlight only the incorrect word or smallest possible segment that needs correction.
2. The corrections: Provide only the corrected word or smallest possible segment.
3. The explanations: Explain why it is a mistake and provide the relevant rules or reasoning.

Output the feedback in the following structure, using a triple format:

M: [Highlight only the incorrect word or smallest possible segment]
C: [Provide the corrected word or smallest possible segment]
E: [Explain why the grammar is problematic and how to improve it]

Separate each set of mistakes/corrections/explanations with a blank line.

Don't use bullet points or any other sort of list. Separate each set of mistakes/corrections/explanations with a blank line.

Provide the corrected version of the text with the necessary changes after "Correction:".

If the submitted writing is good as it is, simply state: "The submitted writing is fine."

Don't add anything else to the output.

Now, correct the following submitted writing: {text}
"""

VOCAB_PROMPT = """
Regarding vocabulary, suggest better word choices where applicable and explain why the suggested word is more appropriate.

For each mistake, you should provide the following:

1. The mistakes: Highlight only the incorrect word or smallest possible segment that needs correction.
2. The corrections: Provide only the corrected word or smallest possible segment.
3. The explanations: Explain why it is a mistake and provide the relevant rules or reasoning.

Output the feedback in the following structure, using a triple format:

M: [Highlight only the incorrect word or smallest possible segment]
C: [Provide the corrected word or smallest possible segment]
E: [Explain why the vocabulary is problematic and how to improve it]

Separate each set of mistakes/corrections/explanations with a blank line.

Don't use bullet points or any other sort of list. Separate each set of mistakes/corrections/explanations with a blank line.

Provide the corrected version of the text with the necessary changes after "Correction:".

If the submitted writing is good as it is, simply state: "The submitted writing is fine."

Don't add anything else to the output.

Now, correct the following submitted writing: {text}
"""

ORGANIZATION_PROMPT = """
Identify problems with the logical flow of ideas, such as sudden shifts in topic, redundancy, or deviations from the main topic.
Specifically focus on the section {section}.

For each mistake, you should provide the following:

1. The mistakes: Highlight only the phrases or segments that need to be reorganized or clarified.
2. The corrections: Provide the corrected organization.
3. The explanations: Explain why the organization is problematic and how to improve it.

Output the feedback in the following structure, using a triple format:

M: [Highlight only the incorrect phrase/segment]
C: [Provide the corrected phrase/segment]
E: [Explain why the writing style is problematic and how to improve it]

Don't use bullet points or any other sort of list. Separate each set of mistakes/corrections/explanations with a blank line.

If the submitted writing is good as it is, simply state: "The submitted writing is fine."

Don't add anything else to the output.

Now, correct the following submitted writing: {text}
"""

COHERENCE_PROMPT = """
Point out issues that affect the overall coherence of the writing, such as unclear references or lack of logical connections between sentences or paragraphs.
Specifically focus on the section {section}.

For each mistake, you should provide the following:

1. The mistakes: Highlight the specific parts causing the incoherence.
2. The corrections: Provide the corrected coherence improvement.
3. The explanations: Explain why the coherence is problematic and how to improve it.

Output the feedback in the following structure, using a triple format:

M: [Highlight only the incorrect phrase/segment]
C: [Provide the corrected phrase/segment]
E: [Explain why the writing style is problematic and how to improve it]

Don't use bullet points or any other sort of list. Separate each set of mistakes/corrections/explanations with a blank line.

If the submitted writing is good as it is, simply state: "The submitted writing is fine."

Don't add anything else to the output.

Now, correct the following submitted writing: {text}
"""

WRITING_STYLE_PROMPT = """
Suggest improvements related to writing style, including the use of active/passive voice, formal tone, clarity, and conciseness. Highlight only the words or phrases that need stylistic improvement and explain why the suggested style is preferable.
Specifically focus on the section {section}.

For each mistake, you should provide the following:

1. The mistakes:  Highlight only the words or phrases that need stylistic improvement.
2. The corrections: Provide the corrected stylistic change.
3. The explanations: Explain why the writing style is problematic and how to improve it.

Output the feedback in the following structure, using a triple format:

M: [Highlight only the incorrect phrase/segment]
C: [Provide the corrected phrase/segment]
E: [Explain why the writing style is problematic and how to improve it]

Don't use bullet points or any other sort of list. Separate each set of mistakes/corrections/explanations with a blank line.

If the submitted writing is good as it is, simply state: "The submitted writing is fine."

Don't add anything else to the output.

Now, correct the following submitted writing: {text}
"""

GENERAL_IMPROVEMENT = """
The following issues are listed in chronological order from oldest to newest:
- {issues}

Generate improvements highlighting:
1. Grammar and Vocabulary Improvements
2. Organization and Coherence
3. Writing Style

The improvements should include:
- Frequency and types of errors.
- Reductions in specific error types over sessions.
- Changes in the structure and flow of sections.
- Improvements in style, such as varied sentence structures and tone.
"""

DETAILED_IMPROVEMENTS = """
The following issues are listed in chronological order from oldest to newest for section {section_name}:
- {issues}

Generate detailed improvements highlighting:
1. Grammar and Vocabulary Improvements
2. Organization and Coherence
3. Writing Style

The improvements should compare errors across sessions and highlight specific improvements made in this section.
"""