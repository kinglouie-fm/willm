import json
import numpy as np # type: ignore
import scipy.stats as stats # type: ignore

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
        grammar_scores.append(aggregate_scores(post_test_scores[user], "grammar"))
        vocabulary_scores.append(aggregate_scores(post_test_scores[user], "vocabulary"))
        organization_scores.append(aggregate_scores(post_test_scores[user], "organization"))
        coherence_scores.append(aggregate_scores(post_test_scores[user], "coherence"))
        writing_style_scores.append(aggregate_scores(post_test_scores[user], "writing_style"))

# Convert lists to numpy arrays
submission_counts_array = np.array(submission_counts_list)

# Create a dictionary to store normality results
normality_results = {}

# Perform the Shapiro-Wilk test for normality on the post-test scores
for element, scores in zip(["grammar", "vocabulary", "organization", "coherence", "writing_style"], 
                           [grammar_scores, vocabulary_scores, organization_scores, coherence_scores, writing_style_scores, ]):
    
    # Only perform Shapiro-Wilk test if there are more than 3 scores (Shapiro requires at least 3 data points)
    if len(scores) > 2:
        shapiro_stat, shapiro_p = stats.shapiro(scores)
        normality_results[element] = {"normal": shapiro_p > 0.05, "p_value": shapiro_p}
        print(f"{element.capitalize()} - Shapiro-Wilk p-value: {shapiro_p:.4f}")
    else:
        normality_results[element] = {"normal": None, "p_value": None}
        print(f"{element.capitalize()} - Not enough data for normality test")

# Perform Pearson or Kendall's Tau based on the normality test result
for element, scores in zip(["grammar", "vocabulary", "organization", "coherence", "writing_style"], 
                           [grammar_scores, vocabulary_scores, organization_scores, coherence_scores, writing_style_scores, ]):
    
    if normality_results[element]["normal"] is True:
        # Use Pearson correlation if the data is normally distributed
        pearson_corr, pearson_p = stats.pearsonr(submission_counts_array, scores)
        print(f"{element.capitalize()} - Pearson correlation: {pearson_corr:.4f}, p-value: {pearson_p:.4f}")
    elif normality_results[element]["normal"] is False:
        # Use Kendall's Tau correlation if the data is not normally distributed
        kendall_corr, kendall_p = stats.kendalltau(submission_counts_array, scores)
        print(f"{element.capitalize()} - Kendall's Tau correlation: {kendall_corr:.4f}, p-value: {kendall_p:.4f}")
    else:
        print(f"{element.capitalize()} - No valid test could be performed due to insufficient data.")
