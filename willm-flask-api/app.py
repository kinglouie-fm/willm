from flask import Flask, request, jsonify
import asyncio
from dotenv import load_dotenv
import re
import os
import logging
from openai import AzureOpenAI, AsyncAzureOpenAI
from chroma_langchain import chroma_langchain_handler
from prompts import (
    SYSTEM_PROMPT_1, SYSTEM_PROMPT_1_MULTI, SYSTEM_PROMPT_2, SYSTEM_PROMPT_4, SYSTEM_PROMPT_5,
    SYSTEM_PROMPT_6, UNIFIED_PROMPT, UNIFIED_PROMPT_MULTI, UNIFIED_PROMPT_2, SCORES, 
    REVISION_PROMPT, SYNONYMS_PROMPT, ACADEMIC_SENTENCE_PROMPT, ACADEMIC_SENTENCE_CORRECTING_PROMPT,
    ARGUMENT_STRENGTHENING_PROMPT, COHERENCE_PROMPT, ORGANIZATION_PROMPT, EXPLAIN_ANSWER, COHERENCE_TIP_PROMPT, ORGANIZATION_TIP_PROMPT, DECIDE_QUESTIONS
)

load_dotenv()

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

azure_openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
deployment_gpt35 = os.getenv("DEPLOYMENT_NAME_GPT35")
deployment_gpt4o = os.getenv("DEPLOYMENT_NAME_GPT4o")
print(azure_openai_api_key, azure_openai_endpoint, deployment_gpt35, deployment_gpt4o)

async_client = AsyncAzureOpenAI(
    api_key=azure_openai_api_key,  
    api_version="2024-02-01",
    azure_endpoint = azure_openai_endpoint
)

client = AzureOpenAI(
    api_key=azure_openai_api_key,
    api_version="2024-02-01",
    azure_endpoint = azure_openai_endpoint
)

# openai.api_key = os.getenv('FLASK_API_KEY')

def split_into_sentences(text):
    sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', text)
    return sentences

async def fetch_openai_response_async(system_prompt_template, prompt_template, data, section=None, language='English', model='3.5-turbo-1106'):
    system_prompt = system_prompt_template.format(language=language)
    prompt = prompt_template.format(text=data, section=section, language=language)
    logging.info(f"Received language: {language}")
    logging.info(f"Received model: {model}")

    deployment = deployment_gpt35 if model == '3.5-turbo-1106' else deployment_gpt4o

    response = await async_client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    return response.choices[0].message.content

def fetch_openai_response_sync(system_prompt_template, prompt_template, data, section=None, language='English', model='3.5-turbo-1106'):
    system_prompt = system_prompt_template.format(language=language)
    prompt = prompt_template.format(text=data, section=section, language=language)
    logging.info(f"Received language: {language}")
    logging.info(f"Received model: {model}")

    deployment = deployment_gpt35 if model == '3.5-turbo-1106' else deployment_gpt4o

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    return response.choices[0].message.content

async def handle_unified(data, language, model):
    return await fetch_openai_response_async(SYSTEM_PROMPT_1, UNIFIED_PROMPT, data, language=language, model=model)

async def process_sentence(sentence, language, model):
    return await fetch_openai_response_async(SYSTEM_PROMPT_1_MULTI, UNIFIED_PROMPT_MULTI, sentence, language=language, model=model)

def handle_unified_2(data, section, language, model):
    return fetch_openai_response_sync(SYSTEM_PROMPT_2, UNIFIED_PROMPT_2, data, section, language=language, model=model)

def handle_scores(data, model):
    return fetch_openai_response_sync(SYSTEM_PROMPT_4, SCORES, data, model=model)

