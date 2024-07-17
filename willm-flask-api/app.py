import json
import uuid
from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os
import re
import asyncio
import aiohttp
from prompts import (SYSTEM_PROMPT_1, SYSTEM_PROMPT_2, SYSTEM_PROMPT_3, SYSTEM_PROMPT_4, SYSTEM_PROMPT_5,
                     UNIFIED_PROMPT, ORGANIZATION_PROMPT, COHERENCE_PROMPT, WRITING_STYLE_PROMPT, 
                     DETAILED_IMPROVEMENTS, GENERAL_IMPROVEMENT, SCORES, 
                     REVISION_PROMPT, SYNONYMS_PROMPT, ANTONYMS_PROMPT, ACADEMIC_SENTENCE_PROMPT, 
                     ARGUMENT_STRENGTHENING_PROMPT, PEER_REVIEW_PROMPT, SYNTHESIS_PROMPT)
import logging
# from langchain_community.embeddings import OpenAIEmbeddings
from langchain_openai import OpenAIEmbeddings
import chromadb

load_dotenv()

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')
chromadb_client = chromadb.Client()
collection = chromadb_client.get_or_create_collection(name='questions')

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

# async def handle_grammar(session, data):
#     return await fetch_openai_response(session, SYSTEM_PROMPT_1, GRAMMAR_PROMPT, data)

# async def handle_vocabulary(session, data):
#     return await fetch_openai_response(session, SYSTEM_PROMPT_1, VOCAB_PROMPT, data)

async def handle_unified(session, data):
    return await fetch_openai_response(session, SYSTEM_PROMPT_1, UNIFIED_PROMPT, data)

async def handle_organization(session, data, section):
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, ORGANIZATION_PROMPT, data, section)

async def handle_coherence(session, data, section):
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, COHERENCE_PROMPT, data, section)

async def handle_writing_style(session, data, section):
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, WRITING_STYLE_PROMPT, data, section)

async def handle_scores(session, data):
    return await fetch_openai_response(session, SYSTEM_PROMPT_4, SCORES, data)


@app.route('/handle-correction', methods=['POST'])
async def handle_correction():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    async with aiohttp.ClientSession() as session:
        # grammar_result = await handle_grammar(session, data)
        # vocab_result = await handle_vocabulary(session, data)
        unified_result = await handle_unified(session, data)

    # Process and merge results to extract mistakes, corrections, explanations, and corrected text
    # merged_result = merge_results(grammar_result, vocab_result)
    # mistakes, corrections, explanations, categories, corrected_text = process_initial_result(merged_result)
    mistakes, corrections, explanations, categories, corrected_text = process_initial_result(unified_result)

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

@app.route('/generate-scores', methods=['POST'])
async def generate_scores():
    data = request.json.get('text')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    try:
        async with aiohttp.ClientSession() as session:
            scores_result = await handle_scores(session, data)
        # logger.info("LLM Response: %s", scores_result)  # Log the raw response from the LLM
        scores = parse_scores(scores_result)
        # logger.info("Parsed Scores: %s", scores)  # Log the parsed scores
        return jsonify(scores)
    except Exception as e:
        logger.error(f"Error generating scores: {e}")
        return jsonify({"error": str(e)}), 500

def parse_scores(response_text):
    # Initialize a dictionary to hold the scores and explanations
    scores = {
        "grammar": {"score": None, "explanation": ""},
        "vocabulary": {"score": None, "explanation": ""},
        "organization": {"score": None, "explanation": ""},
        "coherence": {"score": None, "explanation": ""},
        "writing_style": {"score": None, "explanation": ""}
    }

    # Define regex patterns for each score and its explanation
    patterns = {
        'grammar': r'Grammar:\s*(\d+)\s*Explanation:\s*(.*?)(?=\n\s*Vocabulary:|$)',
        'vocabulary': r'Vocabulary:\s*(\d+)\s*Explanation:\s*(.*?)(?=\n\s*Organization:|$)',
        'organization': r'Organization:\s*(\d+)\s*Explanation:\s*(.*?)(?=\n\s*Coherence:|$)',
        'coherence': r'Coherence:\s*(\d+)\s*Explanation:\s*(.*?)(?=\n\s*Writing Style:|$)',
        'writing_style': r'Writing Style:\s*(\d+)\s*Explanation:\s*(.*?)(?=$)'
    }

    # Loop over each pattern to extract the score and explanation
    for key, pattern in patterns.items():
        match = re.search(pattern, response_text, re.DOTALL)
        if match:
            scores[key] = {
                'score': int(match.group(1).strip()),
                'explanation': match.group(2).strip()
            }

    return scores


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

# def merge_results(grammar_result, vocab_result):
#     grammar_issues = extract_issues(grammar_result)
#     vocab_issues = extract_issues(vocab_result)

#     merged_issues = {issue['mistake']: issue for issue in grammar_issues}
#     for issue in vocab_issues:
#         if issue['mistake'] not in merged_issues:
#             merged_issues[issue['mistake']] = issue

#     return "\n".join([f"M: {issue['mistake']}\nC: {issue['correction']}\nE: {issue['explanation']}\nT: {issue['category']}" for issue in merged_issues.values()])

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

    return feedback

question_prompts = {
    'revision': REVISION_PROMPT,
    'synonyms': SYNONYMS_PROMPT,
    'antonyms': ANTONYMS_PROMPT,
    'academic_sentence': ACADEMIC_SENTENCE_PROMPT,
    'argument_strengthening': ARGUMENT_STRENGTHENING_PROMPT,
    'peer_review': PEER_REVIEW_PROMPT,
    'synthesis': SYNTHESIS_PROMPT,
}

@app.route('/question/suggest-type', methods=['POST'])
def suggest_question_type():
    data = request.json
    text = data['text']

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_5},
            {"role": "user", "content": text}
        ],
        max_tokens=50
    )

    question_type = response.choices[0].message.content.strip()
    if question_type in question_prompts:
        logger.info(f"Suggested question type from LLM: {question_type}")
        return jsonify({"type": question_type})
    return jsonify({"type": None})

@app.route('/question/generate', methods=['POST'])
def generate_question():
    data = request.json
    question_type = data['type']
    
    if question_type not in question_prompts:
        return jsonify({"error": "Invalid question type"}), 400

    prompt = question_prompts[question_type]

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_5},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2000
    )

    output = response.choices[0].message.content

    # Extract the generated question and answer
    generated_question = output.split("Question: ")[1].split("Answer: ")[0].strip()
    generated_answer = output.split("Answer: ")[1].strip()

    logger.info(f"Generated pair: {generated_question}, {generated_answer}")

    # Embed the generated question using Langchain
    embeddings = OpenAIEmbeddings(api_key=os.getenv('FLASK_API_KEY'))
    embedded_question = embeddings.embed_query(generated_question)

    # Store the embedded question in ChromaDB
    document_id = str(uuid.uuid4())
    collection.add(
        documents=[generated_question],
        embeddings=[embedded_question],
        ids=[document_id],
        metadatas=[{
            'question': generated_question,
            'answer': generated_answer,
            'type': question_type,
        }]
    )

    # Verify document addition
    added_document = collection.get()
    logger.info(f"Added document: {added_document}")

    return jsonify({
        "type": question_type,
        "question": generated_question,
        "answer": generated_answer,
        "document_id": document_id
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
