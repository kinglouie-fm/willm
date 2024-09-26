import json

# Load the valid texts.json file (converted from Task 1)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/texts.json', 'r') as file:
    texts_data = json.load(file)

# Create a dictionary to store user submissions
user_texts = {}

# Loop through each submission in the texts.json data
for entry in texts_data:
    user_id = entry["user_id"]["$oid"]  # Extract the user ID
    submission_data = {
        "oid": entry["_id"]["$oid"],
        "session_id": entry["session_id"]["$oid"],
        "section": entry["section"],
        "content": entry["content"],
        "mode": entry["mode"],
        "language": entry["language"],
        "correctionModel": entry["correctionModel"],
        "furtherCorrectionModel": entry["furtherCorrectionModel"],
        "scoreModel": entry["scoreModel"],
        "createdAt": entry["createdAt"]["$date"]["$numberLong"]
    }

    # If the user already exists in the dictionary, append the submission
    if user_id in user_texts:
        user_texts[user_id]["submissions"].append(submission_data)
    else:
        # Otherwise, create a new user entry with submissions
        user_texts[user_id] = {
            "user_id": user_id,
            "submissions": [submission_data]
        }

# Convert the dictionary to a list of user objects
user_texts_list = list(user_texts.values())

# Save the user_texts.json file
with open('/Users/benthillen/Downloads/mongo/aggregated-data/user_texts.json', 'w') as outfile:
    json.dump(user_texts_list, outfile, indent=4)