@app.route('/handle-correction', methods=['POST'])
async def handle_correction():
    data = request.json.get('text')
    language = request.json.get('language')
    model = request.json.get('model')

    if not data:
        return jsonify({"error": "No text provided"}), 400

    if model not in ['3.5-turbo-1106', '4o']:
        return jsonify({"error": "Invalid model"}), 400

    if model == '4o':
        unified_result = await handle_unified(data, language, model)
        mistakes, corrections, explanations, categories, contexts, corrected_text = process_initial_result(unified_result)
    elif model == '3.5-turbo-1106':
        sentences = split_into_sentences(data)
        tasks = [process_sentence(sentence, language, model) for sentence in sentences]
        results = await asyncio.gather(*tasks)

        combined_result = ' '.join(results)
        mistakes, corrections, explanations, categories, contexts, corrected_text = process_initial_result(combined_result)

    logging.info("Initial correction done")
    return jsonify({
        "mistakes": mistakes,
        "corrections": corrections,
        "explanations": explanations,
        "categories": categories,
        "contexts": contexts,
        "correctedText": corrected_text
    })

@app.route('/handle-further-correction', methods=['POST'])
def handle_further_correction():
    data = request.json.get('text')
    section = request.json.get('section')
    language = request.json.get('language')
    model = request.json.get('model')

    if not data:
        return jsonify({"error": "No text provided"}), 400
    
    if model not in ['3.5-turbo-1106', '4o']:
        return jsonify({"error": "Invalid model"}), 400

    unified_result = handle_unified_2(data, section, language, model)

    feedback = process_further_result(unified_result)

    logging.info("Further correction done")

    return jsonify(feedback)

@app.route('/generate-scores', methods=['POST'])
def generate_scores():
    data = request.json.get('text')
    model = request.json.get('scoreModel')

    if not data:
        return jsonify({"error": "No text provided"}), 400
    
    if model not in ['3.5-turbo-1106', '4o']:
        return jsonify({"error": "Invalid model"}), 400

    try:
        logging.info("Generating scores")
        scores_result = handle_scores(data, model)
        scores = parse_scores(scores_result)
        return jsonify(scores)
    except Exception as e:
        logger.error(f"Error generating scores: {e}")
        return jsonify({"error": e}), 500

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

def normalize_text(text):
    if text is None:
        return text

    # Normalize ellipses by replacing inconsistent ellipses with a standard one
    text = re.sub(r'\.{3,}', '...', text)

    # Normalize quotes
    text = re.sub(r'^"|"$', '', text)  # Remove leading/trailing double quotes if present
    text = re.sub(r"^'|'$", '', text)  # Remove leading/trailing single quotes if present

    # Escape necessary characters
    text = text.replace("'", "\\'")
    text = text.replace('"', '\\"')

    return text

def format_text_for_json(text):
    if text is None:
        return text

    # Escape internal quotes
    text = text.replace("'", "\\'").replace('"', '\\"')

    # If the text starts and ends with double quotes, remove them and wrap with single quotes
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1]
        text = f"'{text}'"
    
    # If the text starts and ends with single quotes, escape only the end if necessary
    elif text.startswith("'") and text.endswith("'"):
        text = text[1:-1]  # Remove the wrapping single quotes
        text = text.replace("\\'", "'")  # Avoid double escaping already escaped single quotes
        text = f"'{text}'"  # Re-wrap with single quotes

    else:
        # If the text ends with a quotation mark, escape it
        if text.endswith('"'):
            text = text[:-1] + '\\"'
        elif text.endswith("'"):
            text = text[:-1] + "\\'"

        # Wrap the entire text with single quotation marks
        text = f"'{text}'"

    return text

