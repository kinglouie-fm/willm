import json
import numpy as np  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import scipy.stats as stats  # type: ignore
from tabulate import tabulate # type: ignore

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

# Extract submission counts and calculate quartiles to split into low, medium, high groups
submission_counts_list = [v for k, v in submission_counts.items()]
lower_quartile = np.percentile(submission_counts_list, 25)
upper_quartile = np.percentile(submission_counts_list, 75)

# Split users into low, medium, and high submission groups based on quartiles
high_submission_users = []
medium_submission_users = []
low_submission_users = []

for username, count in submission_counts.items():
    if count >= upper_quartile:
        high_submission_users.append(username)
    elif lower_quartile <= count < upper_quartile:
        medium_submission_users.append(username)
    else:
        low_submission_users.append(username)

# Initialize lists for storing test score differences (post-test - pre-test) for each group
high_submission_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
medium_submission_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
low_submission_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Compute the test score differences for each user and assign them to the appropriate group
for username in submission_counts:
    if username in pre_test_scores and username in post_test_scores:
        for element in high_submission_differences:
            pre_aggregated_score = aggregate_scores(pre_test_scores[username], element)
            post_aggregated_score = aggregate_scores(post_test_scores[username], element)
            
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                score_difference = post_aggregated_score - pre_aggregated_score
                
                # Assign to the appropriate group
                if username in high_submission_users:
                    high_submission_differences[element].append(score_difference)
                elif username in medium_submission_users:
                    medium_submission_differences[element].append(score_difference)
                else:
                    low_submission_differences[element].append(score_difference)

# Function to check normality using Shapiro-Wilk Test
def check_normality(data):
    if len(data) > 2:  # Shapiro-Wilk test requires at least 3 data points
        stat, p_value = stats.shapiro(data)
        return p_value > 0.05  # Return True if normal, False if not normal
    return False  # Not enough data to test normality

# Function to compute ANOVA SS and df
def calculate_anova(group1, group2, group3):
    # Combine all data
    all_data = np.array(group1 + group2 + group3)
    
    # Calculate means
    grand_mean = np.mean(all_data)
    group1_mean = np.mean(group1)
    group2_mean = np.mean(group2)
    group3_mean = np.mean(group3)
    
    # Sum of squares between (SSB)
    SSB = len(group1) * (group1_mean - grand_mean) ** 2 + \
          len(group2) * (group2_mean - grand_mean) ** 2 + \
          len(group3) * (group3_mean - grand_mean) ** 2
    
    # Sum of squares within (SSW)
    SSW = sum((x - group1_mean) ** 2 for x in group1) + \
          sum((x - group2_mean) ** 2 for x in group2) + \
          sum((x - group3_mean) ** 2 for x in group3)
    
    # Degrees of freedom
    df_between = 2  # 3 groups, so df_between = 3 - 1 = 2
    df_within = len(group1) + len(group2) + len(group3) - 3  # Total observations - number of groups
    
    # Mean squares
    MSB = SSB / df_between
    MSW = SSW / df_within
    
    # F-statistic
    F = MSB / MSW
    
    return SSB, SSW, df_between, df_within, F

def check_homogeneity(group1, group2, group3):
    stat, p_value = stats.levene(group1, group2, group3)
    return p_value > 0.05

# Store results to print in table format later
results_table = []

# Perform ANOVA or Kruskal-Wallis H Test based on normality across groups
for element in high_submission_differences:
    high_group = high_submission_differences[element]
    medium_group = medium_submission_differences[element]
    low_group = low_submission_differences[element]

    # Ensure all groups have sufficient data for the test
    if len(high_group) > 1 and len(medium_group) > 1 and len(low_group) > 1:
        # Check for normality in all groups
        high_group_normal = check_normality(high_group)
        medium_group_normal = check_normality(medium_group)
        low_group_normal = check_normality(low_group)

        # Check for homogeneity of variances
        homogeneity = check_homogeneity(high_group, medium_group, low_group)
        
        if high_group_normal and medium_group_normal and low_group_normal and homogeneity:
            # Perform ANOVA with SS and df
            print(f"Performing ANOVA for {element.capitalize()}")
            SSB, SSW, df_between, df_within, F_stat = calculate_anova(high_group, medium_group, low_group)
            p_value = stats.f_oneway(high_group, medium_group, low_group)[1]
            results_table.append([element.capitalize(), SSB, SSW, df_between, df_within, F_stat, p_value])
        else:
            # Non-normal distribution, use Kruskal-Wallis H test
            print(f"Performing Kruskal-Wallis H Test for {element.capitalize()}")
            h_stat, p_value = stats.kruskal(high_group, medium_group, low_group)
            results_table.append([element.capitalize(), "-", "-", "-", "-", h_stat, p_value])
    else:
        results_table.append([element.capitalize(), "Not enough data", "-", "-", "-", "-", "-"])

# Print results in a table format using tabulate
headers = ["Element", "SSB", "SSW", "df_between", "df_within", "F-statistic/H-stat", "p-value"]
print("\nANOVA/Kruskal-Wallis Results:")
print(tabulate(results_table, headers, floatfmt=".4f"))
