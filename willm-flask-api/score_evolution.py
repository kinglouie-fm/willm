import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# List of excluded usernames
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

# Load the necessary JSON files
with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/texts.json', 'r') as texts_file:
    texts_data = json.load(texts_file)
with open('/Users/benthillen/Downloads/mongo/aggregated-data/scores.json', 'r') as scores_file:
    scores_data = json.load(scores_file)

# Map user IDs to usernames
user_id_to_username = map_user_ids_to_usernames(users_data)

# Filter scores by users that are not excluded
filtered_scores = [
    score for score in scores_data
    if user_id_to_username.get(score['user_id']['$oid'])  # Only include users that are mapped and not excluded
]

# Function to get just the date (day) part of the score timestamp
def get_day_from_timestamp(score_date):
    return score_date.date()

# Find the timestamp of the first score for non-excluded users
first_score_timestamp = min(
    int(score['date_created']['$date']['$numberLong']) for score in filtered_scores
)
first_score_date = datetime.fromtimestamp(first_score_timestamp / 1000, timezone.utc)

# Function to calculate the average score and the count of values
def calculate_average_and_count(scores):
    return (sum(scores) / len(scores), len(scores)) if scores else (None, 0)

# Function to aggregate scores by day
def aggregate_scores_by_day():
    scores_by_day = defaultdict(lambda: defaultdict(list))
    
    # Process scores and map them to texts and users
    for score in filtered_scores:
        user_id = score['user_id']['$oid']
        
        # Get the username for the user_id and skip excluded users
        username = user_id_to_username.get(user_id)
        if not username:
            continue  # Skip excluded users or those without a matching username

        # Convert the score's creation date into a datetime object
        score_timestamp = int(score['date_created']['$date']['$numberLong'])
        score_date = datetime.fromtimestamp(score_timestamp / 1000, timezone.utc)

        # Get the day part of the score date
        day = get_day_from_timestamp(score_date)

        # Extract scores for each writing element
        grammar_score = int(score['grammar']['$numberInt']) if 'grammar' in score else None
        vocabulary_score = int(score['vocabulary']['$numberInt']) if 'vocabulary' in score else None
        organization_score = int(score['organization']['$numberInt']) if 'organization' in score else None
        coherence_score = int(score['coherence']['$numberInt']) if 'coherence' in score else None
        writing_style_score = int(score['writing_style']['$numberInt']) if 'writing_style' in score else None

        # Append the scores to the corresponding day
        if grammar_score is not None:
            scores_by_day[day]['grammar'].append(grammar_score)
        if vocabulary_score is not None:
            scores_by_day[day]['vocabulary'].append(vocabulary_score)
        if organization_score is not None:
            scores_by_day[day]['organization'].append(organization_score)
        if coherence_score is not None:
            scores_by_day[day]['coherence'].append(coherence_score)
        if writing_style_score is not None:
            scores_by_day[day]['writing_style'].append(writing_style_score)

    # Prepare data for plotting
    plot_data = []
    for day, elements in sorted(scores_by_day.items()):
        for element, scores in elements.items():
            avg_score, count = calculate_average_and_count(scores)
            if avg_score is not None:
                plot_data.append({
                    'interval': day,
                    'writing_element': element,
                    'average_score': avg_score,
                    'count': count
                })

    return pd.DataFrame(plot_data)