def process_initial_result(result):
    mistakes = []
    corrections = []
    explanations = []
    categories = []
    contexts = []
    corrected_text = ""

    fine_match = re.search(r'The submitted writing is fine.', result)
    mistakes_match = re.findall(r'M: (.*?)\n', result, re.DOTALL)
    corrections_match = re.findall(r'C: (.*?)\n', result, re.DOTALL)
    explanations_match = re.findall(r'E: (.*?)\n', result, re.DOTALL)
    categories_match = re.findall(r'T: (.*?)\n', result, re.DOTALL)
    contexts_match = re.findall(r'X: (.*?)\n', result, re.DOTALL)
    corrected_text_match = re.findall(r'Correction:\s*(.*?[\.\!\?])(?:\s|$)', result, re.DOTALL)

    if fine_match:
        mistakes.append("The submitted writing is fine.")
        corrections.append("The submitted writing is fine.")
        explanations.append("The submitted writing is fine.")
        categories.append("The submitted writing is fine.")
        contexts.append("The submitted writing is fine.")
    if mistakes_match:
        mistakes = [normalize_text(m.strip()) for m in mistakes_match]
    if corrections_match:
        corrections = [normalize_text(c.strip()) for c in corrections_match]
    if explanations_match:
        explanations = [format_text_for_json(e.strip()) for e in explanations_match]
    if categories_match:
        categories = [normalize_text(t.strip()) for t in categories_match]
    if contexts_match:
        contexts = [normalize_text(x.strip()) for x in contexts_match]
    if corrected_text_match:
        corrected_text = ' '.join(normalize_text(ct.strip()) for ct in corrected_text_match)

    return mistakes, corrections, explanations, categories, contexts, corrected_text

def process_further_result(result):
    if "Writing Style" in result:
        result = result.replace("Writing Style", "WritingStyle")
        
    feedback = {
        "Organization": {"mistakes": [], "corrections": [], "explanations": [], "categories": []},
        "Coherence": {"mistakes": [], "corrections": [], "explanations": [], "categories": []},
        "WritingStyle": {"mistakes": [], "corrections": [], "explanations": [], "categories": []}
    }

    def clean_text(text):
        return text.replace('[', '').replace(']', '').strip()

    # Extracting each section content
    sections = ["Organization", "Coherence", "WritingStyle"]
    for section in sections:
        section_pattern = rf"{section}:(.*?)(\n\n|\Z)"
        section_match = re.search(section_pattern, result, re.DOTALL)
        if section_match:
            section_content = section_match.group(1).strip()
            if section_content == "The submitted writing is fine.":
                feedback[section] = {"message": "The submitted writing is fine."}
            else:
                # Extracting mistakes, corrections, explanations, and categories within the section content
                mistakes_match = re.findall(r'M: (.*?)\n', section_content, re.DOTALL)
                corrections_match = re.findall(r'C: (.*?)\n', section_content, re.DOTALL)
                explanations_match = re.findall(r'E: (.*?)\n', section_content, re.DOTALL)
                categories_match = re.findall(r'T: (.*?)(?=\nM:|\nC:|$)', section_content, re.DOTALL)

                feedback[section]["mistakes"] = [clean_text(m) for m in mistakes_match]
                feedback[section]["corrections"] = [clean_text(c) for c in corrections_match]
                feedback[section]["explanations"] = [clean_text(e) for e in explanations_match]
                feedback[section]["categories"] = [clean_text(t) for t in categories_match]

    # Converting section names to camel case
    feedback = {
        "organization": feedback["Organization"],
        "coherence": feedback["Coherence"],
        "writingStyle": feedback["WritingStyle"]
    }

    return feedback

question_prompts = {
    'revision': REVISION_PROMPT,
    'synonyms': SYNONYMS_PROMPT,
    'academic_sentence': ACADEMIC_SENTENCE_PROMPT,
    'argument_strengthening': ARGUMENT_STRENGTHENING_PROMPT,
    'coherence': COHERENCE_PROMPT,
    'organization': ORGANIZATION_PROMPT,
}

@app.route('/question/suggest-type', methods=['POST'])
def suggest_question_type():
    data = request.json
    text = data['lastThreeSubmissions']
    model = '3.5-turbo-1106'

    deployment = deployment_gpt35 if model == '3.5-turbo-1106' else deployment_gpt4o

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": 'Suggest a question type based on the following text. Question types are revision, synonyms, academic sentence, argument strengthening, coherence, or organization. Only provide the question type, don\'t add anything else like an explanation or reasoning.'},
            {"role": "user", "content": text}
        ],
        max_tokens=50
    )

    response_content = response.choices[0].message.content.strip()
    logging.info(f"Question type suggestion: {response_content}")

    question_type = None
    for q_type in question_prompts.keys():
        if q_type in response_content.lower():
            question_type = q_type
            break

    if question_type in question_prompts:
        logger.info(f"Suggested question type from LLM: {question_type}")
        return jsonify({"type": question_type})
    return jsonify({"type": None})

