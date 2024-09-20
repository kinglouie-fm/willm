import json
import numpy as np  # type: ignore
import scipy.stats as stats  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import seaborn as sns  # type: ignore
from scipy.stats import norm, probplot  # type: ignore

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

# Function to calculate descriptive statistics (mean, median, std deviation)
def calculate_descriptive_stats(data, element):
    stats_summary = {
        "mean": np.mean(data),
        "median": np.median(data),
        "std_dev": np.std(data)
    }
    print(f"{element.capitalize()} Descriptive Statistics:")
    print(f"Mean: {stats_summary['mean']:.2f}, Median: {stats_summary['median']:.2f}, "
          f"Std Dev: {stats_summary['std_dev']:.2f}")
    return stats_summary

# Load pre-test and post-test data from JSON files
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Initialize empty dictionaries for storing pre-test and post-test scores for each writing element
pre_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
post_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Extract pre-test and post-test scores and compute the differences for each user
for user, submissions in pre_test_data.items():
    if user in post_test_data:  # Ensure user exists in both datasets
        for element in pre_scores:
            pre_aggregated_score = aggregate_scores(submissions, element)
            post_aggregated_score = aggregate_scores(post_test_data[user], element)
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                pre_scores[element].append(pre_aggregated_score)
                post_scores[element].append(post_aggregated_score)

# Calculate descriptive statistics for pre-test and post-test scores for each element
pre_test_stats = {}
post_test_stats = {}

for element in pre_scores:
    if len(pre_scores[element]) > 0:
        print(f"\n{element.capitalize()} - Pre-Test")
        pre_test_stats[element] = calculate_descriptive_stats(pre_scores[element], element)
        
    if len(post_scores[element]) > 0:
        print(f"\n{element.capitalize()} - Post-Test")
        post_test_stats[element] = calculate_descriptive_stats(post_scores[element], element)

# Save descriptive statistics results to a JSON file (optional)
with open('/Users/benthillen/Downloads/mongo/evaluation/descriptive_stats_pre_post.json', 'w') as outfile:
    json.dump({"pre_test": pre_test_stats, "post_test": post_test_stats}, outfile, indent=4)