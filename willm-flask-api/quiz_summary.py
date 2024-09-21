import json

# Paths to your data files
users_file_path = '/Users/benthillen/Downloads/mongo/aggregated-data/users.json'
quizzes_file_path = '/Users/benthillen/Downloads/mongo/aggregated-data/quizzes.json'
quiz_schedules_file_path = '/Users/benthillen/Downloads/mongo/aggregated-data/quizschedules.json'

# Define the list of excluded usernames (if applicable)
excluded_usernames = [
    'thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme',
    'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas'
]

# Function to map user_id to username
def map_user_ids_to_usernames(users_data):
    user_id_to_username = {}
    for user in users_data:
        user_id = user['_id']
        username = user.get('username')
        if username not in excluded_usernames:
            user_id_to_username[user_id] = username
    return user_id_to_username

# Load the users data to map user IDs to usernames
with open(users_file_path, 'r') as users_file:
    users_data = json.load(users_file)
    user_id_to_username = map_user_ids_to_usernames(users_data)

# Initialize dictionaries to store the results for each user and global statistics
user_data = {}
global_stats = {
    'total_quizzes': 0,
    'completed_quizzes': 0,
    'total_questions': 0,
    'correct_answers': 0,
    'quiz_types': {}
}

# Load the quiz schedules to calculate total quizzes generated and completed
with open(quiz_schedules_file_path, 'r') as quiz_schedules_file:
    quiz_schedules_data = json.load(quiz_schedules_file)
    
    for schedule in quiz_schedules_data:
        user_id = schedule['user_id']['$oid']
        username = user_id_to_username.get(user_id)
        
        if username:
            total_quizzes = int(schedule['total_quizzes']['$numberInt'])
            completed_quizzes = int(schedule['completed_quizzes']['$numberInt'])
            
            if username not in user_data:
                user_data[username] = {
                    'total_quizzes': 0,
                    'completed_quizzes': 0,
                    'total_questions': 0,
                    'correct_answers': 0,
                    'quiz_types': {}
                }
            
            user_data[username]['total_quizzes'] += total_quizzes
            user_data[username]['completed_quizzes'] += completed_quizzes
            
            # Update global stats
            global_stats['total_quizzes'] += total_quizzes
            global_stats['completed_quizzes'] += completed_quizzes

# Load the quizzes to calculate questions attempted and correct answers
with open(quizzes_file_path, 'r') as quizzes_file:
    quizzes_data = json.load(quizzes_file)
    
    for quiz in quizzes_data:
        user_id = quiz['user_id']['$oid']
        username = user_id_to_username.get(user_id)
        
        if username and quiz.get('completed', False):
            questions = quiz['questions']
            for question in questions:
                question_type = question['question_type']
                
                # Ensure that question type is tracked in user_data
                if question_type not in user_data[username]['quiz_types']:
                    user_data[username]['quiz_types'][question_type] = {
                        'total_questions': 0,
                        'correct_answers': 0
                    }
                # Ensure that question type is tracked globally
                if question_type not in global_stats['quiz_types']:
                    global_stats['quiz_types'][question_type] = {
                        'total_questions': 0,
                        'correct_answers': 0
                    }
                
                # Update user-specific stats
                user_data[username]['total_questions'] += 1
                user_data[username]['quiz_types'][question_type]['total_questions'] += 1
                
                # Update global stats
                global_stats['total_questions'] += 1
                global_stats['quiz_types'][question_type]['total_questions'] += 1
                
                if question.get('result', False):
                    user_data[username]['correct_answers'] += 1
                    user_data[username]['quiz_types'][question_type]['correct_answers'] += 1
                    
                    global_stats['correct_answers'] += 1
                    global_stats['quiz_types'][question_type]['correct_answers'] += 1

# Calculate completion rate and accuracy rate for each user
for username, data in user_data.items():
    total_quizzes = data['total_quizzes']
    completed_quizzes = data['completed_quizzes']
    total_questions = data['total_questions']
    correct_answers = data['correct_answers']
    
    # Calculate completion and accuracy rates
    if total_quizzes > 0:
        data['completion_rate'] = (completed_quizzes / total_quizzes) * 100
    else:
        data['completion_rate'] = 0
    
    if total_questions > 0:
        data['accuracy_rate'] = (correct_answers / total_questions) * 100
    else:
        data['accuracy_rate'] = 0
    
    # Calculate accuracy rate for each quiz type
    for quiz_type, quiz_data in data['quiz_types'].items():
        if quiz_data['total_questions'] > 0:
            quiz_data['accuracy_rate'] = (quiz_data['correct_answers'] / quiz_data['total_questions']) * 100
        else:
            quiz_data['accuracy_rate'] = 0

# Calculate global completion and accuracy rates
if global_stats['total_quizzes'] > 0:
    global_stats['completion_rate'] = (global_stats['completed_quizzes'] / global_stats['total_quizzes']) * 100
else:
    global_stats['completion_rate'] = 0

if global_stats['total_questions'] > 0:
    global_stats['accuracy_rate'] = (global_stats['correct_answers'] / global_stats['total_questions']) * 100
else:
    global_stats['accuracy_rate'] = 0

# Calculate global accuracy rate for each quiz type
for quiz_type, quiz_data in global_stats['quiz_types'].items():
    if quiz_data['total_questions'] > 0:
        quiz_data['accuracy_rate'] = (quiz_data['correct_answers'] / quiz_data['total_questions']) * 100
    else:
        quiz_data['accuracy_rate'] = 0

# Display global results
print("Global Stats:")
print(f"  Total Quizzes Generated: {global_stats['total_quizzes']}")
print(f"  Total Quizzes Completed: {global_stats['completed_quizzes']}")
print(f"  Total Questions Attempted: {global_stats['total_questions']}")
print(f"  Total Questions Correct: {global_stats['correct_answers']}")
print(f"  Global Completion Rate: {global_stats['completion_rate']:.2f}%")
print(f"  Global Accuracy Rate: {global_stats['accuracy_rate']:.2f}%")
print("  Quiz Types Breakdown:")
for quiz_type, quiz_data in global_stats['quiz_types'].items():
    print(f"    Quiz Type: {quiz_type}")
    print(f"      Total Questions: {quiz_data['total_questions']}")
    print(f"      Correct Answers: {quiz_data['correct_answers']}")
    print(f"      Accuracy Rate: {quiz_data['accuracy_rate']:.2f}%")

# Display the results for each user
# for username, data in user_data.items():
#     print(f"\nUser: {username}")
#     print(f"  Total Quizzes Generated: {data['total_quizzes']}")
#     print(f"  Total Quizzes Completed: {data['completed_quizzes']}")
#     print(f"  Total Questions Attempted: {data['total_questions']}")
#     print(f"  Total Questions Correct: {data['correct_answers']}")
#     print(f"  Completion Rate: {data['completion_rate']:.2f}%")
#     print(f"  Accuracy Rate: {data['accuracy_rate']:.2f}%")
#     print(f"  Quiz Types Breakdown:")
#     for quiz_type, quiz_data in data['quiz_types'].items():
#         print(f"    Quiz Type: {quiz_type}")
#         print(f"      Total Questions: {quiz_data['total_questions']}")
#         print(f"      Correct Answers: {quiz_data['correct_answers']}")
#         print(f"      Accuracy Rate: {quiz_data['accuracy_rate']:.2f}%")

# Save results to a file if needed
with open('/Users/benthillen/Downloads/mongo/evaluation/quiz_data_summary.json', 'w') as output_file:
    json.dump({"global_stats": global_stats}, output_file, indent=4)

print("Results saved to quiz_data_summary.json")
