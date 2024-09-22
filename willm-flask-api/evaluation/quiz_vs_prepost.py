import json
import numpy as np # type: ignore
import scipy.stats as stats # type: ignore

# Load the quiz counts data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_quiz_counts.json', 'r') as quiz_file:
    user_quiz_data = json.load(quiz_file)

# Load the pre-test scores data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

# Load the post-test scores data
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Function to compute the mean score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

# Initialize variables to hold quiz counts and pre-post test differences for each writing element
quiz_counts = []
score_differences = {
    "grammar": [],
    "vocabulary": [],
    "organization": [],
    "coherence": [],
    "writing_style": []
}

# Aggregate data: for each user, store their number of quizzes and pre-post score differences
for user, data in user_quiz_data.items():
    # Ensure the user exists in both the quiz data, pre-test data, and post-test data
    if user in pre_test_data and user in post_test_data:
        quiz_count = data['num_quizzes']
        quiz_counts.append(quiz_count)
        
        # Calculate pre-post test score differences for each element
        pre_submissions = pre_test_data[user]
        post_submissions = post_test_data[user]
        
        for element in score_differences:
            pre_score = aggregate_scores(pre_submissions, element)
            post_score = aggregate_scores(post_submissions, element)
            
            # Ensure both pre and post scores are available
            if pre_score is not None and post_score is not None:
                score_differences[element].append(post_score - pre_score)

# Function to compute normality of the data using Shapiro-Wilk Test
def check_normality(scores):
    alpha = 0.05  # significance level
    stat, p_value = stats.shapiro(scores)
    return p_value > alpha  # True if normally distributed

# Perform correlation analysis for each writing element
correlation_results = {}

for element, differences in score_differences.items():
    # Check if the pre-post differences are normally distributed
    is_normal = check_normality(differences)
    
    if is_normal:
        # If normally distributed, perform Pearson correlation
        corr_stat, corr_p_value = stats.pearsonr(quiz_counts, differences)
        test_name = "Pearson"
    else:
        # If not normally distributed, perform Kendall's Tau correlation
        corr_stat, corr_p_value = stats.kendalltau(quiz_counts, differences)
        test_name = "Kendall's Tau"
    
    # Store the result in a dictionary
    correlation_results[element] = {
        "test": test_name,
        "correlation_statistic": corr_stat,
        "p_value": corr_p_value
    }
    
    # Print the result
    print(f"{element.capitalize()} - {test_name} correlation: {corr_stat:.4f}, p-value: {corr_p_value:.4f}")
