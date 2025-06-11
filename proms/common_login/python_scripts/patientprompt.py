# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI

# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine into one large string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # 1) Generate the summary in English
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "This is a PROMS system. Act like a human and act like you're speaking to "
#                 "the patient directly. Tell the overall condition summary of the patient in "
#                 "layman's terms. Give a short (30-40 words) and motivating output."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=100,
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # 2) Get the Arabic translation of the English summary
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Please translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=150,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Create a JSON object with both messages
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Print the JSON so Node.js can parse it easily
# print(json.dumps(output_data))


# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI

# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine into one large string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # 1) Generate the summary in English with an enhanced, empathetic prompt
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "You are a PROMIS system that provides short, human-like summaries of a patient's "
#                 "health status in plain language. Show empathy and reassurance. Speak directly to "
#                 "the patient and offer a brief, motivational summary (around 30-40 words)."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=100,
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # 2) Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Please translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=150,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # --- Simple Logic to Append a Helpful Link If Condition Is Severe ---
# # You can adjust the keywords as needed.
# severe_keywords_english = ["worst", "severe", "critical", "urgent"]
# severe_keywords_arabic = ["خطير", "سيئ", "طارئ", "حرج", "أسوأ"]

# if any(keyword in english_summary.lower() for keyword in severe_keywords_english):
#     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"
# if any(keyword in arabic_translation for keyword in severe_keywords_arabic):
#     arabic_translation += "\n\nلمزيد من المساعدة، يرجى زيارة: https://wehealthify.org/"

# # Create a JSON object with both messages
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Print the JSON so Node.js can parse it easily
# print(json.dumps(output_data))



## Code with sentiment analysis

# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI
# from textblob import TextBlob  # <-- Added TextBlob for sentiment analysis

# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine into one large string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # 1) Generate the summary in English with at least 100 words
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "You are a PROMIS system that provides human-like summaries of a patient's health status "
#                 "in plain language. Show empathy and reassurance. Speak directly to the patient. Provide a "
#                 "supportive, motivational summary in at least 100 words. If the patient's health is declining, "
#                 "emphasize the importance of self-care or seeking professional help."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=400,  # Enough room for ~100+ words
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # 2) Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Please translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=400,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # --- Simple TextBlob Sentiment Analysis on the English Summary ---
# blob = TextBlob(english_summary)
# sentiment_score = blob.sentiment.polarity  # Ranges from -1.0 (very negative) to +1.0 (very positive)

# # For example, let's say if sentiment_score < 0.0, we consider it “negative enough” to append the link.
# if sentiment_score < 0:
#     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# # (Optional) You can also do a separate Arabic sentiment if you want, 
# # but that may be less reliable with default TextBlob. We'll skip that here.

# # Create a JSON object with both messages
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Print the JSON so Node.js can parse it easily
# print(json.dumps(output_data))



# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI
# from textblob import TextBlob

# # Load environment variables
# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get file paths from command-line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine all data into a single string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # Step 1: Generate English summary with an enhanced prompt
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "You are a PROMIS system that provides human-like summaries of a patient's health status "
#                 "based on their physical and mental health data. Your summary must be empathetic, motivational, "
#                 "and tailored to the patient's condition. Use plain language so the patient can easily understand "
#                 "the overall health trends. Ensure the summary is at least 100 words."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=400,  # Allow enough space for ~100+ words
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # Step 2: Perform sentiment analysis on the English summary
# blob = TextBlob(english_summary)
# sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# # Step 3: Append helpful link if sentiment indicates a decline in health
# if sentiment_score < 0:  # Negative sentiment
#     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# # Step 4: Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=400,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Step 5: Create the output JSON object
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Step 6: Print JSON for Node.js to parse
# print(json.dumps(output_data))


# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI
# from textblob import TextBlob

