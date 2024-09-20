import json
import numpy as np
import scipy.stats as stats

# Load the submission count data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_submission_counts.json', 'r') as submission_file:
    submission_counts = json.load(submission_file)

# Load the post-test scores data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as scores_file:
    post_test_scores = json.load(scores_file)

# Function to compute the median score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.median(scores) if scores else None

# Initialize empty lists to store user data for correlations
vocabulary_scores = []
coherence_scores = []
writing_style_scores = []
grammar_scores = []
organization_scores = []
submission_counts_list = []

# Extract scores and number of submissions for each user
for user, submission_count in submission_counts.items():
    if user in post_test_scores:  # Ensure the user exists in both datasets
        submission_counts_list.append(submission_count)
        
        # Extract and aggregate the post-test scores for each element
        vocabulary_scores.append(aggregate_scores(post_test_scores[user], "vocabulary"))
        coherence_scores.append(aggregate_scores(post_test_scores[user], "coherence"))
        writing_style_scores.append(aggregate_scores(post_test_scores[user], "writing_style"))
        grammar_scores.append(aggregate_scores(post_test_scores[user], "grammar"))
        organization_scores.append(aggregate_scores(post_test_scores[user], "organization"))

# Convert lists to numpy arrays
submission_counts_array = np.array(submission_counts_list)

# Perform Pearson correlation for vocabulary, coherence, and writing style
for element, scores in zip(["vocabulary", "coherence", "writing_style"], 
                           [vocabulary_scores, coherence_scores, writing_style_scores]):
    pearson_corr, pearson_p = stats.pearsonr(submission_counts_array, scores)
    print(f"{element.capitalize()} - Pearson correlation: {pearson_corr:.4f}, p-value: {pearson_p:.4f}")

# Perform Kendall's Tau correlation for grammar and organization (non-parametric)
for element, scores in zip(["grammar", "organization"], [grammar_scores, organization_scores]):
    kendall_corr, kendall_p = stats.kendalltau(submission_counts_array, scores)
    print(f"{element.capitalize()} - Kendall's Tau correlation: {kendall_corr:.4f}, p-value: {kendall_p:.4f}")
