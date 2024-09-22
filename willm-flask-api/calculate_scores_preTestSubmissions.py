import json
import re
import statistics
import os
from dotenv import load_dotenv # type: ignore
from openai import AzureOpenAI # type: ignore
from prompts import (SYSTEM_PROMPT_4, SCORES)

# Load environment variables
load_dotenv()

# Azure OpenAI credentials
azure_openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
deployment_gpt35 = os.getenv("DEPLOYMENT_NAME_GPT35")
deployment_gpt4o = os.getenv("DEPLOYMENT_NAME_GPT4o")

client = AzureOpenAI(
    api_key=azure_openai_api_key,
    api_version="2024-02-01",
    azure_endpoint=azure_openai_endpoint
)

# Define the scoring system
def parse_scores(response_text):
    scores = {
        "grammar": None,
        "vocabulary": None,
        "organization": None,
        "coherence": None,
        "writing_style": None
    }

    patterns = {
        'grammar': r'Grammar:\s*(\d+)',
        'vocabulary': r'Vocabulary:\s*(\d+)',
        'organization': r'Organization:\s*(\d+)',
        'coherence': r'Coherence:\s*(\d+)',
        'writing_style': r'Writing Style:\s*(\d+)'
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, response_text)
        if match:
            scores[key] = int(match.group(1).strip())

    return scores

# Calculate the mean for the scores
def calculate_mean(scores_list):
    means = {}
    for key in scores_list[0]:
        element_scores = [score[key] for score in scores_list if score[key] is not None]
        if element_scores:
            means[key] = statistics.mean(element_scores)
        else:
            means[key] = None
    return means

# Send request to Azure OpenAI and get scores
def get_scores(preTestSubmission, preTestSection):
    prompt = SCORES.format(text=preTestSubmission, section=preTestSection)
    responses = []
    
    for i in range(5):
        print(f"Request {i+1}/5")
        response = client.chat.completions.create(
            model=deployment_gpt35,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_4},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        responses.append(response.choices[0].message.content)

    return [parse_scores(response) for response in responses]

# Process each user's data
def process_user_data(user_data):
    user_results = {}
    
    for idx, submission in enumerate(user_data.get('preTestSubmissions', [])):
        preTestSubmission = submission['text']
        preTestSection = submission['section']
        
        scores_list = get_scores(preTestSubmission, preTestSection)
        mean_scores = calculate_mean(scores_list)
        
        user_results[f'submission_{idx}'] = mean_scores
    
    return user_results

# Main function to process all users and save results in JSON
def process_users(input_json_file, output_json_file, exclude_usernames):
    with open(input_json_file, 'r') as infile:
        user_data_list = json.load(infile)
    
    all_user_results = {}
    
    for user_data in user_data_list:
        username = user_data.get('username')
        
        # Skip processing if the username is in the exclusion list
        if username in exclude_usernames:
            print(f"Skipping user {username}")
            continue
        
        user_id = username
        try:
            print(f"Requesting scores for user {user_id}")
            user_results = process_user_data(user_data)
            all_user_results[user_id] = user_results
        except Exception as e:
            print(f"Error processing user {user_id}: {e}")
    
    # Write the results to the output JSON file
    with open(output_json_file, 'w') as outfile:
        json.dump(all_user_results, outfile, indent=4)

# List of usernames to exclude (remaining users: 17)
exclude_usernames = ['thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme', 'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas']

input_json_file = '/Users/benthillen/Downloads/mongo/aggregated-data/users.json'
output_json_file = '/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json'

# Call the main function
if __name__ == "__main__":
    process_users(input_json_file, output_json_file, exclude_usernames)
