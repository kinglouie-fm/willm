from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os
import re
import asyncio
import aiohttp
from prompts import SYSTEM_PROMPT_1, SYSTEM_PROMPT_2, SYSTEM_PROMPT_3, GRAMMAR_PROMPT, VOCAB_PROMPT, ORGANIZATION_PROMPT, COHERENCE_PROMPT, WRITING_STYLE_PROMPT, DETAILED_IMPROVEMENTS, GENERAL_IMPROVEMENT

load_dotenv()

app = Flask(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')

async def fetch_openai_response(session, system_prompt, prompt_template, data, section=None):
    prompt = prompt_template.format(text=data, section=section)
    async with session.post(
        'https://api.openai.com/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {openai.api_key}',
            'Content-Type': 'application/json'
        },
        json={
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000
        }
    ) as response:
        response_json = await response.json()
        return response_json['choices'][0]['message']['content']
    
async def fetch_improvements(session, prompt_template, data):
    prompt = prompt_template.format(**data)
    async with session.post(
        'https://api.openai.com/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {openai.api_key}',
            'Content-Type': 'application/json'
        },
        json={
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT_3},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000
        }
    ) as response:
        response_json = await response.json()
        return response_json['choices'][0]['message']['content']

async def handle_grammar(session, data):
    return await fetch_openai_response(session, SYSTEM_PROMPT_1, GRAMMAR_PROMPT, data)

async def handle_vocabulary(session, data):
    return await fetch_openai_response(session, SYSTEM_PROMPT_1, VOCAB_PROMPT, data)

async def handle_organization(session, data, section):
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, ORGANIZATION_PROMPT, data, section)

async def handle_coherence(session, data, section):
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, COHERENCE_PROMPT, data, section)

async def handle_writing_style(session, data, section):
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, WRITING_STYLE_PROMPT, data, section)


@app.route('/handle-correction', methods=['POST'])
async def handle_correction():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    async with aiohttp.ClientSession() as session:
        grammar_result = await handle_grammar(session, data)
        vocab_result = await handle_vocabulary(session, data)

    # Process and merge results to extract mistakes, corrections, explanations, and corrected text
    merged_result = merge_results(grammar_result, vocab_result)
    mistakes, corrections, explanations, categories, corrected_text = process_initial_result(merged_result)

    return jsonify({
        "mistakes": mistakes,
        "corrections": corrections,
        "explanations": explanations,
        "categories": categories,
        "correctedText": corrected_text
    })

@app.route('/handle-further-correction', methods=['POST'])
async def handle_further_correction():
    data = request.json.get('text')
    section = request.json.get('section')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    async with aiohttp.ClientSession() as session:
        tasks = [
            handle_organization(session, data, section),
            handle_coherence(session, data, section),
            handle_writing_style(session, data, section)
        ]
        results = await asyncio.gather(*tasks)

    feedback = {key: process_further_result(result) for key, result in zip(["organization", "coherence", "writingStyle"], results)}

    return jsonify(feedback)

@app.route('/generate-improvements', methods=['POST'])
async def generate_improvements():
    data = request.json.get('prompts')

    if not data:
        return jsonify({"error": "No prompts provided"}), 400

    async with aiohttp.ClientSession() as session:
        tasks = []
        for prompt in data:
            print(f"Processing prompt: {prompt}")
            if prompt['prompt'] == 'DETAILED_IMPROVEMENTS':
                tasks.append(fetch_improvements(session, DETAILED_IMPROVEMENTS, prompt['data']))
            elif prompt['prompt'] == 'GENERAL_IMPROVEMENT':
                tasks.append(fetch_improvements(session, GENERAL_IMPROVEMENT, prompt['data']))

        results = await asyncio.gather(*tasks)

    return jsonify(results)

def merge_results(grammar_result, vocab_result):
    grammar_issues = extract_issues(grammar_result)
    vocab_issues = extract_issues(vocab_result)

    merged_issues = {issue['mistake']: issue for issue in vocab_issues}
    for issue in grammar_issues:
        if issue['mistake'] not in merged_issues:
            merged_issues[issue['mistake']] = issue

    return "\n".join([f"M: {issue['mistake']}\nC: {issue['correction']}\nE: {issue['explanation']}\nT: {issue['category']}" for issue in merged_issues.values()])

def extract_issues(result):
    mistakes = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations = re.findall(r'E: (.*?)(?=\nM:|$)', result, re.DOTALL)
    categories = re.findall(r'T: (.*?)\n', result, re.DOTALL)

    issues = []
    for mistake, correction, explanation, category in zip(mistakes, corrections, explanations, categories):
        issues.append({
            "mistake": mistake.strip(),
            "correction": correction.strip(),
            "explanation": explanation.strip(),
            "category": category.strip()
        })

    return issues

def process_initial_result(result):
    mistakes = []
    corrections = []
    explanations = []
    categories = []
    corrected_text = ""

    fine_match = re.search(r'The submitted writing is fine.', result)
    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)(?=\nM:|Correction:|$)', result, re.DOTALL)
    categories_match = re.findall(r'T: (.*?)\n', result, re.DOTALL)
    corrected_text_match = re.search(r'Correction:(.*)', result, re.DOTALL)

    if fine_match:
        mistakes.append("The submitted writing is fine.")
        corrections.append("The submitted writing is fine.")
        explanations.append("The submitted writing is fine.")
    if mistakes_match:
        mistakes = [m.strip() for m in mistakes_match]
    if corrections_match:
        corrections = [c.strip() for c in corrections_match]
    if explanations_match:
        explanations = [e.strip() for e in explanations_match]
    if categories_match:
        categories = [t.strip() for t in categories_match]
    if corrected_text_match:
        corrected_text = corrected_text_match.group(1).strip()

    return mistakes, corrections, explanations, categories, corrected_text

def process_further_result(result):
    feedback = {
        "mistakes": [],
        "corrections": [],
        "explanations": [],
        "categories": [],
    }

    fine_match = re.search(r'The submitted writing is fine.', result)
    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)(?=\nM:|Correction:|$)', result, re.DOTALL)
    categories_match = re.findall(r'T: (.*?)\n', result, re.DOTALL)

    if fine_match:
        feedback["mistakes"].append("The submitted writing is fine.")
        feedback["corrections"].append("The submitted writing is fine.")
        feedback["explanations"].append("The submitted writing is fine.")
    if mistakes_match:
        feedback["mistakes"] = [m.strip() for m in mistakes_match]
    if corrections_match:
        feedback["corrections"] = [c.strip() for c in corrections_match]
    if explanations_match:
        feedback["explanations"] = [e.strip() for e in explanations_match]
    if categories_match:
        feedback["categories"] = [t.strip() for t in categories_match]

    while len(feedback["categories"]) < len(feedback["mistakes"]):
        feedback["categories"].append("Uncategorized")

    return feedback

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
