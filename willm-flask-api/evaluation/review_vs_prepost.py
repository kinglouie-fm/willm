import json
import numpy as np # type: ignore
from collections import defaultdict # type: ignore
import scipy.stats as stats # type: ignore

# List of excluded usernames
excluded_usernames = [
    'thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme',
    'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas'
]

# Function to map user_id to username
def map_user_ids_to_usernames(users_data):
    user_id_to_username = {}
    for user in users_data:
        user_id = user['_id']
        username = user.get('username')
        if username not in excluded_usernames:
            user_id_to_username[user_id] = username
    return user_id_to_username

# Function to compute the mean score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

# Load necessary JSON files
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/reviews.json', 'r') as reviews_file:
    reviews_data = json.load(reviews_file)

# Map user IDs to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Dictionary to count the number of reviews per user
user_review_counts = defaultdict(int)

# Count the number of reviews for each user
for review in reviews_data:
    user_id = review['user_id']['$oid']
    
    # Get the username for the user_id and skip excluded users
    username = user_id_to_username.get(user_id)
    if not username:
        continue  # Skip excluded users or those without a matching username
    
    # Increment the review count for the user
    user_review_counts[username] += 1

# Initialize variables for storing pre-post test differences and review counts for each user
review_counts = []
score_differences = {
    "grammar": [],
    "vocabulary": [],
    "organization": [],
    "coherence": [],
    "writing_style": []
}
num_users_used = 0

# Compute the pre-post test score differences and store review counts
for username in user_review_counts:
    if username in pre_test_data and username in post_test_data:
        num_users_used += 1
        review_counts.append(user_review_counts[username])
        
        for element in score_differences:
            pre_aggregated_score = aggregate_scores(pre_test_data[username], element)
            post_aggregated_score = aggregate_scores(post_test_data[username], element)
            
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                score_difference = post_aggregated_score - pre_aggregated_score
                score_differences[element].append(score_difference)

# Function to perform Shapiro-Wilk test to check normality
def check_normality(data):
    if len(data) > 2:  # Shapiro-Wilk test requires at least 3 data points
        stat, p_value = stats.shapiro(data)
        return p_value > 0.05  # Return True if normal, False if not normal
    return False  # Not enough data to test normality

# Perform correlation analysis (Pearson or Kendall's Tau) based on normality of differences
correlation_results = {}

print(num_users_used)

for element, differences in score_differences.items():
    # Check normality of score differences
    is_normal = check_normality(differences)
    
    if is_normal:
        # Use Pearson correlation if the differences are normally distributed
        corr_stat, corr_p_value = stats.pearsonr(review_counts, differences)
        test_name = "Pearson"
    else:
        # Use Kendall's Tau correlation if the differences are not normally distributed
        corr_stat, corr_p_value = stats.kendalltau(review_counts, differences)
        test_name = "Kendall's Tau"
    
    # Store the result
    correlation_results[element] = {
        "test": test_name,
        "correlation_statistic": corr_stat,
        "p_value": corr_p_value
    }
    
    # Print the result
    print(f"{element.capitalize()} - {test_name} correlation: {corr_stat:.4f}, p-value: {corr_p_value:.4f}")
