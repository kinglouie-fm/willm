import json
import uuid
from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import os
import re
import asyncio
import aiohttp
from prompts import (SYSTEM_PROMPT_1, SYSTEM_PROMPT_2, SYSTEM_PROMPT_4, SYSTEM_PROMPT_5,
                     UNIFIED_PROMPT, UNIFIED_PROMPT_2, ORGANIZATION_PROMPT, COHERENCE_PROMPT, WRITING_STYLE_PROMPT, 
                     SCORES, 
                     REVISION_PROMPT, SYNONYMS_PROMPT, ANTONYMS_PROMPT, ACADEMIC_SENTENCE_PROMPT, 
                     ARGUMENT_STRENGTHENING_PROMPT, PEER_REVIEW_PROMPT, SYNTHESIS_PROMPT)
import logging
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.config import Settings

load_dotenv()

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai.api_key = os.getenv('FLASK_API_KEY')
chromadb_client = chromadb.HttpClient(host="chromaDB", port = 8000, settings=Settings(allow_reset=True, anonymized_telemetry=False))
collection = chromadb_client.get_or_create_collection(name='questions')
embedding_function = OpenAIEmbeddings(api_key=os.getenv('FLASK_API_KEY'))

# LangChain Chroma setup - for similarity search
db = Chroma(client=chromadb_client, collection_name='questions', embedding_function=embedding_function)

async def fetch_openai_response(session, system_prompt_template, prompt_template, data, section=None, language='English'):
    system_prompt = system_prompt_template.format(language=language)
    prompt = prompt_template.format(text=data, section=section, language=language)
    logging.info(f"Received language: {language}")
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
        logging.info(f"Response JSON: {response_json}")
        return response_json['choices'][0]['message']['content']

async def handle_unified(session, data, language):
    logging.info(f"Received language for unified: {language}")
    return await fetch_openai_response(session, SYSTEM_PROMPT_1, UNIFIED_PROMPT, data, language=language)

async def handle_unified_2(session, data, section, language):
    logging.info(f"Received language for unified 2: {language}")
    return await fetch_openai_response(session, SYSTEM_PROMPT_2, UNIFIED_PROMPT_2, data, section, language=language)

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
    language = request.json.get('language')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    async with aiohttp.ClientSession() as session:
        unified_result = await handle_unified(session, data, language)

    mistakes, corrections, explanations, categories, contexts, corrected_text = process_initial_result(unified_result)

    return jsonify({
        "mistakes": mistakes,
        "corrections": corrections,
        "explanations": explanations,
        "categories": categories,
        "contexts": contexts,
        "correctedText": corrected_text
    })

@app.route('/handle-further-correction', methods=['POST'])
async def handle_further_correction():
    data = request.json.get('text')
    section = request.json.get('section')
    language = request.json.get('language')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    async with aiohttp.ClientSession() as session:
        unified_result = await handle_unified_2(session, data, section, language)

    feedback = process_further_result(unified_result)

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
    scores = {
        "grammar": None,
        "vocabulary": None,
        "organization": None,
        "coherence": None,
        "writing_style": None
    }

    # Define regex patterns for each score and its explanation
    patterns = {
        'grammar': r'Grammar:\s*(\d+)',
        'vocabulary': r'Vocabulary:\s*(\d+)',
        'organization': r'Organization:\s*(\d+)',
        'coherence': r'Coherence:\s*(\d+)',
        'writing_style': r'Writing Style:\s*(\d+)'
    }

    # Loop over each pattern to extract the score and explanation
    for key, pattern in patterns.items():
        match = re.search(pattern, response_text)
        if match:
            scores[key] = int(match.group(1).strip())

    return scores

def extract_issues(result):
    mistakes = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations = re.findall(r'E: (.*?)(?=\nM:|$)', result, re.DOTALL)
    categories = re.findall(r'T: (.*?)\n', result, re.DOTALL)
    contexts = re.findall(r'X: (.*?)\n', result, re.DOTALL)

    issues = []
    for mistake, correction, explanation, category, context in zip(mistakes, corrections, explanations, categories, contexts):
        issues.append({
            "mistake": mistake.strip(),
            "correction": correction.strip(),
            "explanation": explanation.strip(),
            "category": category.strip(),
            "context": context.strip()
        })

    return issues


def process_initial_result(result):
    mistakes = []
    corrections = []
    explanations = []
    categories = []
    contexts = []
    corrected_text = None

    fine_match = re.search(r'The submitted writing is fine.', result)
    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)(?=\nM:|Correction:|$)', result, re.DOTALL)
    categories_match = re.findall(r'T: (.*?)\n', result, re.DOTALL)
    contexts_match = re.findall(r'X: (.*?)\n', result, re.DOTALL)
    corrected_text_match = re.search(r'Correction:\s*(.*)', result, re.DOTALL)

    if fine_match:
        mistakes.append("The submitted writing is fine.")
        corrections.append("The submitted writing is fine.")
        explanations.append("The submitted writing is fine.")
        categories.append("The submitted writing is fine.")
        contexts.append("The submitted writing is fine.")
    if mistakes_match:
        mistakes = [m.strip() for m in mistakes_match]
    if corrections_match:
        corrections = [c.strip() for c in corrections_match]
    if explanations_match:
        explanations = [e.strip() for e in explanations_match]
    if categories_match:
        categories = [t.strip() for t in categories_match]
    if contexts_match:
        contexts = [x.strip() for x in contexts_match]
    if corrected_text_match:
        corrected_text = corrected_text_match.group(1).strip()

    return mistakes, corrections, explanations, categories, contexts, corrected_text

