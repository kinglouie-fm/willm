import json
import numpy as np # type: ignore
import matplotlib.pyplot as plt # type: ignore
import seaborn as sns # type: ignore
import scipy.stats as stats # type: ignore

# Load pre-test and post-test data from JSON files
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Initialize empty lists for writing elements for all users
pre_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
post_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Function to compute the median score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.median(scores) if scores else None

# Extract pre-test and post-test scores and handle multiple submissions for each user
for user, submissions in pre_test_data.items():
    for element in pre_scores:
        aggregated_score = aggregate_scores(submissions, element)
        if aggregated_score is not None:
            pre_scores[element].append(aggregated_score)

for user, submissions in post_test_data.items():
    for element in post_scores:
        aggregated_score = aggregate_scores(submissions, element)
        if aggregated_score is not None:
            post_scores[element].append(aggregated_score)

# Q-Q Plots for Normality Check
# def qq_plot(data, title):
#     plt.figure(figsize=(6, 6))
#     stats.probplot(data, dist="norm", plot=plt)
#     plt.title(f"Q-Q Plot - {title}")
#     plt.grid(True)
#     plt.show()

# for element in pre_scores:
#     qq_plot(pre_scores[element], f'{element.capitalize()} (Pre-Test)')
#     qq_plot(post_scores[element], f'{element.capitalize()} (Post-Test)')

# Boxplots with Jitter (to visualize outliers)
def boxplot_with_jitter(pre, post, element):
    plt.figure(figsize=(8, 6))
    sns.boxplot(data=[pre, post], palette="Set3", showfliers=False)
    sns.stripplot(data=[pre, post], palette="Set1", jitter=True, color='black', size=5)
    plt.xticks([0, 1], ['Pre-Test', 'Post-Test'])
    plt.title(f'{element.capitalize()} - Boxplot with Jitter')
    plt.ylabel('Score')
    plt.show()

for element in pre_scores:
    boxplot_with_jitter(pre_scores[element], post_scores[element], element)

# Paired Line Plot (to show individual improvements/decline)
# def paired_line_plot(pre, post, element):
#     plt.figure(figsize=(8, 6))
#     for i in range(len(pre)):
#         plt.plot([0, 1], [pre[i], post[i]], marker='o', color='grey', alpha=0.5)  # Line between pre and post
#         plt.scatter([0, 1], [pre[i], post[i]], color=['blue', 'red'], zorder=5)
    
#     plt.xticks([0, 1], ['Pre-Test', 'Post-Test'])
#     plt.title(f'{element.capitalize()} - Paired Line Plot')
#     plt.ylabel('Score')
#     plt.grid(True)
#     plt.show()

# for element in pre_scores:
    # paired_line_plot(pre_scores[element], post_scores[element], element)
