import pandas as pd # type: ignore

file_path = '/Users/benthillen/Downloads/mongo/aggregated-data/sus.xlsx' 
df = pd.read_excel(file_path)

# Function to calculate the SUS score for a single row (user)
def calculate_sus_score(row):
    total_score = 0
    for i in range(10):
        question_score = row[i]
        if i % 2 == 0:
            adjusted_score = question_score - 1
        else:
            adjusted_score = 5 - question_score
        total_score += adjusted_score
    sus_score = total_score * 2.5
    return sus_score

# Extract only the columns related to the SUS questions (C to L / index 2 to 11)
sus_data = df.iloc[:, 2:12]

# Calculate SUS score for each participant
df['SUS_Score'] = sus_data.apply(calculate_sus_score, axis=1)

# Calculate the average SUS score (overall SUS score)
average_sus_score = df['SUS_Score'].mean()

# Add the average SUS score to the DataFrame as a new row
df.loc['Average'] = pd.Series({'SUS_Score': average_sus_score})

# Save the result to a new Excel file
output_file_path = '/Users/benthillen/Downloads/mongo/evaluation/sus_result.xlsx'
df.to_excel(output_file_path, index=False)

print(f"SUS scores have been calculated, and the overall average SUS score of {average_sus_score:.2f} has been saved to", output_file_path)
