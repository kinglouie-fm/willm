import json
import re
import os
from dotenv import load_dotenv # type: ignore
from openai import AzureOpenAI # type: ignore
from prompts import (UNIFIED_PROMPT, UNIFIED_PROMPT_2, SYSTEM_PROMPT_1, SYSTEM_PROMPT_2)

# Load environment variables
load_dotenv()

# Azure OpenAI credentials
azure_openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
deployment_gpt4o = os.getenv("DEPLOYMENT_NAME_GPT4o")

client = AzureOpenAI(
    api_key=azure_openai_api_key,
    api_version="2024-02-01",
    azure_endpoint=azure_openai_endpoint
)

# Helper function to normalize and clean text
def normalize_text(text):
    if text is None:
        return text

    # Normalize ellipses by replacing inconsistent ellipses with a standard one
    text = re.sub(r'\.{3,}', '...', text)

    # Normalize quotes
    text = re.sub(r'^"|"$', '', text)  # Remove leading/trailing double quotes if present
    text = re.sub(r"^'|'$", '', text)  # Remove leading/trailing single quotes if present

    # Escape necessary characters
    text = text.replace("'", "\\'")
    text = text.replace('"', '\\"')

    return text

# Process initial response (Mistakes, corrections, explanations, categories)
def process_initial_result(result):
    mistakes, corrections, explanations, categories, corrected_text = [], [], [], [], ""

    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)\n', result, re.DOTALL)
    categories_match = re.findall(r'T: (.*?)\n', result, re.DOTALL)
    corrected_text_match = re.findall(r'Correction:\s*(.*)', result, re.DOTALL)

    if mistakes_match:
        mistakes = [normalize_text(m.strip()) for m in mistakes_match]
    if corrections_match:
        corrections = [normalize_text(c.strip()) for c in corrections_match]
    if explanations_match:
        explanations = [normalize_text(e.strip()) for e in explanations_match]
    if categories_match:
        categories = [normalize_text(t.strip()) for t in categories_match]
    if corrected_text_match:
        corrected_text = ' '.join(normalize_text(ct.strip()) for ct in corrected_text_match)

    return mistakes, corrections, explanations, categories, corrected_text

def process_further_result(result):
    if "Writing Style" in result:
        result = result.replace("Writing Style", "WritingStyle")
        
    feedback = {
        "Organization": {"mistakes": [], "corrections": [], "explanations": [], "categories": []},
        "Coherence": {"mistakes": [], "corrections": [], "explanations": [], "categories": []},
        "WritingStyle": {"mistakes": [], "corrections": [], "explanations": [], "categories": []}
    }

    def clean_text(text):
        return text.replace('[', '').replace(']', '').strip()

    # Extracting each section content
    sections = ["Organization", "Coherence", "WritingStyle"]
    for section in sections:
        section_pattern = rf"{section}:(.*?)(\n\n|\Z)"
        section_match = re.search(section_pattern, result, re.DOTALL)
        if section_match:
            section_content = section_match.group(1).strip()
            if section_content == "The submitted writing is fine.":
                feedback[section] = {"message": "The submitted writing is fine."}
            else:
                # Extracting mistakes, corrections, explanations, and categories within the section content
                mistakes_match = re.findall(r'M: (.*?)\n', section_content, re.DOTALL)
                corrections_match = re.findall(r'C: (.*?)\n', section_content, re.DOTALL)
                explanations_match = re.findall(r'E: (.*?)\n', section_content, re.DOTALL)
                categories_match = re.findall(r'T: (.*?)(?=\nM:|\nC:|$)', section_content, re.DOTALL)

                feedback[section]["mistakes"] = [clean_text(m) for m in mistakes_match]
                feedback[section]["corrections"] = [clean_text(c) for c in corrections_match]
                feedback[section]["explanations"] = [clean_text(e) for e in explanations_match]
                feedback[section]["categories"] = [clean_text(t) for t in categories_match]

    # Converting section names to camel case
    feedback = {
        "organization": feedback["Organization"],
        "coherence": feedback["Coherence"],
        "writingStyle": feedback["WritingStyle"]
    }

    return feedback

