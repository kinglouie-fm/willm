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

# Load the necessary JSON files
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/texts.json', 'r') as texts_file:
    texts_data = json.load(texts_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/issues.json', 'r') as issues_file:
    issues_data = json.load(issues_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/scores.json', 'r') as scores_file:
    scores_data = json.load(scores_file)

# Map user IDs to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Dictionary to store the aggregated data for each score value (4, 5, 6, 7, 8, 9) per writing element
score_aggregates = defaultdict(lambda: defaultdict(list))

# Process scores and map them to texts and users
for score in scores_data:
    user_id = score['user_id']['$oid']
    text_id = score['text_id']['$oid']
    
    # Get the username for the user_id and skip excluded users
    username = user_id_to_username.get(user_id)
    if not username:
        print(f"Skipping user with ID: {username}")
        continue  # Skip users who are not mapped or are excluded

    # Find the matching text and check for exclusions
    matching_text = next((text for text in texts_data if text['_id']['$oid'] == text_id), None)
    if not matching_text:
        continue

    # Extract scores for each writing element
    grammar_score = score['grammar']['$numberInt']
    vocabulary_score = score['vocabulary']['$numberInt']
    organization_score = score['organization']['$numberInt']
    coherence_score = score['coherence']['$numberInt']
    writing_style_score = score['writing_style']['$numberInt']

    # Group scores by their score value for each writing element
    score_aggregates[grammar_score]['grammar'].append(grammar_score)
    score_aggregates[vocabulary_score]['vocabulary'].append(vocabulary_score)
    score_aggregates[organization_score]['organization'].append(organization_score)
    score_aggregates[coherence_score]['coherence'].append(coherence_score)
    score_aggregates[writing_style_score]['writing_style'].append(writing_style_score)

# Function to calculate the average score for a given score range
def calculate_average(scores):
    if len(scores) > 0:
        return sum(scores) / len(scores)
    return None

# Calculate the average feedback for each writing element for scores 4, 5, 6, 7, 8, and 9
for score_value in range(4, 10):  # Scores from 4 to 9
    print(f"\nAverage feedback for score {score_value}:")
    
    for element, scores in score_aggregates[score_value].items():
        avg_score = calculate_average(scores)
        print(f"{element.capitalize()}: {avg_score:.2f}" if avg_score is not None else f"{element.capitalize()}: No data")