# # Load environment variables
# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to parse patient health scores from CSV
# def parse_health_scores(csv_file_path):
#     health_scores = {}
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.DictReader(csvfile)
#         for row in reader:
#             if "title" in row and "score" in row:
#                 health_scores[row["title"]] = float(row["score"])
#     return health_scores

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get file paths from command-line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Parse health scores and identify if health is poor
# health_scores = parse_health_scores(patient_health_scores_csv)
# poor_health = any(score < 30 for score in health_scores.values())  # Threshold for poor health

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine all data into a single string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # Step 1: Generate English summary with an enhanced prompt
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "You are a PROMIS system that provides human-like summaries of a patient's health status "
#                 "based on their physical and mental health data. Your summary must be empathetic, motivational, "
#                 "and tailored to the patient's condition. Use plain language so the patient can easily understand "
#                 "the overall health trends. Ensure the summary is at least 20 words."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=400,  # Allow enough space for ~100+ words
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # Step 2: Perform sentiment analysis on the English summary
# blob = TextBlob(english_summary)
# sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# # Step 3: Append helpful link if sentiment indicates a decline in health or poor health scores
# if sentiment_score < 0 or poor_health:  # Either negative sentiment or poor health scores
#     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# # Step 4: Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=400,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Step 5: Create the output JSON object
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Step 6: Print JSON for Node.js to parse
# print(json.dumps(output_data))






#this is code after trim the only the required fields


# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI
# from textblob import TextBlob

# # Load environment variables
# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to parse patient health scores from CSV
# def parse_health_scores(csv_file_path):
#     health_scores = {}
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.DictReader(csvfile)
#         for row in reader:
#             if "title" in row and "score" in row:
#                 health_scores[row["title"]] = float(row["score"])
#     return health_scores

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get file paths from command-line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Parse health scores and identify if health is poor
# health_scores = parse_health_scores(patient_health_scores_csv)
# poor_health = any(score < 30 for score in health_scores.values())  # Threshold for poor health

# # Collect the titles that the patient actually answered
# answered_titles = set(health_scores.keys())

# # Filter the severity-levels CSV rows to only keep those matching the patient-answered titles
# filtered_severity_rows = []
# with open(severity_levels_csv, newline='') as csvfile:
#     reader = csv.DictReader(csvfile)
#     for row in reader:
#         if row.get('Scale', '').strip() in answered_titles:
#             filtered_severity_rows.append(row)

# # Convert the patient CSV to multiline string
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)

# # Convert filtered severity rows to multiline string
# sent_data_2 = ""
# for row in filtered_severity_rows:
#     sent_data_2 += ",".join(row.values()) + "\n"

# # Convert the API surveys CSV to multiline string
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine all data into a single string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # Step 1: Generate English summary with an enhanced prompt
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "You are a PROMIS system that provides human-like summaries of a patient's health status "
#                 "based on their physical and mental health data. Your summary must be empathetic, motivational, "
#                 "and tailored to the patient's condition. Use plain language so the patient can easily understand "
#                 "the overall health trends. Ensure the summary is at least 20 words."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=400,  # Allow enough space for ~100+ words
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # Step 2: Perform sentiment analysis on the English summary
# blob = TextBlob(english_summary)
# sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# # Step 3: Append helpful link if sentiment indicates a decline in health or poor health scores
# if sentiment_score < 0 or poor_health:  # Either negative sentiment or poor health scores
#     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# # Step 4: Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=400,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Step 5: Create the output JSON object
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Step 6: Print JSON for Node.js to parse
# print(json.dumps(output_data))


# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI
# from textblob import TextBlob

# # Load environment variables
# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to parse patient health scores from CSV
# def parse_health_scores(csv_file_path):
#     health_scores = {}
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.DictReader(csvfile)
#         for row in reader:
#             if "title" in row and "score" in row:
#                 health_scores[row["title"]] = float(row["score"])
#     return health_scores

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get file paths from command-line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]

# # Parse health scores and identify if health is poor
# health_scores = parse_health_scores(patient_health_scores_csv)
# poor_health = any(score < 30 for score in health_scores.values())  # Threshold for poor health

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)

# # Combine all data into a single string
# combined_sent_data = sent_data_1 + sent_data_2

