import json
from datetime import datetime
from collections import defaultdict
import numpy as np  # type: ignore

# Load the exclusion list
excluded_usernames = [
    'thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme',
    'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas'
]

# Load the users.json file to map user IDs to usernames
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)

# Create a dictionary to map user_id to username
user_id_to_username = {user['_id']: user['username'] for user in users_data}

# Load the user_texts.json file
with open('/Users/benthillen/Downloads/mongo/aggregated-data/user_texts.json', 'r') as user_texts_file:
    user_texts_data = json.load(user_texts_file)

# Dictionary to store submission counts and timestamps per user
user_submission_data = defaultdict(list)

# Loop through each user in the user_texts data
for user in user_texts_data:
    user_id = user["user_id"]
    
    # Check if the user_id exists in the user_id_to_username mapping
    if user_id in user_id_to_username:
        username = user_id_to_username[user_id]
        
        # If the username is in the exclusion list, skip this user
        if username in excluded_usernames:
            print(f"Skipping user: {username}")
            continue
    
        # Store submission counts and timestamps
        for submission in user["submissions"]:
            created_at_timestamp = int(submission["createdAt"]) / 1000  # Convert from ms to seconds
            created_at_date = datetime.fromtimestamp(created_at_timestamp)
            user_submission_data[username].append(created_at_date)

# Now, let's calculate the overall submission statistics
overall_submission_counts = [len(submissions) for submissions in user_submission_data.values()]

# Calculate overall statistics
mean_overall = np.mean(overall_submission_counts)
median_overall = np.median(overall_submission_counts)
min_overall = np.min(overall_submission_counts)
max_overall = np.max(overall_submission_counts)
stddev_overall = np.std(overall_submission_counts)

# Print the overall submission stats
print(f"Overall Submissions - Mean: {mean_overall}, Median: {median_overall}, Min: {min_overall}, Max: {max_overall}, Std Dev: {stddev_overall}")

# Function to calculate weekly submissions
def calculate_submissions_per_week(submission_dates):
    if not submission_dates:
        return 0

    first_submission = min(submission_dates)
    last_submission = max(submission_dates)
    
    # Calculate total weeks between first and last submission
    total_weeks = (last_submission - first_submission).days / 7.0

    # Avoid division by zero in case of single submission (0 weeks difference)
    if total_weeks == 0:
        total_weeks = 1

    # Return average submissions per week
    return len(submission_dates) / total_weeks

# Calculate submission rates per week for each user
weekly_submission_rates = [calculate_submissions_per_week(submissions) for submissions in user_submission_data.values()]

# Calculate weekly statistics
mean_weekly = np.mean(weekly_submission_rates)
median_weekly = np.median(weekly_submission_rates)
min_weekly = np.min(weekly_submission_rates)
max_weekly = np.max(weekly_submission_rates)
stddev_weekly = np.std(weekly_submission_rates)

# Print weekly submission stats
print(f"Weekly Submissions - Mean: {mean_weekly}, Median: {median_weekly}, Min: {min_weekly}, Max: {max_weekly}, Std Dev: {stddev_weekly}")