# Function to aggregate scores by 3-day intervals
def aggregate_scores_by_interval():
    scores_by_interval = defaultdict(lambda: defaultdict(list))
    
    # Process scores and map them to texts and users
    for score in filtered_scores:
        user_id = score['user_id']['$oid']
        
        # Get the username for the user_id and skip excluded users
        username = user_id_to_username.get(user_id)
        if not username:
            continue  # Skip excluded users or those without a matching username

        # Convert the score's creation date into a datetime object
        score_timestamp = int(score['date_created']['$date']['$numberLong'])
        score_date = datetime.fromtimestamp(score_timestamp / 1000, timezone.utc)

        # Calculate 3-day interval index from the first score date
        days_diff = (score_date - first_score_date).days
        interval_index = days_diff // 3  # Group every 3 days into one interval

        # Extract scores for each writing element
        grammar_score = int(score['grammar']['$numberInt']) if 'grammar' in score else None
        vocabulary_score = int(score['vocabulary']['$numberInt']) if 'vocabulary' in score else None
        organization_score = int(score['organization']['$numberInt']) if 'organization' in score else None
        coherence_score = int(score['coherence']['$numberInt']) if 'coherence' in score else None
        writing_style_score = int(score['writing_style']['$numberInt']) if 'writing_style' in score else None

        # Append the scores to the corresponding interval
        if grammar_score is not None:
            scores_by_interval[interval_index]['grammar'].append(grammar_score)
        if vocabulary_score is not None:
            scores_by_interval[interval_index]['vocabulary'].append(vocabulary_score)
        if organization_score is not None:
            scores_by_interval[interval_index]['organization'].append(organization_score)
        if coherence_score is not None:
            scores_by_interval[interval_index]['coherence'].append(coherence_score)
        if writing_style_score is not None:
            scores_by_interval[interval_index]['writing_style'].append(writing_style_score)

    # Prepare data for plotting
    plot_data = []
    for interval, elements in sorted(scores_by_interval.items()):
        interval_label = first_score_date + timedelta(days=interval * 3)  # Convert interval index back to date
        for element, scores in elements.items():
            avg_score, count = calculate_average_and_count(scores)
            if avg_score is not None:
                plot_data.append({
                    'interval': interval_label,
                    'writing_element': element,
                    'average_score': avg_score,
                    'count': count
                })

    return pd.DataFrame(plot_data)

# Add text annotations for the count of values at each data point (only once per interval)
def annotate_once_per_interval(plot_df):
    # Group by interval to ensure only one annotation per interval
    interval_counts = plot_df.groupby('interval')['count'].first().reset_index()  # Use the count from the first writing element

    for i in range(interval_counts.shape[0]):
        plt.text(
            interval_counts['interval'].iloc[i],  # x position (interval date)
            plot_df['average_score'].max() + 0.1,  # y position slightly above the max score for better visibility
            f'n={interval_counts["count"].iloc[i]}', 
            horizontalalignment='center',  # Center the text horizontally
            verticalalignment='bottom',    # Align text at the bottom so it's above the data point
            size='small', color='black', weight='semibold'
        )

# Function to plot the data
def plot_scores(option="day"):
    if option == "day":
        plot_df = aggregate_scores_by_day()
        xlabel = "Date"
    else:
        plot_df = aggregate_scores_by_interval()
        xlabel = "3-Day Intervals"

    # Create the plot
    plt.figure(figsize=(12, 8))
    sns.lineplot(data=plot_df, x='interval', y='average_score', hue='writing_element', marker='o')

    # Annotate once per interval
    annotate_once_per_interval(plot_df)

    plt.title(f'Mean Score of Each Writing Element Over {xlabel}')
    plt.xlabel(xlabel)
    plt.ylabel('Average Score')

    # Define the y-axis ticks
    y_min = plot_df['average_score'].min()  # Get the minimum score
    y_max = plot_df['average_score'].max()  # Get the maximum score

    # Round y_min and y_max to the nearest 0.2 for cleaner ticks
    y_min = np.floor(y_min * 5) / 5  # Round down to the nearest multiple of 0.2
    y_max = np.ceil(y_max * 5) / 5   # Round up to the nearest multiple of 0.2

    # Create ticks with 0.2 intervals
    yticks = np.arange(y_min, y_max + 0.2, 0.2)  # Adjust range with 0.2 step
    plt.yticks(yticks)

    # Rotate the x-axis labels for better readability
    plt.xticks(rotation=45)

    # Show grid lines for better visualization
    plt.grid(True)

    # Adjust the layout
    plt.tight_layout()

    # Display the plot
    plt.legend(title='Writing Element')
    plt.show()

# Example usage
plot_scores(option="interval")
