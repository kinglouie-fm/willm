import json
import numpy as np  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import scipy.stats as stats  # type: ignore

# Define the list of excluded usernames
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

# Load the users data to map user IDs to usernames
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)
    user_id_to_username = map_user_ids_to_usernames(users_data)

# Load the review data from JSON file
with open('/Users/benthillen/Downloads/mongo/aggregated-data/reviews.json', 'r') as review_file:
    review_data = json.load(review_file)

# Dictionary to hold the review counts using usernames
user_review_counts = {}

# Calculate the review count for each user using their username
for review in review_data:
    user_id = review['user_id']['$oid']
    
    # Get the username for the user_id
    username = user_id_to_username.get(user_id)
    
    if not username:
        continue  # Skip if no matching username

    if username not in user_review_counts:
        user_review_counts[username] = 0
    user_review_counts[username] += 1

# Get the review counts for all users
review_counts = list(user_review_counts.values())

# Calculate quartiles to determine thresholds for splitting groups
lower_quartile = np.percentile(review_counts, 25)
median_review_count = np.median(review_counts)
upper_quartile = np.percentile(review_counts, 75)

print(f"25th percentile: {lower_quartile:.2f}")
print(f"Median review count: {median_review_count:.2f}")
print(f"75th percentile: {upper_quartile:.2f}")

# Split users into high, medium, and low review groups based on quartiles
high_review_users = []
medium_review_users = []
low_review_users = []

for username, count in user_review_counts.items():
    if count >= upper_quartile:
        high_review_users.append(username)
    elif lower_quartile >= count:
        low_review_users.append(username)
    else:
        medium_review_users.append(username)

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
high_review_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
medium_review_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
low_review_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Compute the test score differences for each user and assign them to the appropriate group
for username in user_review_counts:
    if username in pre_test_data and username in post_test_data:
        for element in high_review_differences:
            pre_aggregated_score = aggregate_scores(pre_test_data[username], element)
            post_aggregated_score = aggregate_scores(post_test_data[username], element)
            
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                score_difference = post_aggregated_score - pre_aggregated_score
                
                # Assign to the appropriate group
                if username in high_review_users:
                    high_review_differences[element].append(score_difference)
                elif username in medium_review_users:
                    medium_review_differences[element].append(score_difference)
                else:
                    low_review_differences[element].append(score_difference)

# Function to check normality using Shapiro-Wilk Test
def check_normality(data):
    if len(data) > 2:  # Shapiro-Wilk test requires at least 3 data points
        stat, p_value = stats.shapiro(data)
        return p_value > 0.05  # Return True if normal, False if not normal
    return False  # Not enough data to test normality

# Function to calculate eta squared
def eta_squared_between_groups(ss_between, ss_total):
    return ss_between / ss_total

# Perform ANOVA or Kruskal-Wallis H Test based on normality across groups
for element in high_review_differences:
    high_group = high_review_differences[element]
    medium_group = medium_review_differences[element]
    low_group = low_review_differences[element]

    # Ensure all groups have sufficient data for the test
    if len(high_group) > 1 and len(medium_group) > 1 and len(low_group) > 1:
        # Check for normality in all groups
        high_group_normal = check_normality(high_group)
        medium_group_normal = check_normality(medium_group)
        low_group_normal = check_normality(low_group)
        
        if high_group_normal and medium_group_normal and low_group_normal:
            # All groups are normal, use ANOVA
            f_stat, p_value = stats.f_oneway(high_group, medium_group, low_group)
            
            # Calculate sum of squares, degrees of freedom, and eta squared
            ss_between = sum(
                [len(group) * (np.mean(group) - np.mean(high_group + medium_group + low_group))**2
                 for group in [high_group, medium_group, low_group]]
            )
            ss_within = sum([sum((score - np.mean(group))**2 for score in group)
                             for group in [high_group, medium_group, low_group]])
            ss_total = ss_between + ss_within
            
            df_between = 2  # 3 groups - 1
            df_within = len(high_group + medium_group + low_group) - 3  # Total samples - number of groups
            
            ms_between = ss_between / df_between
            ms_within = ss_within / df_within
            
            eta_sq = eta_squared_between_groups(ss_between, ss_total)
            
            print(f"{element.capitalize()} - ANOVA F-statistic: {f_stat:.4f}, p-value: {p_value:.4f}")
            print(f"SS_between: {ss_between:.4f}, SS_within: {ss_within:.4f}, df_between: {df_between}, df_within: {df_within}")
            print(f"Mean Square Between: {ms_between:.4f}, Mean Square Within: {ms_within:.4f}, Eta Squared: {eta_sq:.4f}")
        
        else:
            # Non-normal distribution, use Kruskal-Wallis H test
            h_stat, p_value = stats.kruskal(high_group, medium_group, low_group)
            print(f"{element.capitalize()} - Kruskal-Wallis H-test statistic: {h_stat:.4f}, p-value: {p_value:.4f}")
    else:
        print(f"{element.capitalize()} - Not enough data for statistical test")
