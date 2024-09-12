import json
import numpy as np  # type: ignore
import scipy.stats as stats  # type: ignore
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import norm, probplot

# Function to convert NumPy types to Python native types
def convert_to_native_types(data):
    if isinstance(data, np.generic):
        return data.item()
    if isinstance(data, dict):
        return {key: convert_to_native_types(value) for key, value in data.items()}
    if isinstance(data, list):
        return [convert_to_native_types(item) for item in data]
    return data

# Function to compute the median score across multiple submissions for a user
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.median(scores) if scores else None

# Function to plot histogram with normal curve
def histogram_with_normal_curve(data, title):
    plt.figure(figsize=(8, 6))
    
    # Plot histogram with KDE (Kernel Density Estimate) for better visualization
    sns.histplot(data, kde=True, color='blue', stat="density", bins=10, label="Data")
    
    # Calculate mean and standard deviation of the data
    mu, std = np.mean(data), np.std(data)
    
    # Generate normal curve based on data range
    xmin, xmax = plt.xlim()  # Get current x-axis limits from the plot
    x = np.linspace(xmin, xmax, 100)
    p = norm.pdf(x, mu, std)
    
    # Overlay normal distribution curve
    plt.plot(x, p, 'k', linewidth=2, label="Normal Curve")
    
    # Add title and labels
    plt.title(f"Histogram and Normal Curve - {title}")
    plt.xlabel('Difference in Scores')
    plt.ylabel('Density')
    plt.legend()
    plt.grid(True)
    plt.show()

# Function to plot Q-Q plot
def qq_plot(data, title):
    plt.figure(figsize=(8, 6))
    stats.probplot(data, dist="norm", plot=plt)
    plt.title(f"Q-Q Plot - {title}")
    plt.grid(True)
    plt.show()

# Load pre-test and post-test data from JSON files
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

# Initialize empty dictionaries for storing the differences for each writing element
score_differences = {"grammar": [], "vocabulary": [], "organization": [], "coherence": [], "writing_style": []}

# Extract pre-test and post-test scores and compute the differences for each user
for user, submissions in pre_test_data.items():
    if user in post_test_data:  # Ensure user exists in both datasets
        for element in score_differences:
            pre_aggregated_score = aggregate_scores(submissions, element)
            post_aggregated_score = aggregate_scores(post_test_data[user], element)
            if pre_aggregated_score is not None and post_aggregated_score is not None:
                score_differences[element].append(post_aggregated_score - pre_aggregated_score)

# Shapiro-Wilk Test for normality on the differences
alpha = 0.05
normality_results = {}

for element in score_differences:
    if len(score_differences[element]) > 2:  # Shapiro-Wilk requires at least 3 data points
        stat, p_value = stats.shapiro(score_differences[element])
        normality_results[element] = {
            "normal": p_value > alpha,
            "p_value": p_value
        }
        print(f"{element.capitalize()} - Shapiro-Wilk p-value: {p_value}")

        # After the Shapiro-Wilk test, plot the histogram with normal curve
        histogram_with_normal_curve(score_differences[element], f'{element.capitalize()} Differences')

        # Also plot the Q-Q plot for normality check
        qq_plot(score_differences[element], f'{element.capitalize()} Differences')
    else:
        normality_results[element] = {
            "normal": None,
            "p_value": None,
            "reason": "Insufficient data for normality test"
        }
        print(f"{element.capitalize()} - Insufficient data for Shapiro-Wilk test")

# Convert NumPy types to native Python types
normality_results = convert_to_native_types(normality_results)

# Save normality results to a JSON file
with open('/Users/benthillen/Downloads/mongo/evaluation/normality_results.json', 'w') as outfile:
    json.dump(normality_results, outfile, indent=4)
