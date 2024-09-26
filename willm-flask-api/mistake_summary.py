import json
import matplotlib.pyplot as plt # type: ignore
from collections import Counter
import numpy as np # type: ignore

# Load data from user_mistakes_prePostTest.json
input_json_file = '/Users/benthillen/Downloads/mongo/evaluation/user_mistakes_prePostTest.json'
with open(input_json_file, 'r') as infile:
    data = json.load(infile)

# Define mistake classifications
grammar_mistakes = {"misspelling", "incorrect use of articles", "pronoun agreement", "tense consistency", "incorrect prepositions", "subject-verb agreement"}
vocab_mistakes = {"inappropriate word choice", "redundancy"}

# Helper function to categorize mistakes into grammar and vocabulary
def categorize_mistakes(mistakes):
    grammar_count = sum(1 for m in mistakes if m in grammar_mistakes)
    vocab_count = sum(1 for m in mistakes if m in vocab_mistakes)
    return grammar_count, vocab_count

# Store aggregated results across all users
pre_grammar_list = []
pre_vocab_list = []
post_grammar_list = []
post_vocab_list = []

# Aggregate mistake counts from all users
for user, user_data in data.items():
    pre_grammar, pre_vocab, post_grammar, post_vocab = 0, 0, 0, 0
    
    # Pre-test
    for test in user_data.keys():
        if 'preTest_initial' in test:
            grammar_count, vocab_count = categorize_mistakes(user_data[test]["categories"])
            pre_grammar += grammar_count
            pre_vocab += vocab_count
    
    # Post-test
    for test in user_data.keys():
        if 'postTest_initial' in test:
            grammar_count, vocab_count = categorize_mistakes(user_data[test]["categories"])
            post_grammar += grammar_count
            post_vocab += vocab_count
    
    # Store totals for each user
    pre_grammar_list.append(pre_grammar)
    pre_vocab_list.append(pre_vocab)
    post_grammar_list.append(post_grammar)
    post_vocab_list.append(post_vocab)

# Calculate statistics: mean, median, and standard deviation
def print_statistics(label, data):
    print(f"{label} Statistics:")
    print(f"  Mean: {np.mean(data):.2f}")
    print(f"  Median: {np.median(data):.2f}")
    print(f"  Std Dev: {np.std(data):.2f}")
    print()

print_statistics("Pre-test Grammar Mistakes", pre_grammar_list)
print_statistics("Pre-test Vocabulary Mistakes", pre_vocab_list)
print_statistics("Post-test Grammar Mistakes", post_grammar_list)
print_statistics("Post-test Vocabulary Mistakes", post_vocab_list)

# Create side-by-side bar chart for pre-test and post-test grammar and vocabulary mistakes
def plot_side_by_side_barchart(pre_grammar, post_grammar, pre_vocab, post_vocab):
    labels = ['Grammar', 'Vocabulary']
    pre_means = [np.mean(pre_grammar), np.mean(pre_vocab)]
    post_means = [np.mean(post_grammar), np.mean(post_vocab)]

    x = np.arange(len(labels))  # label locations
    width = 0.35  # width of the bars

    fig, ax = plt.subplots()
    rects1 = ax.bar(x - width/2, pre_means, width, label='Pre-test')
    rects2 = ax.bar(x + width/2, post_means, width, label='Post-test')

    # Add labels, title, and custom x-axis tick labels
    ax.set_xlabel('Mistake Type')
    ax.set_ylabel('Mean Number of Mistakes')
    ax.set_title('Pre-test vs Post-test Grammar and Vocabulary Mistakes')
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend()

    # Add data labels on top of bars
    def add_labels(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.2f}', xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points", ha='center', va='bottom')

    add_labels(rects1)
    add_labels(rects2)

    plt.tight_layout()
    plt.show()

# Call the function to plot the bar chart
plot_side_by_side_barchart(pre_grammar_list, post_grammar_list, pre_vocab_list, post_vocab_list)