@app.route('/question/generate', methods=['POST'])
def generate_question():
    data = request.json
    user_id = data['user_id']
    question_type = data['type']
    text = data['text']
    model = '4o'
    
    deployment = deployment_gpt35 if model == '3.5-turbo-1106' else deployment_gpt4o

    if question_type not in question_prompts:
        return jsonify({"error": "Invalid question type"}), 400

    prompt_template = question_prompts[question_type]
    if question_type in ['revision', 'synonyms', 'academic_sentence', 'argument_strengthening']:
        prompt = prompt_template.format(lastSubmission=text)
    else:
        prompt = prompt_template.format(text=text)

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_5},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    logger.info(f"Generated question response: {response}")

    output = response.choices[0].message.content

    metadata = {
        'type': question_type
    }

    question_match = re.search(r'Question:\s*(.*?)\n', output, re.DOTALL)
    if question_match:
        metadata['question'] = question_match.group(1).strip()
    
    answer_match = re.search(r'Answer:\s*(.*)', output, re.DOTALL)
    if answer_match:
        metadata['answer'] = answer_match.group(1).strip()

    if question_type in ['synonyms', 'argument_strengthening', 'coherence', 'organization']:
        options_match = re.search(r'Options:\s*(A.*?)(?=\nAnswer:)', output, re.DOTALL)
        if options_match:
            options_raw = options_match.group(1).strip()
            options = "\n".join([option.strip() for option in options_raw.split('\n')])
            metadata['options'] = options

        if question_type == 'synonyms':
            word_match = re.search(r'Word:\s*(.*?)\n', output, re.DOTALL)
            if word_match:
                metadata['word'] = word_match.group(1).strip()
        elif question_type == 'argument_strengthening':
            argument_match = re.search(r'Argument:\s*(.*?)\n', output, re.DOTALL)
            if argument_match:
                metadata['argument'] = argument_match.group(1).strip()
        elif question_type in ['organization', 'coherence']:
            scenario_match = re.search(r'Scenario:\s*(.*?)\nOptions:', output, re.DOTALL)
            if scenario_match:
                metadata['scenario'] = scenario_match.group(1).strip()
    else:
        if question_type == 'revision':
            text_match = re.search(r'Text:\s*(.*?)\n', output, re.DOTALL)
            if text_match:
                metadata['text'] = text_match.group(1).strip()
        elif question_type == 'academic_sentence':
            sentence_match = re.search(r'Sentence:\s*(.*)', output, re.DOTALL)
            if sentence_match:
                metadata['sentence'] = sentence_match.group(1).strip()

    document_id = chroma_langchain_handler.add_document(user_id, metadata['question'], metadata)

    metadata['document_id'] = document_id

    return jsonify(metadata)

@app.route('/question/academic_sentence_correction', methods=['POST'])
def academic_sentence_correction():
    data = request.json
    original_sentence = data['original_sentence']
    corrected_sentence = data['corrected_sentence']
    model = '3.5-turbo-1106'
    
    deployment = deployment_gpt35 if model == '3.5-turbo-1106' else deployment_gpt4o

    prompt = ACADEMIC_SENTENCE_CORRECTING_PROMPT.format(
        original_sentence=original_sentence,
        corrected_sentence=corrected_sentence
    )

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": 'You are an expert in academic writing. I will provide you with an original sentence and a corrected sentence. Your task is to evaluate whether the corrected sentence is good or not good based on academic writing standards.'},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    output = response.choices[0].message.content

    answer_match = re.search(r'Answer:\s*(.*)', output)

    if answer_match:
        answer = answer_match.group(1).strip()
        return jsonify({
            "type": "academic_sentence_evaluation",
            "answer": answer
        })
    else:
        return jsonify({"error": "Failed to parse the generated output"}), 500
    
