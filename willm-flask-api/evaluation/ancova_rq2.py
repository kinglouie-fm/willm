import json
import numpy as np  # type: ignore
import pandas as pd  # type: ignore
import statsmodels.api as sm  # type: ignore
from statsmodels.formula.api import ols  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import seaborn as sns  # type: ignore
from scipy.stats import zscore  # type: ignore
from statsmodels.graphics.gofplots import qqplot # type: ignore

# Load necessary data files
with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_preTest.json', 'r') as pre_file:
    pre_test_data = json.load(pre_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_scores_postTest.json', 'r') as post_file:
    post_test_data = json.load(post_file)

with open('/Users/benthillen/Downloads/mongo/aggregated-data/users.json', 'r') as users_file:
    users_data = json.load(users_file)

with open('/Users/benthillen/Downloads/mongo/aggregated-data/reviews.json', 'r') as review_file:
    review_data = json.load(review_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_submission_counts.json', 'r') as submission_file:
    submission_counts = json.load(submission_file)

with open('/Users/benthillen/Downloads/mongo/evaluation/user_quiz_counts.json', 'r') as quiz_file:
    user_quiz_data = json.load(quiz_file)

# Exclude specific users
excluded_usernames = ['thillen', 'thillen1', 'hengover', 'jamal76er', 'jonathaMCNEILL', 'gilles', 'Fateme', 'mou', 'hanbin.9797@gmail.com', 'shyshin', 'a', 'test4', 'test5', 'jonas']

# Function to map user_id to username
def map_user_ids_to_usernames(users_data):
    user_id_to_username = {}
    for user in users_data:
        user_id = user['_id']
        username = user.get('username')
        if username not in excluded_usernames:
            user_id_to_username[user_id] = username
    return user_id_to_username

# Mapping user_id to username
user_id_to_username = map_user_ids_to_usernames(users_data)

# Calculate quiz counts, review frequency, feedback frequency, and gamification engagement

# Review Frequency
user_review_counts = {}
for review in review_data:
    user_id = review['user_id']['$oid']
    username = user_id_to_username.get(user_id)
    if username:
        user_review_counts[username] = user_review_counts.get(username, 0) + 1

# Feedback Frequency (using submission count)
feedback_frequency = {user: count for user, count in submission_counts.items()}

# Gamification Engagement (using XP)
def extract_user_xp(users_data):
    username_to_xp = {}
    for user in users_data:
        username = user.get('username')
        xp = user.get('xp', 0)  # Default XP to 0 if not available
        if username not in excluded_usernames:
            username_to_xp[username] = xp
    return username_to_xp

gamification_engagement = extract_user_xp(users_data)

# Compute pre-post test score differences
def aggregate_scores(submissions, element):
    scores = []
    for sub_id, scores_data in submissions.items():
        if element in scores_data:
            scores.append(scores_data[element])
    return np.mean(scores) if scores else None

# Prepare Data for ANCOVA
data_rows = []
for username, quiz_info in user_quiz_data.items():
    if username in pre_test_data and username in post_test_data:
        pre_submissions = pre_test_data[username]
        post_submissions = post_test_data[username]
        
        for element in ["grammar", "vocabulary", "organization", "coherence", "writing_style"]:
            pre_score = aggregate_scores(pre_submissions, element)
            post_score = aggregate_scores(post_submissions, element)
            if pre_score is not None and post_score is not None:
                score_difference = post_score - pre_score
                
                # Gather covariates (Review frequency, Feedback frequency, Gamification engagement)
                review_count = user_review_counts.get(username, 0)
                feedback_count = feedback_frequency.get(username, 0)
                gamification_xp = gamification_engagement.get(username, 0)
                quiz_count = quiz_info['num_quizzes']
                
                # Create a row for each user and writing element
                data_rows.append({
                    'username': username,
                    'element': element,
                    'score_difference': score_difference,
                    'quiz_count': quiz_count,
                    'review_frequency': review_count,
                    'feedback_frequency': feedback_count,
                    'gamification_engagement': gamification_xp
                })

# Create a DataFrame for ANCOVA
df = pd.DataFrame(data_rows)

fig, axes = plt.subplots(1, 3, figsize=(18, 6))

sns.regplot(x='review_frequency', y='score_difference', data=df, ax=axes[0], line_kws={"color": "red"}, scatter_kws={'s':50})
axes[0].set_title('Review Frequency vs Score Difference')

sns.regplot(x='feedback_frequency', y='score_difference', data=df, ax=axes[1], line_kws={"color": "red"}, scatter_kws={'s':50})
axes[1].set_title('Feedback Frequency vs Score Difference')

sns.regplot(x='gamification_engagement', y='score_difference', data=df, ax=axes[2], line_kws={"color": "red"}, scatter_kws={'s':50})
axes[2].set_title('Gamification Engagement vs Score Difference')

plt.tight_layout()
plt.show()

# --- Linearity Check ---
def check_linearity(df, dependent_var, covariates):
    """Create scatter plots to check linearity between covariates and the dependent variable."""
    for covariate in covariates:
        plt.figure(figsize=(6, 4))
        sns.regplot(x=covariate, y=dependent_var, data=df, lowess=True, line_kws={"color": "red"})
        plt.title(f'Linearity Check: {covariate} vs {dependent_var}')
        plt.show()

# --- Homogeneity of Regression Slopes Check ---
def check_homogeneity_of_slopes(df, dependent_var, independent_var, covariates):
    """Test for interaction effects between covariates and the independent variable to check for homogeneity of slopes."""
    for covariate in covariates:
        # Add interaction term
        df['interaction_term'] = df[independent_var] * df[covariate]
        
        # Fit model with interaction term
        model = ols(f'{dependent_var} ~ {independent_var} + {covariate} + interaction_term', data=df).fit()
        anova_results = sm.stats.anova_lm(model, typ=2)
        print(f"ANOVA for interaction between {independent_var} and {covariate}:")
        print(anova_results)
        
        # Remove interaction term from df after testing
        df.drop(columns=['interaction_term'], inplace=True)

# --- Homoscedasticity Check ---
def check_homoscedasticity(model):
    """Plot residuals versus fitted values to check for homoscedasticity."""
    residuals = model.resid
    fitted_vals = model.fittedvalues
    
    plt.figure(figsize=(6, 4))
    sns.residplot(fitted_vals, residuals, lowess=True, line_kws={"color": "red"})
    plt.title('Residuals vs Fitted Values (Homoscedasticity Check)')
    plt.xlabel('Fitted Values')
    plt.ylabel('Residuals')
    plt.show()

# --- Normality of Residuals Check ---
def check_residual_normality(model):
    """Check the normality of residuals using QQ plot and histogram."""
    residuals = model.resid

    # QQ plot
    plt.figure(figsize=(6, 4))
    qqplot(residuals, line='s')
    plt.title('QQ Plot (Normality of Residuals)')
    plt.show()

    # Residual histogram
    plt.figure(figsize=(6, 4))
    sns.histplot(residuals, kde=True)
    plt.title('Residual Histogram (Normality Check)')
    plt.show()

# Example function to apply these checks for ANCOVA
def perform_ancova_with_assumption_checks(df, dependent_var, independent_var, covariates):
    """Run ANCOVA and check assumptions."""
    # Perform ANCOVA
    model = ols(f'{dependent_var} ~ {independent_var} + ' + ' + '.join(covariates), data=df).fit()
    ancova_table = sm.stats.anova_lm(model, typ=2)
    
    print(f"ANCOVA Results for {dependent_var}:")
    print(ancova_table)
    print("\n")

    # # Linearity Check
    # print("Checking Linearity:")
    # check_linearity(df, dependent_var, covariates)

    # # Homogeneity of Slopes Check
    # print("\nChecking Homogeneity of Regression Slopes:")
    # check_homogeneity_of_slopes(df, dependent_var, independent_var, covariates)
    
    # # Homoscedasticity Check
    # print("\nChecking Homoscedasticity:")
    # check_homoscedasticity(model)
    
    # # Normality of Residuals Check
    # print("\nChecking Normality of Residuals:")
    # check_residual_normality(model)

# Apply the assumption checks for each writing element
for element in df['element'].unique():
    element_df = df[df['element'] == element]
    perform_ancova_with_assumption_checks(
        element_df, 
        dependent_var='score_difference', 
        independent_var='quiz_count', 
        covariates=['review_frequency', 'feedback_frequency', 'gamification_engagement']
    )