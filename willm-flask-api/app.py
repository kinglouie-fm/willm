from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')

@app.route('/handle-correction', methods=['POST'])
def handle_correction():
    data = request.json.get('prompt')

    if not data:
        return jsonify({"error": "No prompt provided"}), 400
    
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an assistant designed to help improve academic writing by providing detailed feedback on grammar and vocabulary. The user will submit a piece of writing, and your task is to identify and correct grammatical and vocabulary mistakes."},
            {"role": "user", "content": data}
        ],
        max_tokens=2000
    )

    result = response.choices[0].message.content

    return result

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)