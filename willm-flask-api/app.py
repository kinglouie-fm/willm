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
    response = openai.ChatCompletion.create(
        model="gpt-4",  # Make sure this is the correct model
        messages=[
            {"role": "system", "content": "You are an assistant designed to help improve academic writing by providing detailed feedback on grammar and vocabulary. The user will submit a piece of writing, and your task is to identify and correct grammatical and vocabulary mistakes."},
            {"role": "user", "content": data}
        ],
        max_tokens=1000
    )
    # Extracting the arrays from the OpenAI response
    mistakes = []
    corrections = []
    explanations = []
    if response and response.choices:
        output_text = response.choices[0].message['content'].strip()
        lines = output_text.split('\n')
        mistakes = eval(lines[0].replace('Mistakes: ', ''))
        corrections = eval(lines[1].replace('Corrections: ', ''))
        explanations = eval(lines[2].replace('Explanations: ', ''))
    result = {
        "mistakes": mistakes,
        "corrections": corrections,
        "explanations": explanations
    }
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)