# Send request to Azure OpenAI for initial correction
def get_initial_correction(submission):
    prompt = UNIFIED_PROMPT.format(text=submission, language="English")
    response = client.chat.completions.create(
        model=deployment_gpt4o,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_1},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )
    return process_initial_result(response.choices[0].message.content)

# Send request to Azure OpenAI for further correction by section
def get_further_correction(submission, section):
    prompt = UNIFIED_PROMPT_2.format(text=submission, section=section, language="English")
    response = client.chat.completions.create(
        model=deployment_gpt4o,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_2},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )
    return process_further_result(response.choices[0].message.content)

# Main function to process pre/post test submissions for each user
def process_user_data(user_data):
    user_results = {}
    
    for idx, submission in enumerate(user_data.get('preTestSubmissions', [])):
        preTestSubmission = submission['text']
        # preTestSection = submission['section']
        
        print("Processing preTestSubmission - initial")

        # Initial correction
        mistakes, corrections, explanations, categories, corrected_text = get_initial_correction(preTestSubmission)
        user_results[f'preTest_initial_{idx}'] = {
            # "mistakes": mistakes,
            "categories": categories
        }

        # print("Processing preTestSubmission - further")

        # Further correction
        # further_feedback = get_further_correction(preTestSubmission, preTestSection)
        # organization = further_feedback["organization"]
        # coherence = further_feedback["coherence"]
        # writing_style = further_feedback["writingStyle"]
        # user_results[f'postTest_further_{idx}'] = {
        #     "org_categories": organization["categories"],
        #     "coh_categories": coherence["categories"],
        #     "ws_categories": writing_style["categories"]
        # }
    
    for idx, submission in enumerate(user_data.get('postTestSubmissions', [])):
        postTestSubmission = submission['text']
        # postTestSection = submission['section']

        print("Processing postTestSubmission - initial")
        
        # Initial correction
        mistakes, corrections, explanations, categories, corrected_text = get_initial_correction(postTestSubmission)
        user_results[f'postTest_initial_{idx}'] = {
            # "mistakes": mistakes,
            "categories": categories,
        }

        # print("Processing postTestSubmission - further")

        # Further correction
        # further_feedback = get_further_correction(postTestSubmission, postTestSection)
        # organization = further_feedback["organization"]
        # coherence = further_feedback["coherence"]
        # writing_style = further_feedback["writingStyle"]
        # user_results[f'postTest_further_{idx}'] = {
        #     "org_categories": organization["categories"],
        #     "coh_categories": coherence["categories"],
        #     "ws_categories": writing_style["categories"]
        # }

    return user_results

# Main function to process all users and save results in JSON
def process_users(input_json_file, output_json_file):
    with open(input_json_file, 'r') as infile:
        user_data_list = json.load(infile)
    
    all_user_results = {}
    
    for user_data in user_data_list:
        username = user_data.get('username')

        # Skip processing if the username is in the exclusion list
        if username in exclude_usernames:
            print(f"Skipping user {username}")
            continue

        try:
            print(f"Processing data for user {username}")
            user_results = process_user_data(user_data)
            all_user_results[username] = user_results
        except Exception as e:
            print(f"Error processing user {username}: {e}")
    
    # Write the results to the output JSON file
    with open(output_json_file, 'w') as outfile:
        json.dump(all_user_results, outfile, indent=4)

# List of excluded users
exclude_usernames = ['thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme', 'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas']

input_json_file = '/Users/benthillen/Downloads/mongo/aggregated-data/users.json'
output_json_file = '/Users/benthillen/Downloads/mongo/evaluation/user_mistakes_prePostTest.json'

# Call the main function
if __name__ == "__main__":
    process_users(input_json_file, output_json_file)
    