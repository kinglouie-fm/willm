from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
import re
import aiohttp
import logging
from chroma_langchain import chroma_langchain_handler
from prompts import (
    SYSTEM_PROMPT_1, SYSTEM_PROMPT_2, SYSTEM_PROMPT_4, SYSTEM_PROMPT_5,
    SYSTEM_PROMPT_6, UNIFIED_PROMPT, UNIFIED_PROMPT_2, SCORES, 
    REVISION_PROMPT, SYNONYMS_PROMPT, ACADEMIC_SENTENCE_PROMPT, ACADEMIC_SENTENCE_CORRECTING_PROMPT,
    ARGUMENT_STRENGTHENING_PROMPT, EXPLAIN_ANSWER, COHERENCE_TIP_PROMPT, ORGANIZATION_TIP_PROMPT, DECIDE_QUESTIONS
)

load_dotenv()

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            "max_tokens": 1000
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
    'academic_sentence': ACADEMIC_SENTENCE_PROMPT,
    'argument_strengthening': ARGUMENT_STRENGTHENING_PROMPT,
    'coherence': COHERENCE_TIP_PROMPT,
    'organization': ORGANIZATION_TIP_PROMPT,
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
    user_id = data['user_id']
    question_type = data['type']
    text = data['text']
    
    if question_type not in question_prompts:
        return jsonify({"error": "Invalid question type"}), 400

    prompt_template = question_prompts[question_type]
    prompt = prompt_template.format(text=text)

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_5},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    logger.info(f"Generated question response: {response}")

    output = response.choices[0].message.content

    # Initialize metadata with the type key
    metadata = {
        'type': question_type
    }

    # Extract and add relevant keys to the metadata
    question_match = re.search(r'Question:\s*(.*?)\n', output, re.DOTALL)
    if question_match:
        metadata['question'] = question_match.group(1).strip()
    
    answer_match = re.search(r'Answer:\s*(.*)', output, re.DOTALL)
    if answer_match:
        metadata['answer'] = answer_match.group(1).strip()

    if question_type in ['synonyms', 'argument_strengthening', 'coherence', 'organization']:
        options_match = re.search(r'Options:\s*(.*?)\n', output, re.DOTALL)
        if options_match:
            metadata['options'] = options_match.group(1).strip()

        if question_type == 'synonyms':
            word_match = re.search(r'Word:\s*(.*?)\n', output, re.DOTALL)
            if word_match:
                metadata['word'] = word_match.group(1).strip()
        elif question_type == 'argument_strengthening':
            argument_match = re.search(r'Argument:\s*(.*?)\n', output, re.DOTALL)
            if argument_match:
                metadata['argument'] = argument_match.group(1).strip()
        elif question_type == 'coherence':
            excerpts_match = re.search(r'Excerpts:\s*(.*?)\n', output, re.DOTALL)
            if excerpts_match:
                metadata['excerpts'] = excerpts_match.group(1).strip()
        elif question_type == 'organization':
            sentences_match = re.search(r'Sentences:\s*(.*?)\n', output, re.DOTALL)
            if sentences_match:
                metadata['sentences'] = sentences_match.group(1).strip()
    else:
        if question_type == 'revision':
            text_match = re.search(r'Text:\s*(.*?)\n', output, re.DOTALL)
            if text_match:
                metadata['text'] = text_match.group(1).strip()
        elif question_type == 'academic_sentence':
            sentence_match = re.search(r'Sentence:\s*(.*?)\n', output, re.DOTALL)
            if sentence_match:
                metadata['sentence'] = sentence_match.group(1).strip()

    document_id = chroma_langchain_handler.add_document(user_id, metadata['question'], metadata)

    # Add document_id to the metadata
    metadata['document_id'] = document_id

    return jsonify(metadata)

@app.route('/question/academic_sentence_correction', methods=['POST'])
def academic_sentence_correction():
    data = request.json
    original_sentence = data['original_sentence']
    corrected_sentence = data['corrected_sentence']

    prompt = ACADEMIC_SENTENCE_CORRECTING_PROMPT.format(
        original_sentence=original_sentence,
        corrected_sentence=corrected_sentence
    )

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": 'You are an expert in academic writing. I will provide you with an original sentence and a corrected sentence. Your task is to evaluate whether the corrected sentence is good or not good based on academic writing standards.'},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    logger.info(f"Academic sentence correction response: {response}")

    output = response.choices[0].message.content

    answer_match = re.search(r'Answer:\s*(Good|Not Good)', output)

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
    excerpts = data.get('excerpts', [])
    correct_answer = data['correct_answer']
    user_answer = data['user_answer']

    options_str = '\n'.join(options)
    excerpts_str = '\n'.join(excerpts)

    prompt = EXPLAIN_ANSWER.format(
        question=question,
        text=text,
        word=word,
        sentence=sentence,
        options=options_str,
        excerpts=excerpts_str,
        correct_answer=correct_answer,
        user_answer=user_answer
    )

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert in the subject matter. I will provide you with a question, the correct answer, and the user's answer."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    logger.info(f"Explain answer response: {response}")

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
    data = request.json
    coherence_text = data.get('coherence_text', '')
    organization_text = data.get('organization_text', '')

    coherence_tip = ''
    organization_tip = ''

    if coherence_text:
        coherence_prompt = COHERENCE_TIP_PROMPT.format(text=coherence_text)
        coherence_response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_6},
                {"role": "user", "content": coherence_prompt}
            ],
            max_tokens=1000
        )
        coherence_tip = coherence_response.choices[0].message.content.strip()

    if organization_text:
        organization_prompt = ORGANIZATION_TIP_PROMPT.format(text=organization_text)
        organization_response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_6},
                {"role": "user", "content": organization_prompt}
            ],
            max_tokens=1000
        )
        organization_tip = organization_response.choices[0].message.content.strip()

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
    logging.info(f"user: {user_id}, type: {question_type}")
    
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
        'excerpts': data.get('excerpts', ''),
        'sentences': data.get('sentences', '')
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
        "excerpts": metadata['excerpts'],
        "sentences": metadata['sentences'],
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
    for result in results:
        metadata = result["metadata"]
        question_data = {
            "question_id": metadata.get("id"),
            "question_text": result["document"],
            "question_type": metadata.get("type", ""),
            "options": metadata.get("options", "").split("\n"),
            "correct_answer": metadata.get("answer", ""),
        }
        questions.append(question_data)

    # If quiz history is provided, give it to LLM along with the questions
    if quiz_history:
        new_questions_str = '\n'.join([f"ID: {q['question_id']}, Type: {q['question_type']}" for q in questions])
        quiz_history_str = '\n'.join([f"Quiz: {idx + 1}\n" + '\n'.join([f"Type: {q['question_type']}, Result: {q['result']}" for q in quiz['questions']]) for idx, quiz in enumerate(quiz_history)])

        selected_question_ids = await llm_decide_questions(new_questions_str, quiz_history_str)
        questions = [q for q in questions if q['question_id'] in selected_question_ids]

    return jsonify(questions)

async def llm_decide_questions(new_questions, quiz_history):
    prompt = DECIDE_QUESTIONS.format(new_questions=new_questions, quiz_history=quiz_history)

    async with aiohttp.ClientSession() as session:
        async with session.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {openai.api_key}',
                'Content-Type': 'application/json'
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are an expert in spaced repetition and educational testing."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 500
            }
        ) as response:
            response_json = await response.json()
            question_ids_str = response_json['choices'][0]['message']['content']
            question_ids = re.findall(r'\[(.*?)\]', question_ids_str)[0].split(', ')
            return question_ids


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)