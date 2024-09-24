import json
from collections import defaultdict
import matplotlib.pyplot as plt # type: ignore
import seaborn as sns # type: ignore
import pandas as pd # type: ignore

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

# Dictionary to store the total issues for each score value (3, 4, 5, 6, 7, 8, 9) per writing element
score_aggregates = defaultdict(lambda: defaultdict(list))

# Process scores and map them to texts and users
for score in scores_data:
    user_id = score['user_id']['$oid']
    text_id = score['text_id']['$oid']
    
    # Get the username for the user_id and skip excluded users
    username = user_id_to_username.get(user_id)
    if not username:
        continue  # Skip users who are not mapped or are excluded

    # Find the matching text and check for exclusions
    matching_text = next((text for text in texts_data if text['_id']['$oid'] == text_id), None)
    if not matching_text:
        continue

    # Find issues related to the text and count the number of issues by type
    matching_issues = [issue for issue in issues_data if issue['text']['$oid'] == text_id]
    
    # Initialize counters for each writing element
    grammar_vocab_issues = 0
    organization_issues = 0
    coherence_issues = 0
    writing_style_issues = 0

    # Categorize issues based on their 'type'
    for issue in matching_issues:
        issue_type = issue['type']
        if issue_type == 'grammar_vocab':
            grammar_vocab_issues += 1
        elif issue_type == 'organization':
            organization_issues += 1
        elif issue_type == 'coherence':
            coherence_issues += 1
        elif issue_type == 'writingStyle':
            writing_style_issues += 1

    # Extract scores for each writing element (handle missing data gracefully)
    grammar_score = int(score['grammar']['$numberInt']) if 'grammar' in score else None
    vocabulary_score = int(score['vocabulary']['$numberInt']) if 'vocabulary' in score else None
    organization_score = int(score['organization']['$numberInt']) if 'organization' in score else None
    coherence_score = int(score['coherence']['$numberInt']) if 'coherence' in score else None
    writing_style_score = int(score['writing_style']['$numberInt']) if 'writing_style' in score else None

    # Combine grammar and vocabulary scores into one 'grammar_vocab' score
    if grammar_score is not None or vocabulary_score is not None:
        grammar_vocab_score = grammar_score or vocabulary_score  # Use whichever score is available
        score_aggregates[grammar_vocab_score]['grammar_vocab'].append(grammar_vocab_issues)

    # Store the number of issues for each writing element by score, if score exists
    if organization_score is not None:
        score_aggregates[organization_score]['organization'].append(organization_issues)
    if coherence_score is not None:
        score_aggregates[coherence_score]['coherence'].append(coherence_issues)
    if writing_style_score is not None:
        score_aggregates[writing_style_score]['writing_style'].append(writing_style_issues)

# Function to calculate the average number of issues for each score
def calculate_average_issues(issues):
    if len(issues) > 0:
        return sum(issues) / len(issues)
    return None

# Define the order in which writing elements should appear
writing_elements_order = ['grammar_vocab', 'organization', 'coherence', 'writing_style']

# Calculate the average feedback (number of issues) for each score
for score_value in range(1, 11):
    print(f"\nAverage feedback (issues) for score {score_value}:")
    
    # Ensure the writing elements are printed in the specified order
    for element in writing_elements_order:
        issues = score_aggregates[score_value].get(element, [])
        avg_issues = calculate_average_issues(issues)
        if avg_issues is not None:
            print(f"{element.replace('_', ' ').capitalize()}: {avg_issues:.2f}, len: {len(issues)}")
        else:
            print(f"{element.replace('_', ' ').capitalize()}: No data")

# Convert to a pandas DataFrame for easy plotting
scores_df = pd.DataFrame(scores_data)

# Create a violin plot to show the distribution of scores for each writing element
plt.figure(figsize=(12, 8))
sns.violinplot(x='writing_element', y='score', data=scores_df, inner="quartile", density_norm="width")
plt.title('Score Distribution for Each Writing Element')
plt.xlabel('Writing Element')
plt.ylabel('Score')
plt.xticks(rotation=45)
plt.show()
