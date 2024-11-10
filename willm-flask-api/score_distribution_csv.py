import json
from collections import defaultdict
import pandas as pd

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
with open('/Users/benthillen/Downloads/mongo/aggregated-data/scores.json', 'r') as scores_file:
    scores_data = json.load(scores_file)

# Map user IDs to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Filter scores by users that are not excluded
filtered_scores = [
    score for score in scores_data
    if user_id_to_username.get(score['user_id']['$oid'])  # Only include users that are mapped and not excluded
]

# Function to gather all scores for saving
def gather_all_scores():
    violin_data = defaultdict(list)
    
    for score in filtered_scores:
        user_id = score['user_id']['$oid']
        username = user_id_to_username.get(user_id)
        
        if not username:
            continue  # Skip if user is excluded or not found
        
        # Extract scores for each writing element
        grammar_score = int(score['grammar']['$numberInt']) if 'grammar' in score else None
        vocabulary_score = int(score['vocabulary']['$numberInt']) if 'vocabulary' in score else None
        organization_score = int(score['organization']['$numberInt']) if 'organization' in score else None
        coherence_score = int(score['coherence']['$numberInt']) if 'coherence' in score else None
        writing_style_score = int(score['writing_style']['$numberInt']) if 'writing_style' in score else None

        # Append scores to the respective writing element lists
        if grammar_score is not None:
            violin_data['Grammar'].append(grammar_score)
        if vocabulary_score is not None:
            violin_data['Vocabulary'].append(vocabulary_score)
        if organization_score is not None:
            violin_data['Organization'].append(organization_score)
        if coherence_score is not None:
            violin_data['Coherence'].append(coherence_score)
        if writing_style_score is not None:
            violin_data['Writing Style'].append(writing_style_score)

    return pd.DataFrame(dict([(k, pd.Series(v)) for k, v in violin_data.items()]))

# Function to save data to CSV for LaTeX TikZ plotting
def save_scores_to_csv(output_file):
    # Gather the data
    violin_df = gather_all_scores()

    # Save to CSV
    violin_df.to_csv(output_file, index=False)

# Save the data for LaTeX plotting
output_file = "/Users/benthillen/Downloads/mongo/evaluation/writing_scores_for_tikz.csv"
save_scores_to_csv(output_file)
print(f"Score data saved to {output_file}")
