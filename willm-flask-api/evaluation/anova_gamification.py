import json
import numpy as np  # type: ignore
import scipy.stats as stats  # type: ignore

# List of excluded usernames
excluded_usernames = [
    'thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme',
    'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas'
]

# Function to map user_id to username and XP
def extract_user_xp(users_data):
    username_to_xp = {}
    for user in users_data:
        username = user.get('username')
        xp = user.get('xp', 0)  # Get XP, default to 0 if not found
        if username not in excluded_usernames:
            username_to_xp[username] = xp
    return username_to_xp

# Load the users data from users.json
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)

# Map usernames to XP values
username_to_xp = extract_user_xp(users_data)

# Extract XP values and sort them
xp_values = list(username_to_xp.values())

# Calculate quartiles to determine thresholds for splitting groups
lower_quartile = np.percentile(xp_values, 25)
median_xp = np.median(xp_values)
upper_quartile = np.percentile(xp_values, 75)

print(f"25th percentile XP: {lower_quartile}")
print(f"Median XP: {median_xp}")
print(f"75th percentile XP: {upper_quartile}")

# Split users into high, medium, and low engagement groups based on XP quartiles
high_engagement_users = []
medium_engagement_users = []
low_engagement_users = []

for username, xp in username_to_xp.items():
    if xp >= upper_quartile:
        high_engagement_users.append(username)
    elif lower_quartile < xp < upper_quartile:
        medium_engagement_users.append(username)
    else:
        low_engagement_users.append(username)

# Load pre-test and post-test scores
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Function to compute the mean score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

# Initialize lists for storing the test score differences (post-test - pre-test) for each group
high_engagement_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
medium_engagement_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
low_engagement_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Compute the test score differences for each user and assign them to the appropriate group
for username in username_to_xp:
    if username in pre_test_data and username in post_test_data:
        for element in high_engagement_differences:
            pre_aggregated_score = aggregate_scores(pre_test_data[username], element)
            post_aggregated_score = aggregate_scores(post_test_data[username], element)
            
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                score_difference = post_aggregated_score - pre_aggregated_score
                
                # Assign to the appropriate engagement group
                if username in high_engagement_users:
                    high_engagement_differences[element].append(score_difference)
                elif username in medium_engagement_users:
                    medium_engagement_differences[element].append(score_difference)
                else:
                    low_engagement_differences[element].append(score_difference)

# Function to check normality using Shapiro-Wilk Test
def check_normality(data):
    if len(data) > 2:  # Shapiro-Wilk test requires at least 3 data points
        stat, p_value = stats.shapiro(data)
        return p_value > 0.05  # Return True if normal, False if not normal
    return False  # Not enough data to test normality

# Perform ANOVA or Kruskal-Wallis H Test based on normality across groups
for element in high_engagement_differences:
    high_group = high_engagement_differences[element]
    medium_group = medium_engagement_differences[element]
    low_group = low_engagement_differences[element]

    # Ensure all groups have sufficient data for the test
    if len(high_group) > 1 and len(medium_group) > 1 and len(low_group) > 1:
        # Check for normality in all groups
        high_group_normal = check_normality(high_group)
        medium_group_normal = check_normality(medium_group)
        low_group_normal = check_normality(low_group)
        
        if high_group_normal and medium_group_normal and low_group_normal:
            # All groups are normal, use ANOVA
            f_stat, p_value = stats.f_oneway(high_group, medium_group, low_group)
            print(f"{element.capitalize()} - ANOVA F-statistic: {f_stat:.4f}, p-value: {p_value:.4f}")
        else:
            # Non-normal distribution, use Kruskal-Wallis H test
            h_stat, p_value = stats.kruskal(high_group, medium_group, low_group)
            print(f"{element.capitalize()} - Kruskal-Wallis H-test statistic: {h_stat:.4f}, p-value: {p_value:.4f}")
    else:
        print(f"{element.capitalize()} - Not enough data for statistical test")
