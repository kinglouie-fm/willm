import json
import numpy as np  # type: ignore
import seaborn as sns  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import pandas as pd  # type: ignore

# List of excluded usernames
excluded_usernames = [
    'thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme',
    'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas'
]

# Load the users data
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)

# Initialize lists to hold gamification data
xp_list = []
daily_streaks_list = []
weekly_streaks_list = []
badges_count_list = []
quizzes_completed_list = []
correct_answers_list = []

# Process each user in the dataset
for user in users_data:
    username = user.get('username')
    
    # Skip excluded users
    if username in excluded_usernames:
        continue
    
    # Extract gamification metrics
    xp = user.get('xp', 0)
    daily_streak = user.get('daily_streak', 0)
    weekly_streak = user.get('weekly_streak', 0)
    
    badges = user.get('badges', [])
    quizzes_completed = user.get('achievements', {}).get('quizzes_completed', 0)
    correct_answers = user.get('achievements', {}).get('correct_answers', 0)
    
    # Append to respective lists
    xp_list.append(xp)
    daily_streaks_list.append(daily_streak)
    weekly_streaks_list.append(weekly_streak)
    badges_count_list.append(len(badges))
    
    # Handle quizzes_completed and correct_answers as either list or integer
    if isinstance(quizzes_completed, list):
        quizzes_completed_list.append(len(quizzes_completed))
    else:
        quizzes_completed_list.append(quizzes_completed)
    
    if isinstance(correct_answers, list):
        correct_answers_list.append(len(correct_answers))
    else:
        correct_answers_list.append(correct_answers)

# Calculate descriptive statistics
def calculate_statistics(data_list):
    return {
        'mean': np.mean(data_list),
        'median': np.median(data_list),
        'min': np.min(data_list),
        'max': np.max(data_list),
        'std_dev': np.std(data_list)
    }

# Print the results for each gamification metric
print("Descriptive Statistics for Gamification Metrics:\n")

print("XP:")
print(calculate_statistics(xp_list))

print("\nDaily Streaks:")
print(calculate_statistics(daily_streaks_list))

print("\nWeekly Streaks:")
print(calculate_statistics(weekly_streaks_list))

print("\nBadges Count:")
print(calculate_statistics(badges_count_list))

print("\nQuizzes Completed:")
print(calculate_statistics(quizzes_completed_list))

print("\nCorrect Answers:")
print(calculate_statistics(correct_answers_list))

# Create a DataFrame for seaborn plotting
df = pd.DataFrame({
    'XP': xp_list,
    'Daily Streaks': daily_streaks_list,
    'Weekly Streaks': weekly_streaks_list,
    'Badges Count': badges_count_list,
    'Quizzes Completed': quizzes_completed_list,
    'Correct Answers': correct_answers_list
})

# Plot XP Boxplot with Jitter
plt.figure(figsize=(6, 4))
sns.boxplot(y=xp_list, showfliers=False)
sns.stripplot(y=xp_list, color='black', jitter=True, alpha=0.5)
plt.title('XP Distribution')
plt.ylabel('XP')
plt.tight_layout()
plt.show()

# Plot Daily and Weekly Streaks in the Same Plot
plt.figure(figsize=(6, 4))
sns.boxplot(data=[daily_streaks_list, weekly_streaks_list], showfliers=False)
sns.stripplot(data=[daily_streaks_list, weekly_streaks_list], color='black', jitter=True, alpha=0.5)
plt.xticks([0, 1], ['Daily Streaks', 'Weekly Streaks'])
plt.title('Daily and Weekly Streaks Distribution')
plt.ylabel('Streak Count')
plt.tight_layout()
plt.show()

# Plot Badges Count Boxplot with Jitter
plt.figure(figsize=(6, 4))
sns.boxplot(y=badges_count_list, showfliers=False)
sns.stripplot(y=badges_count_list, color='black', jitter=True, alpha=0.5)
plt.title('Badges Count Distribution')
plt.ylabel('Badges Count')
plt.tight_layout()
plt.show()

# Plot Quizzes Completed Boxplot with Jitter
plt.figure(figsize=(6, 4))
sns.boxplot(y=quizzes_completed_list, showfliers=False)
sns.stripplot(y=quizzes_completed_list, color='black', jitter=True, alpha=0.5)
plt.title('Quizzes Completed Distribution')
plt.ylabel('Quizzes Completed')
plt.tight_layout()
plt.show()

# Plot Correct Answers Boxplot with Jitter
plt.figure(figsize=(6, 4))
sns.boxplot(y=correct_answers_list, showfliers=False)
sns.stripplot(y=correct_answers_list, color='black', jitter=True, alpha=0.5)
plt.title('Correct Answers Distribution')
plt.ylabel('Correct Answers')
plt.tight_layout()
plt.show()