import json
import re

# Path to your MongoDB JSON file
input_file = '/Users/benthillen/Downloads/mongo/aggregated-data/unvalid_json_users.json'
output_file = '/Users/benthillen/Downloads/mongo/aggregated-data/users.json'

# Function to convert extended MongoDB JSON to standard JSON
def convert_mongo_json(mongo_str):
    # Replace ObjectId
    mongo_str = re.sub(r'\{"\$oid":\s*"([a-fA-F0-9]{24})"\}', r'"\1"', mongo_str)

    # Replace ISODate and Timestamps (converting to Unix timestamp)
    mongo_str = re.sub(r'\{"\$date":\s*\{"\$numberLong":\s*"(\d+)"\}\}', r'\1', mongo_str)

    # Replace Int (converting to integer)
    mongo_str = re.sub(r'\{"\$numberInt":\s*"(\d+)"\}', r'\1', mongo_str)

    return mongo_str

# Read the original MongoDB JSON
with open(input_file, 'r') as infile:
    data = infile.read()

# Convert the MongoDB extended JSON to standard JSON
converted_data = convert_mongo_json(data)

# Load the converted data into a Python object to validate the JSON
try:
    json_data = [json.loads(item) for item in converted_data.splitlines()]
    with open(output_file, 'w') as outfile:
        json.dump(json_data, outfile, indent=4)
    print(f"Converted JSON successfully written to {output_file}")
except json.JSONDecodeError as e:
    print(f"Error decoding JSON: {e}")
