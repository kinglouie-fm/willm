from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os
import json
from prompts import SYSTEM_PROMPT, GRAMMAR_VOCAB_PROMPT  # Import the prompts

load_dotenv()

app = Flask(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')

@app.route('/handle-correction', methods=['POST'])
def handle_correction():
    data = request.json.get('text')  # Expecting only the text

    if not data:
        return jsonify({"error": "No text provided"}), 400

    prompt = GRAMMAR_VOCAB_PROMPT.format(text=data)  # Format the prompt with the provided text
    
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2000
    )

    result = response.choices[0].message.content

    return result

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
