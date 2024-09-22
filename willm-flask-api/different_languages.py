import json
from collections import defaultdict

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

# Load users and texts data
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)

with open('/Users/benthillen/Downloads/mongo/aggregated-data/texts.json', 'r') as texts_file:
    texts_data = json.load(texts_file)

# Map user IDs to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Dictionary to store counts of non-English submissions for each user
non_english_usage = defaultdict(int)

# Process texts and count how often a language other than English was used
for text in texts_data:
    user_id = text['user_id']['$oid']
    language = text.get('language', 'English')  # Default to 'English' if not set

    # Get the username for the user_id and skip excluded users
    username = user_id_to_username.get(user_id)
    if not username:
        continue  # Skip users who are not mapped or are excluded

    # If the language is not English, count it
    if language.lower() != 'english':
        non_english_usage[username] += 1

# Print the results
print("Non-English usage by user:")
for username, count in non_english_usage.items():
    print(f"{username}: {count} times")
