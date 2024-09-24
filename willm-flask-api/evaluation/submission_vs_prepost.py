import json
import numpy as np # type: ignore
import scipy.stats as stats # type: ignore
import matplotlib.pyplot as plt # type: ignore

# Load the submission count data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_submission_counts.json', 'r') as submission_file:
    submission_counts = json.load(submission_file)

# Load the pre-test scores data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_scores = json.load(pre_file)

# Load the post-test scores data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_scores = json.load(post_file)

# Function to compute the mean score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

# Initialize empty lists to store differences and submission counts
vocabulary_differences = []
coherence_differences = []
writing_style_differences = []
grammar_differences = []
organization_differences = []
submission_counts_list = []

# Extract scores, calculate differences, and track the number of submissions for each user
for user, submission_count in submission_counts.items():
    if user in pre_test_scores and user in post_test_scores:  # Ensure the user exists in both datasets
        submission_counts_list.append(submission_count)
        
        # Calculate the pre-post difference for each writing element using the mean of multiple submissions
        grammar_diff = aggregate_scores(post_test_scores[user], "grammar") - aggregate_scores(pre_test_scores[user], "grammar")
        vocabulary_diff = aggregate_scores(post_test_scores[user], "vocabulary") - aggregate_scores(pre_test_scores[user], "vocabulary")
        organization_diff = aggregate_scores(post_test_scores[user], "organization") - aggregate_scores(pre_test_scores[user], "organization")
        coherence_diff = aggregate_scores(post_test_scores[user], "coherence") - aggregate_scores(pre_test_scores[user], "coherence")
        writing_style_diff = aggregate_scores(post_test_scores[user], "writing_style") - aggregate_scores(pre_test_scores[user], "writing_style")
        
        # Append the differences to their respective lists
        grammar_differences.append(grammar_diff)
        vocabulary_differences.append(vocabulary_diff)
        organization_differences.append(organization_diff)
        coherence_differences.append(coherence_diff)
        writing_style_differences.append(writing_style_diff)

# Convert lists to numpy arrays
submission_counts_array = np.array(submission_counts_list)

# Create a dictionary to store normality results
normality_results = {}

# Perform the Shapiro-Wilk test for normality on the pre-post test score differences
for element, differences in zip(
    ["grammar", "vocabulary", "organization", "coherence", "writing_style"], 
    [grammar_differences, vocabulary_differences, organization_differences, coherence_differences, writing_style_differences]
):
    # Only perform Shapiro-Wilk test if there are more than 3 differences (Shapiro requires at least 3 data points)
    if len(differences) > 2:
        shapiro_stat, shapiro_p = stats.shapiro(differences)
        normality_results[element] = {"normal": shapiro_p > 0.05, "p_value": shapiro_p}
        print(f"{element.capitalize()} - Shapiro-Wilk p-value: {shapiro_p:.4f}")
    else:
        normality_results[element] = {"normal": None, "p_value": None}
        print(f"{element.capitalize()} - Not enough data for normality test")

# Function to create scatter plots for linearity check
def plot_scatter(submission_counts, score_differences, element):
    plt.figure(figsize=(8, 6))
    plt.scatter(submission_counts, score_differences, alpha=0.7)
    plt.title(f'Submission Counts vs {element.capitalize()} Score Differences')
    plt.xlabel('Submission Counts (Engagement)')
    plt.ylabel(f'{element.capitalize()} Pre-Post Score Differences')
    plt.grid(True)
    plt.show()

# Perform Pearson or Kendall's Tau based on the normality test result
for element, differences in zip(
    ["grammar", "vocabulary", "organization", "coherence", "writing_style"], 
    [grammar_differences, vocabulary_differences, organization_differences, coherence_differences, writing_style_differences]
):
    # Plot the scatter plot to check for linearity
    plot_scatter(submission_counts_list, differences, element)
    
    if normality_results[element]["normal"] == True:
        # Use Pearson correlation if the data is normally distributed
        pearson_corr, pearson_p = stats.pearsonr(submission_counts_array, differences)
        print(f"{element.capitalize()} - Pearson correlation: {pearson_corr:.4f}, p-value: {pearson_p:.4f}")
    elif normality_results[element]["normal"] == False:
        # Use Kendall's Tau correlation if the data is not normally distributed
        kendall_corr, kendall_p = stats.kendalltau(submission_counts_array, differences)
        print(f"{element.capitalize()} - Kendall's Tau correlation: {kendall_corr:.4f}, p-value: {kendall_p:.4f}")
    else:
        print(f"{element.capitalize()} - No valid test could be performed due to insufficient data.")