def process_further_result(result):
    if "Writing Style" in result:
        result = result.replace("Writing Style", "WritingStyle")
        
    feedback = {
        "Organization": {"mistakes": [], "corrections": [], "explanations": [], "categories": []},
        "Coherence": {"mistakes": [], "corrections": [], "explanations": [], "categories": []},
        "WritingStyle": {"mistakes": [], "corrections": [], "explanations": [], "categories": []}
    }

    # Extracting each section content
    sections = ["Organization", "Coherence", "WritingStyle"]
    for section in sections:
        section_pattern = rf"{section}:(.*?)(\n\n|\Z)"
        section_match = re.search(section_pattern, result, re.DOTALL)
        if section_match:
            section_content = section_match.group(1).strip()
            # logging.info(f"Section '{section}' content: {section_content}")
            if section_content == "The submitted writing is fine.":
                feedback[section] = {"message": "The submitted writing is fine."}
            else:
                # Extracting mistakes, corrections, explanations, and categories within the section content
                mistakes_match = re.findall(r'M: (.*?)\n', section_content, re.DOTALL)
                corrections_match = re.findall(r'C: (.*?)\n', section_content, re.DOTALL)
                explanations_match = re.findall(r'E: (.*?)\n', section_content, re.DOTALL)
                categories_match = re.findall(r'T: (.*?)(?=\nM:|\nC:|$)', section_content, re.DOTALL)

                feedback[section]["mistakes"] = [m.strip() for m in mistakes_match]
                feedback[section]["corrections"] = [c.strip() for c in corrections_match]
                feedback[section]["explanations"] = [e.strip() for e in explanations_match]
                feedback[section]["categories"] = [t.strip() for t in categories_match]

    # Converting section names to camel case
    feedback = {
        "organization": feedback["Organization"],
        "coherence": feedback["Coherence"],
        "writingStyle": feedback["WritingStyle"]
    }

    # logging.info(f"Processed feedback: {feedback}")
    return feedback

question_prompts = {
    'revision': REVISION_PROMPT,
    'synonyms': SYNONYMS_PROMPT,
    # 'antonyms': ANTONYMS_PROMPT,
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

    logger.info(f"Generated question response: {response}")

    output = response.choices[0].message.content

    # Extract the generated question and answer based on question type
    generated_question = None
    generated_answer = None
    options = None
    
    if question_type == 'synonyms' or question_type == 'argument_strengthening':
        question_match = re.search(r'Question:\s*(.*?)\nOptions:', output, re.DOTALL)
        options_match = re.search(r'Options:\s*(A\..*?B\..*?C\..*?D\..*?E\..*)\nAnswer:', output, re.DOTALL)
        answer_match = re.search(r'Answer:\s*(.*)', output, re.DOTALL)
        
        if question_match and options_match and answer_match:
            generated_question = question_match.group(1).strip()
            options = options_match.group(1).strip()
            generated_answer = answer_match.group(1).strip()
            logger.info(f"Generated triple: {generated_question}, {options}, {generated_answer}")
        else:
            return jsonify({"error": "Failed to parse the generated output"}), 500
    else:
        question_match = re.search(r'Question:\s*(.*?)\nAnswer:', output, re.DOTALL)
        answer_match = re.search(r'Answer:\s*(.*)', output, re.DOTALL)
        
        if question_match and answer_match:
            generated_question = question_match.group(1).strip()
            generated_answer = answer_match.group(1).strip()
            logger.info(f"Generated pair: {generated_question}, {generated_answer}")
        else:
            return jsonify({"error": "Failed to parse the generated output"}), 500

    # Embed the generated question using Langchain
    embeddings = OpenAIEmbeddings(api_key=os.getenv('FLASK_API_KEY'))
    embedded_question = embeddings.embed_query(generated_question)

    # Prepare metadata ensuring no None values
    metadata = {
        'question': generated_question,
        'options': options if options else "",
        'answer': generated_answer,
        'type': question_type,
    }

    # Store the embedded question in ChromaDB
    document_id = str(uuid.uuid4())
    collection.add(
        documents=[generated_question],
        embeddings=[embedded_question],
        ids=[document_id],
        metadatas=[{k: (v if v is not None else "") for k, v in metadata.items()}]
    )

    # Verify document addition
    documents = collection.get()
    logger.info(f"Documents: {documents}")

    return jsonify({
        "type": question_type,
        "question": generated_question,
        "options": options,
        "answer": generated_answer,
        "document_id": document_id
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)