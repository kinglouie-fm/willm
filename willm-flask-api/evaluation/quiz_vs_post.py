import json
import numpy as np # type: ignore
import scipy.stats as stats # type: ignore

# Load the submission count data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_quiz_counts.json', 'r') as quiz_file:
    user_quiz_data = json.load(quiz_file)

# Load the post-test scores data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as scores_file:
    post_test_data = json.load(scores_file)

# Function to compute the median score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.median(scores) if scores else None

# Initialize variables to hold quiz counts and post-test scores for each writing element
quiz_counts = []
post_test_scores = {
    "grammar": [],
    "vocabulary": [],
    "organization": [],
    "coherence": [],
    "writing_style": []
}

# Aggregate data: for each user, store their number of quizzes and post-test scores
for user, data in user_quiz_data.items():
    # Ensure the user exists in both the quiz data and post-test data
    if user in post_test_data:
        quiz_count = data['num_quizzes']
        quiz_counts.append(quiz_count)
        
        # Aggregate post-test scores for each element
        submissions = post_test_data[user]
        for element in post_test_scores:
            aggregated_score = aggregate_scores(submissions, element)
            if aggregated_score is not None:
                post_test_scores[element].append(aggregated_score)


# Function to compute normality of the data using Shapiro-Wilk Test
def check_normality(scores):
    alpha = 0.05  # significance level
    stat, p_value = stats.shapiro(scores)
    return p_value > alpha  # True if normally distributed

# Perform correlation analysis for each writing element
correlation_results = {}

for element, scores in post_test_scores.items():
    # Check if post-test scores are normally distributed
    is_normal = check_normality(scores)
    
    if is_normal:
        # If normally distributed, perform Pearson correlation
        corr_stat, corr_p_value = stats.pearsonr(quiz_counts, scores)
        test_name = "Pearson"
    else:
        # If not normally distributed, perform Kendall's Tau correlation
        corr_stat, corr_p_value = stats.kendalltau(quiz_counts, scores)
        test_name = "Kendall's Tau"
    
    # Store the result in a dictionary
    correlation_results[element] = {
        "test": test_name,
        "correlation_statistic": corr_stat,
        "p_value": corr_p_value
    }
    
    # Print the result
    print(f"{element.capitalize()} - {test_name} correlation: {corr_stat:.4f}, p-value: {corr_p_value:.4f}")