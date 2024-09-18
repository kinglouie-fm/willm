# WILLM: Writing Improvement with LLMs

WILLM is a system designed to enhance academic writing by leveraging LLMs for both short-term and long-term improvements. Users receive real-time feedback on grammar, vocabulary, coherence, organization, and writing style. The system also offers quizzes and personalized reviews to track progress over time and especially improving academic writing in a long-term perspective by enhancing users' long-term memory.

## Features

- **Short-Term Writing Improvement**  
  Receive feedback on grammar, vocabulary, organization, coherence, and writing style. 
  - Grammar and vocabulary mistakes are highlighted.
  - Explanations for corrections are provided.
  - Interactive modes: auto-apply corrections or practice with manual corrections.
  
- **Long-Term Writing Improvement**  
  Focused quizzes and detailed reviews to track writing progress and reinforce learning.
  - Customizable quizzes generated based on spaced repetition.
  - Personalized reviews with tips and areas of improvement.

- **Gamification**  
  Stay motivated with badges, levels, and streak tracking.

## Architecture Overview

The system is built using several key components:
- **Frontend**: Built with Vue.js for a dynamic user interface.
- **Backend**: Powered by NestJS and Flask for API management and backend logic.
- **LLM Processing**: Integrated with GPT-3.5 and GPT-4o for high-quality feedback.
- **Database**: MongoDB is used to store user data, session logs, writing submissions, quizzes, and reviews.
- **Vector Search**: ChromaDB is used for similarity searches to aid in quiz generation and spaced repetition.

The system is containerized using Docker Compose for easy deployment and scalability.

## Usage

1. **Register and Login**: Sign up for an account to access the tool.
2. **Upload a Writing Sample**: Submit a section of your writing for feedback.
3. **Review Feedback**: Receive instant feedback on grammar, vocabulary, and writing structure.
4. **Take Quizzes**: Test your writing improvement with personalized quizzes.
5. **Track Progress**: View detailed reviews and track your writing progress through your profile.

## System Requirements

- **Docker** and **Docker Compose** installed on your machine.
- **Node.js** and **npm/yarn** if you plan to run the frontend/backend locally.

## License

No license yet.

---

\*This project was built as part of a bachelor thesis on RWTH University, Chair of Databases and Information Systems (i5)
