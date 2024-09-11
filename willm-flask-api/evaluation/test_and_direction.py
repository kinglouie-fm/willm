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

# Function to compute the median or average score across multiple submissions
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.median(scores) if scores else None

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

# Perform the appropriate test (Paired t-test or Wilcoxon) based on normality
test_results = {}
improvement_decline_summary = {}

for element in pre_scores:
    if normality_results[element]["pre_test_normal"] and normality_results[element]["post_test_normal"]:
        # Paired t-test
        t_stat, t_p = stats.ttest_rel(pre_scores[element], post_scores[element])
        test_results[element] = {"test": "Paired t-test", "p_value": t_p}
        print(f"{element.capitalize()} - Paired t-test p-value: {t_p}")
    else:
        # Wilcoxon signed-rank test
        w_stat, w_p = stats.wilcoxon(pre_scores[element], post_scores[element])
        test_results[element] = {"test": "Wilcoxon signed-rank test", "p_value": w_p}
        print(f"{element.capitalize()} - Wilcoxon signed-rank test p-value: {w_p}")

        # Calculate rank-biserial correlation (effect size)
        differences = np.array(post_scores[element]) - np.array(pre_scores[element])
        ranks = stats.rankdata(differences)
        # Implicitly ignoring zero differences
        positive_ranks = ranks[differences > 0].sum()
        negative_ranks = ranks[differences < 0].sum()
        total_ranks = positive_ranks + negative_ranks 
        if total_ranks > 0:
            r_biserial = (positive_ranks - negative_ranks) / total_ranks
            test_results[element]["rank_biserial_correlation"] = r_biserial
            print(f"{element.capitalize()} - Rank-biserial correlation: {r_biserial}")
        else:
            test_results[element]["rank_biserial_correlation"] = None

    # Calculate median difference and check if it's an improvement or decline
    median_difference = np.median(differences)

    # Interpret the median difference
    if median_difference > 0:
        improvement_decline_summary[element] = {
            "change": "Improvement",
            "median_difference": median_difference
        }
        print(f"{element.capitalize()}: Improvement (Median difference: {median_difference})")
    elif median_difference < 0:
        improvement_decline_summary[element] = {
            "change": "Decline",
            "median_difference": median_difference
        }
        print(f"{element.capitalize()}: Decline (Median difference: {median_difference})")
    else:
        improvement_decline_summary[element] = {
            "change": "No significant change",
            "median_difference": median_difference
        }
        print(f"{element.capitalize()}: No significant change (Median difference: {median_difference})")

# Save test results and improvement/decline summary to files
with open('/Users/benthillen/Downloads/mongo/evaluation/test_results.json', 'w') as outfile:
    json.dump(test_results, outfile, indent=4)

with open('/Users/benthillen/Downloads/mongo/evaluation/improvement_decline_summary.json', 'w') as summary_file:
    json.dump(improvement_decline_summary, summary_file, indent=4)
