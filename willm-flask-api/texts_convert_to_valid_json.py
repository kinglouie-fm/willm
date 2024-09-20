import json

# Open the texts.json file
with open('/Users/benthillen/Downloads/mongo/aggregated-data/unvalid_json_texts.json', 'r') as file:
    # Read all lines in the file
    lines = file.readlines()

# Convert the lines into a valid JSON array
json_objects = []
for line in lines:
    try:
        # Convert each line to a JSON object
        json_objects.append(json.loads(line))
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")

# Save the new valid JSON array into a new file
with open('/Users/benthillen/Downloads/mongo/aggregated-data/texts.json', 'w') as outfile:
    json.dump(json_objects, outfile, indent=4)