@app.route('/question/explain-answer', methods=['POST'])
def explain_answer():
    data = request.json
    question = data['question']
    text = data.get('text', '')
    word = data.get('word', '')
    sentence = data.get('sentence', '')
    options = data.get('options', [])
    scenario = data.get('scenario', [])
    correct_answer = data['correct_answer']
    user_answer = data['user_answer']
    model = '4o'
    
    deployment = deployment_gpt4o if model == '4o' else deployment_gpt35

    options_str = '\n'.join(options)
    scenario_str = '\n'.join(scenario)

    prompt = EXPLAIN_ANSWER.format(
        question=question,
        text=text,
        word=word,
        sentence=sentence,
        options=options_str,
        scenario=scenario_str,
        correct_answer=correct_answer,
        user_answer=user_answer
    )

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": "You are an expert in the subject matter. I will provide you with a question, the correct answer, and the user's answer."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    output = response.choices[0].message.content

    explanation_match = re.search(r'Explanation:\s*(.*)', output, re.DOTALL)

    if explanation_match:
        explanation = explanation_match.group(1).strip()
        return jsonify({
            "type": "explanation",
            "explanation": explanation
        })
    else:
        return jsonify({"error": "Failed to parse the generated output"}), 500

@app.route('/review/generate', methods=['POST'])
def generate_review():
    model = request.json.get('model', '3.5-turbo-1106')
    coherence_text = request.json.get('coherence_text', '')
    organization_text = request.json.get('organization_text', '')

    logging.info(f"Received model: {model}")

    coherence_tip = ''
    organization_tip = ''

    if model not in ['3.5-turbo-1106', '4o']:
        return jsonify({"error": "Invalid model"}), 400

    deployment = deployment_gpt4o if model == '4o' else deployment_gpt35

    if coherence_text:
        coherence_prompt = COHERENCE_TIP_PROMPT.format(text=coherence_text)
        coherence_response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_6},
                {"role": "user", "content": coherence_prompt}
            ],
            max_tokens=1000
        )
        coherence_tip = coherence_response.choices[0].message.content.strip()
    elif organization_text:
        organization_prompt = ORGANIZATION_TIP_PROMPT.format(text=organization_text)
        organization_response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_6},
                {"role": "user", "content": organization_prompt}
            ],
            max_tokens=1000
        )
        organization_tip = organization_response.choices[0].message.content.strip()
    else:
        return jsonify({"error": "No coherence/organization text provided"}), 400

    return jsonify({
        "coherence_tip": coherence_tip,
        "organization_tip": organization_tip
    })

# FOR TESTING ONLY
@app.route('/question/add', methods=['POST'])
def add_question():
    data = request.json
    user_id = data.get('user_id')
    question_type = data.get('type')
    
    if not user_id or not question_type:
        return jsonify({"error": "user_id and type are required"}), 400

    # Metadata construction based on the provided data
    metadata = {
        'type': question_type,
        'question': data.get('question', ''),
        'text': data.get('text', ''),
        'answer': data.get('answer', ''),
        'word': data.get('word', ''),
        'options': data.get('options', ''),
        'sentence': data.get('sentence', ''),
        'argument': data.get('argument', ''),
        'scenario': data.get('scenario', ''),
    }

    document_id = chroma_langchain_handler.add_document(user_id, metadata['question'], metadata)

    return jsonify({
        "type": metadata['type'],
        "question": metadata['question'],
        "text": metadata['text'],
        "answer": metadata['answer'],
        "word": metadata['word'],
        "options": metadata['options'],
        "sentence": metadata['sentence'],
        "argument": metadata['argument'],
        "scenario": metadata['scenario'],
        "document_id": document_id
    })

