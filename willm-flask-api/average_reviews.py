import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta

# List of excluded usernames
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

# Load necessary JSON files
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/reviews.json', 'r') as reviews_file:
    reviews_data = json.load(reviews_file)

# Map user IDs to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Dictionary to hold review counts per user and per session
user_review_counts = defaultdict(int)
review_dates = defaultdict(list)
session_counts = defaultdict(set)

# Reviews per user per week
user_reviews_by_week = defaultdict(lambda: {'week1': 0, 'week2': 0, 'week3': 0})

# Define start and end dates for the testing weeks
# Assume the testing period is 21 days long (3 weeks) starting from the first review date
first_review_timestamp = min(int(review['date_created']['$date']['$numberLong']) for review in reviews_data)
first_review_date = datetime.fromtimestamp(first_review_timestamp / 1000, timezone.utc)

# Define the 3 testing week periods
week1_start = first_review_date
week1_end = week1_start + timedelta(days=7)
week2_start = week1_end
week2_end = week2_start + timedelta(days=7)
week3_start = week2_end
week3_end = week3_start + timedelta(days=7)

# Track reviews per week globally across all users
reviews_by_week = {'week1': 0, 'week2': 0, 'week3': 0}

# Process reviews and group them by user and week
for review in reviews_data:
    user_id = review['user_id']['$oid']
    
    # Get the username for the user_id and skip excluded users
    username = user_id_to_username.get(user_id)
    if not username:
        continue  # Skip excluded users or those without a matching username

    # Increment the review count for the user
    user_review_counts[username] += 1
    
    # Convert the Unix timestamp to a datetime object
    review_timestamp = int(review['date_created']['$date']['$numberLong'])
    review_date = datetime.fromtimestamp(review_timestamp / 1000, timezone.utc)
    
    # Track the review date for each user
    review_dates[username].append(review_date)
    
    # Check which week the review falls into and update counts globally and per user
    if week1_start <= review_date < week1_end:
        reviews_by_week['week1'] += 1
        user_reviews_by_week[username]['week1'] += 1
    elif week2_start <= review_date < week2_end:
        reviews_by_week['week2'] += 1
        user_reviews_by_week[username]['week2'] += 1
    elif week3_start <= review_date < week3_end:
        reviews_by_week['week3'] += 1
        user_reviews_by_week[username]['week3'] += 1
    
    # Track unique session days for each user
    session_day = review_date.date()
    session_counts[username].add(session_day)

# Calculate average number of reviews generated per user
total_reviews = sum(user_review_counts.values())
total_users = len(user_review_counts)
average_reviews_per_user = total_reviews / total_users if total_users > 0 else 0

# Calculate the average reviews generated per session across all users
total_sessions = sum(len(sessions) for sessions in session_counts.values())
average_reviews_per_session = total_reviews / total_sessions if total_sessions > 0 else 0

# Output global statistics
print(f"Total reviews generated across all users: {total_reviews}")
print(f"Average reviews generated per user: {average_reviews_per_user:.2f}")
print(f"Average reviews generated per session across all users: {average_reviews_per_session:.2f}")

# Output weekly distribution
print("\nGlobal distribution of reviews across 3 weeks:")
print(f"Week 1: {reviews_by_week['week1']} reviews")
print(f"Week 2: {reviews_by_week['week2']} reviews")
print(f"Week 3: {reviews_by_week['week3']} reviews")

# Output user-specific weekly distribution
print("\nWeekly review distribution for each user:")
for username, weeks in user_reviews_by_week.items():
    print(f"{username}: Week 1: {weeks['week1']}, Week 2: {weeks['week2']}, Week 3: {weeks['week3']}")