# # Step 1: Generate English summary with an enhanced prompt
# summary_response = client.chat.completions.create(
#     model="o3-mini",
#     messages=[
#         {
#             "role": "system",
#             # "content": (
#             #     "You are a PROMIS system that provides human-like summaries of a patient's health status "
#             #     "based on their physical and mental health data. Your summary must be empathetic, motivational, "
#             #     "and tailored to the patient's condition. Use plain language so the patient can easily understand "
#             #     "the overall health trends. Ensure the summary is at least 20 words."
#             # ),

#             # "content": (
#             #     "You are a PROMIS system that provides human-like summaries of a patient's health status "
#             #     "based on their physical and mental health data. The summary must be empathetic, motivational, "
#             #     "and tailored to the patient’s condition, using plain language so overall health trends are easy to understand. "
#             #     "If the patient's score dips to the worst scale, the message should begin by alerting them about their condition "
#             #     "and suggesting an appointment with their physician, maintaining a concerned yet professional tone without being "
#             #     "overtly positive. Ensure the summary is at least 20 words."
#             # ),

#                         "content": (
#                 "You are a PROMIS system that provides human-like summaries of a patient's health status "
#                 "based on their physical and mental health data. Your analysis should be performed at a micro level, "
#                 "deeply examining the provided data to ensure that the insights are as accurate and detailed as possible. "
#                 "The summary must be empathetic, motivational, and tailored to the patient’s condition, using plain language so overall health trends are easy to understand. "
#                 "If the patient's score dips to the worst scale, the message should begin by alerting them about their condition "
#                 "and suggesting an appointment with their physician, maintaining a concerned yet professional tone without being overtly positive. "
#                 "Please note that we are not liable for the response generated by this system. Ensure the summary is at least 20 words."
#             ),

#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=400,  # Allow enough space for ~100+ words
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # Step 2: Perform sentiment analysis on the English summary
# blob = TextBlob(english_summary)
# sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# # Step 3: Append helpful link if sentiment indicates a decline in health or poor health scores
# # if sentiment_score < 0 or poor_health:
# #     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# # # Step 3: Append a helpful link based on sentiment or health scores
# # if sentiment_score < 0 or poor_health:
# #     english_summary += "\n\nPlease book an appointment with your physician, please visit: https://wehealthify.org/"
# # else:
# #     english_summary += "\n\nFor More Educational Content, Please visit: https://wehealthify.org/educational-docs"


# if sentiment_score < 0 or poor_health:
#     help_url = "Please book an appointment with your physician, please visit: https://wehealthify.org/"
# else:
#     help_url = "For More Educational Content, Please visit: https://wehealthify.org/educational-docs"

# # Prepend the URL to the summary
# english_summary = help_url + "\n\n" + english_summary


# # Step 4: Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="o3-mini",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=400,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Step 5: Create the output JSON object
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Step 6: Print JSON for Node.js to parse
# print(json.dumps(output_data))




# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI
# from textblob import TextBlob

# # Load environment variables
# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to parse patient health scores from CSV
# def parse_health_scores(csv_file_path):
#     health_scores = {}
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.DictReader(csvfile)
#         for row in reader:
#             if "title" in row and "score" in row:
#                 health_scores[row["title"]] = float(row["score"])
#     return health_scores

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get file paths from command-line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]

# # Parse health scores and identify if health is poor
# health_scores = parse_health_scores(patient_health_scores_csv)
# poor_health = any(score < 30 for score in health_scores.values())  # Threshold for poor health

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)

# # Combine all data into a single string
# combined_sent_data = sent_data_1 + sent_data_2

# # Step 1: Generate English summary with an enhanced prompt
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "You are a PROMIS system that provides human-like summaries of a patient's health status "
#                 "based on their physical and mental health data. Your summary must be empathetic, motivational, "
#                 "and tailored to the patient's condition. Use plain language so the patient can easily understand "
#                 "the overall health trends. Ensure the summary is at least 20 words."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=400,  # Allow enough space for ~100+ words
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # Step 2: Perform sentiment analysis on the English summary
# blob = TextBlob(english_summary)
# sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# # Step 3: Append helpful link if sentiment indicates a decline in health or poor health scores
# # if sentiment_score < 0 or poor_health:
# #     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# #For the postive and negative we have different url to be append to the final repsonse(Based on the patient health)

