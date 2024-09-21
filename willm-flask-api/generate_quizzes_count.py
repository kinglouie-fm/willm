import json

# Define the list of excluded usernames
excluded_usernames = [
    'thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme',
    'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas'
]

# Function to map user_id to username
def map_user_ids_to_usernames(users_data):
    user_id_to_username = {}
    for user in users_data:
        user_id = user['_id']['$oid']
        username = user.get('username')
        if username not in excluded_usernames:
            user_id_to_username[user_id] = username
    return user_id_to_username

# Load users data from JSON
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)

# Map user ids to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Initialize a dictionary to hold quiz count and scores per user
user_quiz_data = {}

# Load quizzes data from JSON
with open('/Users/benthillen/Downloads/mongo/aggregated-data/quizzes.json', 'r') as quizzes_file:
    quizzes_data = json.load(quizzes_file)

# Process quizzes and map them to users
for quiz in quizzes_data:
    user_id = quiz['user_id']['$oid']
    
    # Skip quiz if the user is in the exclusion list
    if user_id not in user_id_to_username:
        continue
    
    username = user_id_to_username[user_id]
    
    # Initialize user data if not already done
    if username not in user_quiz_data:
        user_quiz_data[username] = {
            'num_quizzes': 0,
            'quiz_scores': []
        }
    
    # Increment the number of quizzes and append the quiz score
    user_quiz_data[username]['num_quizzes'] += 1
    user_quiz_data[username]['quiz_scores'].append(quiz['score']['$numberInt'])

# Convert the scores to integers
for username, data in user_quiz_data.items():
    data['quiz_scores'] = [int(score) for score in data['quiz_scores']]

# Save the user quiz data to a JSON file
with open('/Users/benthillen/Downloads/mongo/evaluation/user_quiz_counts.json', 'w') as output_file:
    json.dump(user_quiz_data, output_file, indent=4)

print("User quiz counts and scores have been saved to user_quiz_counts.json")
