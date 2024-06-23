from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os
import re  # Import the regular expression library
import json  # Import the json library
from prompts import SYSTEM_PROMPT, GRAMMAR_VOCAB_PROMPT, ORGANIZATION_PROMPT, COHERENCE_PROMPT, WRITING_STYLE_PROMPT

load_dotenv()

app = Flask(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')

@app.route('/handle-correction', methods=['POST'])
def handle_correction():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    prompt = GRAMMAR_VOCAB_PROMPT.format(text=data)
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2000
    )

    result = response.choices[0].message.content

    print(result)

    # Process result to extract mistakes, corrections, explanations, and corrected text
    mistakes, corrections, explanations, corrected_text = process_initial_result(result)

    return jsonify({
        "mistakes": mistakes,
        "corrections": corrections,
        "explanations": explanations,
        "correctedText": corrected_text
    })

@app.route('/handle-further-correction', methods=['POST'])
def handle_further_correction():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    prompts = {
        "organization": ORGANIZATION_PROMPT,
        "coherence": COHERENCE_PROMPT,
        "writingStyle": WRITING_STYLE_PROMPT
    }

    results = {}
    for key, prompt_template in prompts.items():
        prompt = prompt_template.format(text=data)
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000
        )
        print(response.choices[0].message.content)
        results[key] = process_further_result(response.choices[0].message.content)

    return jsonify(results)

def process_initial_result(result):
    # Extract mistakes, corrections, explanations, and corrected text from the result
    mistakes = []
    corrections = []
    explanations = []
    corrected_text = ""

    # Use regex to find mistakes, corrections, explanations, and corrected text
    fine_match = re.search(r'The submitted writing is fine.', result)
    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)(?=\nM:|Correction:|$)', result, re.DOTALL)
    corrected_text_match = re.search(r'Correction:(.*)', result, re.DOTALL)

    if fine_match:
        mistakes.append("The submitted writing is fine.")
        corrections.append("The submitted writing is fine.")
        explanations.append("The submitted writing is fine.")
    if mistakes_match:
        mistakes = [m.strip().replace("'", "").replace('"', "") for m in mistakes_match]
    if corrections_match:
        corrections = [c.strip().replace("'", "").replace('"', "") for c in corrections_match]
    if explanations_match:
        explanations = [e.strip().replace("'", "").replace('"', "") for e in explanations_match]
    if corrected_text_match:
        corrected_text = corrected_text_match.group(1).strip().replace("'", "").replace('"', "")

    return mistakes, corrections, explanations, corrected_text

def process_further_result(result):
    # Extract feedback (mistakes, corrections, explanations) from the result
    feedback = {
        "mistakes": [],
        "corrections": [],
        "explanations": []
    }

    # Use regex to find mistakes, corrections, and explanations
    fine_match = re.search(r'The submitted writing is fine.', result)
    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)(?=\nM:|Correction:|$)', result, re.DOTALL)

    if fine_match:
        feedback["mistakes"].append("The submitted writing is fine.")
        feedback["corrections"].append("The submitted writing is fine.")
        feedback["explanations"].append("The submitted writing is fine.")
    if mistakes_match:
        feedback["mistakes"] = [m.strip().replace("'", "").replace('"', "") for m in mistakes_match]
    if corrections_match:
        feedback["corrections"] = [c.strip().replace("'", "").replace('"', "") for c in corrections_match]
    if explanations_match:
        feedback["explanations"] = [e.strip().replace("'", "").replace('"', "") for e in explanations_match]

    return feedback

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
