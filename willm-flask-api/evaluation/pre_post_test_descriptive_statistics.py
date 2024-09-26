import json
import numpy as np  # type: ignore
import scipy.stats as stats  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import seaborn as sns  # type: ignore
from scipy.stats import norm, probplot  # type: ignore

# Function to compute the mean score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

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
improvement_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Extract pre-test and post-test scores and compute the differences for each user
for user, submissions in pre_test_data.items():
    if user in post_test_data:  # Ensure user exists in both datasets
        for element in pre_scores:
            pre_aggregated_score = aggregate_scores(submissions, element)
            post_aggregated_score = aggregate_scores(post_test_data[user], element)
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                pre_scores[element].append(pre_aggregated_score)
                post_scores[element].append(post_aggregated_score)
                improvement_scores[element].append(post_aggregated_score - pre_aggregated_score)

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

# Convert the improvement scores to a format suitable for plotting
improvement_data = []
rubric_elements = []

for element in improvement_scores:
    improvement_data.extend(improvement_scores[element])
    rubric_elements.extend([element] * len(improvement_scores[element]))

# Create a DataFrame for plotting
import pandas as pd  # type: ignore
df_improvement = pd.DataFrame({
    'Improvement Score': improvement_data,
    'Rubric Element': rubric_elements
})

# Create violin plots with improvement scores and rubric elements
# plt.figure(figsize=(10, 6))
# sns.violinplot(x="Rubric Element", y="Improvement Score", data=df_improvement, inner="quartile", density_norm='width')
# plt.title('Improvement Scores Across Rubric Elements (Post-Test - Pre-Test)')
# plt.tight_layout()
# plt.show()

# Save descriptive statistics results to a JSON file (optional)
with open('/Users/benthillen/Downloads/mongo/evaluation/descriptive_stats_pre_post.json', 'w') as outfile:
    json.dump({"pre_test": pre_test_stats, "post_test": post_test_stats}, outfile, indent=4)
