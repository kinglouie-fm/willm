import json
import numpy as np  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import scipy.stats as stats  # type: ignore
from tabulate import tabulate # type: ignore

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

# Load the quiz data from JSON file
with open('/Users/benthillen/Downloads/mongo/aggregated-data/quizschedules.json', 'r') as quiz_file:
    quiz_data = json.load(quiz_file)

# Dictionary to hold the quiz completion rates using usernames
quiz_completion_rates = {}

# Calculate the quiz completion rate for each user using their username
for quiz in quiz_data:
    user_id = quiz['user_id']['$oid']
    
    # Get the username for the user_id
    username = user_id_to_username.get(user_id)
    
    if not username:
        continue  # Skip if no matching username

    total_quizzes = int(quiz['total_quizzes']['$numberInt'])  # Ensure proper conversion to int
    completed_quizzes = int(quiz['completed_quizzes']['$numberInt'])

    # Avoid division by zero
    if total_quizzes > 0:
        completion_rate = completed_quizzes / total_quizzes
    else:
        completion_rate = 0
    
    quiz_completion_rates[username] = completion_rate

# Get the completion rates for all users
completion_rates = list(quiz_completion_rates.values())

# Plot the histogram of completion rates
plt.hist(completion_rates, bins=10, edgecolor='black')
plt.title('Quiz Completion Rate Distribution')
plt.xlabel('Completion Rate')
plt.ylabel('Number of Users')
plt.show()

# Calculate quartiles to determine thresholds for splitting groups
lower_quartile = np.percentile(completion_rates, 25)
median_completion_rate = np.median(completion_rates)
upper_quartile = np.percentile(completion_rates, 75)

print(f"25th percentile: {lower_quartile:.2f}")
print(f"Median completion rate: {median_completion_rate:.2f}")
print(f"75th percentile: {upper_quartile:.2f}")

# Split users into high, medium, and low completion groups based on quartiles
high_completion_users = []
medium_completion_users = []
low_completion_users = []

for username, rate in quiz_completion_rates.items():
    if rate >= upper_quartile:
        high_completion_users.append(username)
    elif lower_quartile <= rate < upper_quartile:
        medium_completion_users.append(username)
    else:
        low_completion_users.append(username)

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
high_completion_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
medium_completion_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}
low_completion_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Compute the test score differences for each user and assign them to the appropriate group
for username in quiz_completion_rates:
    if username in pre_test_data and username in post_test_data:
        for element in high_completion_differences:
            pre_aggregated_score = aggregate_scores(pre_test_data[username], element)
            post_aggregated_score = aggregate_scores(post_test_data[username], element)
            
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                score_difference = post_aggregated_score - pre_aggregated_score
                
                # Assign to the appropriate group
                if username in high_completion_users:
                    high_completion_differences[element].append(score_difference)
                elif username in medium_completion_users:
                    medium_completion_differences[element].append(score_difference)
                else:
                    low_completion_differences[element].append(score_difference)

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

    # Calculate Total Sum of Squares (SST)
    SST = SSB + SSW
    
    # Eta squared (effect size)
    eta_squared = SSB / SST
    
    return SSB, SSW, df_between, df_within, F, eta_squared

# Store results to print in table format later
results_table = []

# Perform ANOVA or Kruskal-Wallis H Test based on normality across groups
for element in high_completion_differences:
    high_group = high_completion_differences[element]
    medium_group = medium_completion_differences[element]
    low_group = low_completion_differences[element]

    # Ensure all groups have sufficient data for the test
    if len(high_group) > 1 and len(medium_group) > 1 and len(low_group) > 1:
        # Check for normality in all groups
        high_group_normal = check_normality(high_group)
        medium_group_normal = check_normality(medium_group)
        low_group_normal = check_normality(low_group)
        
        if high_group_normal and medium_group_normal and low_group_normal:
            # Perform ANOVA with SS and df
            SSB, SSW, df_between, df_within, F_stat, eta_squared = calculate_anova(high_group, medium_group, low_group)
            p_value = stats.f_oneway(high_group, medium_group, low_group)[1]
            results_table.append([element.capitalize(), SSB, SSW, df_between, df_within, F_stat, p_value, eta_squared])
        else:
            # Non-normal distribution, use Kruskal-Wallis H test
            h_stat, p_value = stats.kruskal(high_group, medium_group, low_group)
            results_table.append([element.capitalize(), "-", "-", "-", "-", h_stat, p_value])
    else:
        results_table.append([element.capitalize(), "Not enough data", "-", "-", "-", "-", "-"])

# Print results in a table format using tabulate
headers = ["Element", "SSB", "SSW", "df_between", "df_within", "F-statistic/H-stat", "p-value", "Eta squared"]
print("\nANOVA/Kruskal-Wallis Results:")
print(tabulate(results_table, headers, floatfmt=".4f"))
