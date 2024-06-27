from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os
import re
import json
import asyncio
import aiohttp
from prompts import SYSTEM_PROMPT, GRAMMAR_VOCAB_PROMPT, ORGANIZATION_PROMPT, COHERENCE_PROMPT, WRITING_STYLE_PROMPT

load_dotenv()

app = Flask(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')

async def fetch_openai_response(session, prompt_template, data):
    prompt = prompt_template.format(text=data)
    async with session.post(
        'https://api.openai.com/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {openai.api_key}',
            'Content-Type': 'application/json'
        },
        json={
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000
        }
    ) as response:
        response_json = await response.json()
        return response_json['choices'][0]['message']['content']

@app.route('/handle-correction', methods=['POST'])
async def handle_correction():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    async with aiohttp.ClientSession() as session:
        result = await fetch_openai_response(session, GRAMMAR_VOCAB_PROMPT, data)

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
async def handle_further_correction():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    prompts = {
        "organization": ORGANIZATION_PROMPT,
        "coherence": COHERENCE_PROMPT,
        "writingStyle": WRITING_STYLE_PROMPT
    }

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_openai_response(session, prompt_template, data) for prompt_template in prompts.values()]
        results = await asyncio.gather(*tasks)

    feedback = {key: process_further_result(result) for key, result in zip(prompts.keys(), results)}

    return jsonify(feedback)

def process_initial_result(result):
    mistakes = []
    corrections = []
    explanations = []
    corrected_text = ""

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
    feedback = {
        "mistakes": [],
        "corrections": [],
        "explanations": []
    }

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
