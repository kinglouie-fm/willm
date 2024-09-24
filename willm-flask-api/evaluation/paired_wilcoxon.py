import json
import numpy as np # type: ignore
import scipy.stats as stats # type: ignore

# Load pre-test and post-test data from JSON files
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Load normality results from the JSON file
with open('/Users/benthillen/Downloads/mongo/evaluation/normality_results.json', 'r') as norm_file:
    normality_results = json.load(norm_file)

# Initialize empty lists for writing elements for all users
pre_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
post_scores = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Function to compute the mean or average score across multiple submissions
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

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

# Initialize empty list to store differences between pre and post scores
score_differences = {element: [] for element in pre_scores}

# Calculate the differences between pre- and post-test scores
for element in pre_scores:
    for i in range(len(pre_scores[element])):
        difference = post_scores[element][i] - pre_scores[element][i]
        score_differences[element].append(difference)

# Perform the appropriate test (Paired t-test or Wilcoxon) based on the normality of the differences
test_results = {}
improvement_decline_summary = {}

for element in score_differences:
    differences = score_differences[element]
    mean_diff = np.mean(differences)
    sd_diff = np.std(differences, ddof=1)  # Sample standard deviation

    if normality_results[element]["normal"]:  # Use the normality results of the differences
        # Paired t-test
        t_stat, t_p = stats.ttest_rel(pre_scores[element], post_scores[element])
        d = mean_diff / sd_diff if sd_diff != 0 else np.nan  # Cohen's d
        test_results[element] = {"test": "Paired t-test", "p_value": t_p, "cohens_d": d}
        print(f"{element.capitalize()} - Paired t-test t-value: {t_stat}, p-value: {t_p}, Cohen's d: {d}")
    else:
        # Wilcoxon signed-rank test
        w_stat, w_p = stats.wilcoxon(pre_scores[element], post_scores[element])
        test_results[element] = {"test": "Wilcoxon signed-rank test", "p_value": w_p}
        print(f"{element.capitalize()} - Wilcoxon signed-rank test w-value: {w_stat}, p-value: {w_p}")

# Save test results and improvement/decline summary to files
with open('/Users/benthillen/Downloads/mongo/evaluation/test_results.json', 'w') as outfile:
    json.dump(test_results, outfile, indent=4)

with open('/Users/benthillen/Downloads/mongo/evaluation/improvement_decline_summary.json', 'w') as summary_file:
    json.dump(improvement_decline_summary, summary_file, indent=4)