# if sentiment_score < 0 or poor_health:
#     english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"
# else:
#     english_summary += "\n\nPlease visit: https://wehealthify.org/educational-doc"


# # Step 4: Translate the English summary into Arabic
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=400,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Step 5: Create the output JSON object
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Step 6: Print JSON for Node.js to parse
# print(json.dumps(output_data))




import sys
import os
import csv
import json
from dotenv import load_dotenv
from openai import OpenAI
from textblob import TextBlob

# Load environment variables
load_dotenv()
apikey = os.getenv('api_key')
client = OpenAI(api_key=apikey)

# Function to parse patient health scores from CSV
def parse_health_scores(csv_file_path):
    health_scores = {}
    with open(csv_file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if "title" in row and "score" in row:
                health_scores[row["title"]] = float(row["score"])
    return health_scores

# Function to check if all months_since_baseline are 1
def check_baseline_months(csv_file_path):
    with open(csv_file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        months_since_baseline_values = [row.get("months_since_baseline", "0") for row in reader]
        
        # Convert to integers and check if all values are 1
        return all(val.isdigit() and int(val) == 1 for val in months_since_baseline_values)

# Function to convert CSV to multiline string
def csv_to_multiline_string(csv_file_path):
    multiline_string = ""
    with open(csv_file_path, newline='') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            multiline_string += ','.join(row) + "\n"
    return multiline_string

# Get file paths from command-line arguments
severity_levels_csv = sys.argv[1]
patient_health_scores_csv = sys.argv[2]

# Parse health scores and identify if health is poor
health_scores = parse_health_scores(patient_health_scores_csv)
poor_health = any(score < 30 for score in health_scores.values())  # Threshold for poor health

# Check if all months_since_baseline are 1
use_simplified_prompt = check_baseline_months(patient_health_scores_csv)

# Convert CSV files to multiline strings
sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
sent_data_2 = csv_to_multiline_string(severity_levels_csv)

# Combine all data into a single string
combined_sent_data = sent_data_1 + sent_data_2

# Define the appropriate prompt based on the months_since_baseline condition
if use_simplified_prompt:
    prompt_content = (
        "You are a PROMIS system that provides human-like summaries of a patient's overall health status to the patient."
        "Provide a clear and concise summary of the patient's current health status based on the provided scores. "
        "Focus only on the available metrics and report factual observations without any additional context or empathy. "
        "Do not provide motivational or long explanations—keep it straightforward and to the point."
    )
else:
    prompt_content = (
        "You are a PROMIS system that provides human-like summaries of a patient's overall health status, analyzing all relevant health conditions, including physical, mental, chronic, and lifestyle-related factors."  
"Your summary must be comprehensive, empathetic, and tailored to the patient's condition."  
"Consider all available health data to assess the current status, highlight key trends, and identify any significant changes."
"Use clear and simple language so the patient can easily understand their health insights. Ensure the summary is at least 20 words."

    )

# Step 1: Generate English summary with the selected prompt
summary_response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": prompt_content,
        },
        {"role": "user", "content": combined_sent_data},
    ],
    max_tokens=400,  # Allow enough space for ~100+ words
)

english_summary = summary_response.choices[0].message.content.strip()

# Step 2: Perform sentiment analysis on the English summary
blob = TextBlob(english_summary)
sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# Step 3: Append helpful link if sentiment indicates a decline in health or poor health scores
if sentiment_score < 0 or poor_health:
    english_summary += ""
else:
    english_summary += ""

# Step 4: Translate the English summary into Arabic
translation_response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are a translator. Translate the following text into Arabic."
        },
        {
            "role": "user",
            "content": english_summary
        },
    ],
    max_tokens=400,
)

arabic_translation = translation_response.choices[0].message.content.strip()

# Step 5: Create the output JSON object
output_data = {
    "english_summary": english_summary,
    "arabic_translation": arabic_translation
}

# Step 6: Print JSON for Node.js to parse
print(json.dumps(output_data))
