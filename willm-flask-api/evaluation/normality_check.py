import json
import numpy as np  # type: ignore
import scipy.stats as stats  # type: ignore

# Function to convert NumPy types to Python native types
def convert_to_native_types(data):
    if isinstance(data, np.generic):
        return data.item()
    if isinstance(data, dict):
        return {key: convert_to_native_types(value) for key, value in data.items()}
    if isinstance(data, list):
        return [convert_to_native_types(item) for item in data]
    return data

# Function to compute the median score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.median(scores) if scores else None

# Load pre-test and post-test data from JSON files
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Initialize empty lists for writing elements for all users
pre_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
post_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Extract pre-test scores and handle multiple submissions for each user
for user, submissions in pre_test_data.items():
    for element in pre_scores:
        aggregated_score = aggregate_scores(submissions, element)
        if aggregated_score is not None:
            pre_scores[element].append(aggregated_score)

# Extract post-test scores and handle multiple submissions for each user
for user, submissions in post_test_data.items():
    for element in post_scores:
        aggregated_score = aggregate_scores(submissions, element)
        if aggregated_score is not None:
            post_scores[element].append(aggregated_score)

# Shapiro-Wilk Test for normality
alpha = 0.05
normality_results = {}

for element in pre_scores:
    pre_stat, pre_p = stats.shapiro(pre_scores[element])
    post_stat, post_p = stats.shapiro(post_scores[element])

    normality_results[element] = {
        "pre_test_normal": pre_p > alpha,
        "post_test_normal": post_p > alpha,
        "pre_p_value": pre_p,
        "post_p_value": post_p
    }

    print(f"{element.capitalize()} - Pre-test Shapiro-Wilk p-value: {pre_p}, Post-test Shapiro-Wilk p-value: {post_p}")

# Convert NumPy types to native Python types
normality_results = convert_to_native_types(normality_results)

# Save normality results to a JSON file
with open('/Users/benthillen/Downloads/mongo/evaluation/normality_results.json', 'w') as outfile:
    json.dump(normality_results, outfile, indent=4)
