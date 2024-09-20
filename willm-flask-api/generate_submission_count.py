import json

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

# Create a dictionary to store the number of submissions per user (excluding specific users)
user_submission_counts = {}

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
    
    # Count the number of submissions for the user if not excluded
    num_submissions = len(user["submissions"])
    
    # Store the count of submissions for the user
    user_submission_counts[user_id] = num_submissions

# Print or save the result
print(user_submission_counts)

# Optionally, save the submission counts to a file
with open('/path/to/your/user_submission_counts.json', 'w') as outfile:
    json.dump(user_submission_counts, outfile, indent=4)