# FOR TESTING ONLY
@app.route('/question/get/<user_id>', methods=['GET'])
def get_questions(user_id):
    documents = chroma_langchain_handler.get_documents(user_id)

    result = []
    ids = documents.get('ids', [])
    metadatas = documents.get('metadatas', [])

    for doc_id, metadata in zip(ids, metadatas):
        result.append({
            "document_id": doc_id,
            "metadata": metadata
        })

    return jsonify(result)

@app.route('/quiz/similarity-search', methods=['POST'])
async def similarity_search():
    data = request.json
    user_id = data.get('user_id')
    query = data.get('query')
    k = data.get('k')
    quiz_history = data.get('quiz_history', [])

    if not query:
        return jsonify({"error": "No query provided"}), 400

    # Perform similarity search in ChromaDB
    results = chroma_langchain_handler.similarity_search(user_id, query, k)

    # Extract relevant information from the results
    questions = []
    found_question_ids = set()
    for result in results:
        metadata = result.metadata
        question_id = metadata.get("document_id", "")
        found_question_ids.add(question_id)
        question_data = {
            "question_id": question_id,
            "question_text": result.page_content,
            "question_type": metadata.get("type", ""),
            "options": metadata.get("options", "").split("\n") if metadata.get("options") else [],
            "correct_answer": metadata.get("answer", ""),
            "text": metadata.get("text", ""),
            "word": metadata.get("word", ""),
            "sentence": metadata.get("sentence", ""),
            "argument": metadata.get("argument", ""),
            "scenario": metadata.get("scenario", "").split("\n") if metadata.get("scenario") else [],
        }
        questions.append(question_data)

    # If quiz history is provided, give it to LLM along with the questions
    if quiz_history:
        new_questions_str = '\n'.join([f"ID: {q['question_id']}, Type: {q['question_type']}" for q in questions])
        quiz_history_str = '\n'.join([f"Quiz: {idx + 1}\n" + '\n'.join([f"Question ID: {q['question_id']}, Type: {q['question_type']}, Result: {q['result']}" for q in quiz['questions']]) for idx, quiz in enumerate(quiz_history)])

        selected_question_ids = await llm_decide_questions(new_questions_str, quiz_history_str)

        # Check for missing question IDs
        missing_question_ids = set(selected_question_ids) - found_question_ids
        if missing_question_ids:
            missing_documents = chroma_langchain_handler.get_documents_by_ids(user_id, list(missing_question_ids))
            for metadata, page_content in zip(missing_documents['metadatas'], missing_documents['documents']):
                question_data = {
                    "question_id": metadata.get("document_id", ""),
                    "question_text": page_content,
                    "question_type": metadata.get("type", ""),
                    "options": metadata.get("options", "").split("\n") if metadata.get("options") else [],
                    "correct_answer": metadata.get("answer", ""),
                    "text": metadata.get("text", ""),
                    "word": metadata.get("word", ""),
                    "sentence": metadata.get("sentence", ""),
                    "argument": metadata.get("argument", ""),
                    "scenario": metadata.get("scenario", "").split("\n") if metadata.get("scenario") else [],
                }
                questions.append(question_data)

        questions = [q for q in questions if q['question_id'] in selected_question_ids]

    return jsonify(questions)

def llm_decide_questions(new_questions, quiz_history):
    prompt = DECIDE_QUESTIONS.format(new_questions=new_questions, quiz_history=quiz_history)
    model = '4o'

    deployment = deployment_gpt4o if model == '4o' else deployment_gpt35

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": "You are an expert in spaced repetition and educational testing."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500
    )

    question_ids_str = response.choices[0].message.content
    matches = re.findall(r'\[(.*?)\]', question_ids_str)
    if matches:
        question_ids = matches[0].split(', ')
        question_ids = [q_id.strip() for q_id in question_ids]
        return question_ids

    matches = re.findall(r'(\w+(?:, \w+)*)', question_ids_str)
    if matches:
        question_ids = matches[0].split(', ')
        question_ids = [q_id.strip() for q_id in question_ids]
        return question_ids

    logging.error("Failed to extract question IDs from the LLM response.")
    return []

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8031)