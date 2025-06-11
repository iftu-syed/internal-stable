# import csv
# import json
# import subprocess
# import sys
# import os

# def remove_extra_scales(
#     patient_scores_file: str,
#     severity_levels_file: str,
#     output_file: str = "filtered_severity_levels.csv"
# ):
#     """
#     Filters out rows in severity_levels_file whose 'Scale' values
#     do not match any 'trace_name' in patient_scores_file.
#     """
#     # 1. Collect unique trace_name values from the patient CSV
#     trace_names = set()
#     with open(patient_scores_file, mode='r', encoding='utf-8', newline='') as p_file:
#         patient_reader = csv.DictReader(p_file)
#         for row in patient_reader:
#             trace_names.add(row['trace_name'])

#     # 2. Read severity CSV, keeping only rows whose 'Scale' is in trace_names
#     filtered_rows = []
#     with open(severity_levels_file, mode='r', encoding='utf-8', newline='') as s_file:
#         severity_reader = csv.DictReader(s_file)
#         fieldnames = severity_reader.fieldnames  # remember column names
#         for row in severity_reader:
#             if row['Scale'] in trace_names:
#                 filtered_rows.append(row)

#     # 3. Write the filtered rows to a new CSV
#     with open(output_file, mode='w', encoding='utf-8', newline='') as out_file:
#         writer = csv.DictWriter(out_file, fieldnames=fieldnames)
#         writer.writeheader()
#         writer.writerows(filtered_rows)

#     print(f"Done filtering scales. Filtered severity levels saved to '{output_file}'.")


# def csv_to_json(csv_file_path):
#     """
#     Convert a CSV file to JSON format and return it as a string.
#     """
#     with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
#         csv_reader = csv.DictReader(csv_file)
#         json_data = [row for row in csv_reader]
#         return json.dumps(json_data, indent=4)


# def generate_prompt(file1_data, file2_data):
#     """
#     Generate a prompt by combining the data from file1 and file2.
#     """
#     prompt = (
#         f"Analyze the patient scores provided in the following JSON data (file1):\n{file1_data}\n\n"
#         f"Use the severity levels and scoring limits from the following JSON data (file2):\n{file2_data}\n\n"
#         "Based on the scoring rules, summarize the health condition of the patient. "
#         "Provide key observations, patterns, and any significant concerns related to the patient's health condition in JSON format."
#     )
#     return prompt


# def call_api_with_prompt(prompt):
#     """
#     Make a POST request to the API using `curl` with the generated prompt.
#     This example uses 'llama3.2' as the model.
#     """
#     command = [
#         "curl", "http://localhost:11434/api/generate",
#         "-d", json.dumps({
#             "model": "llama3.2",
#             "prompt": prompt,
#             "format": "json",
#             "stream": False
#         }),
#         "-H", "Content-Type: application/json"
#     ]
#     result = subprocess.run(command, capture_output=True, text=True)
#     return json.loads(result.stdout)


# def summarize_response_data(response_data):
#     """
#     Summarize the entire JSON response for a patient-friendly explanation.
#     """
#     summary_prompt = (
#         "Please provide a clear, patient-friendly summary of the health condition based on the JSON data below. "
#         "This summary will appear in a user interface, so it should be easy to understand and focus on key findings. "
#         "Keep it positive, but also realistically address any major concerns:\n\n"
#         f"{response_data}"
#     )

#     summary_response = call_api_with_prompt(summary_prompt)
#     summarized_text = summary_response.get("response", "").strip()
#     return summarized_text


# def main(patient_scores_file, severity_file):
#     """
#     Main workflow for 2-file input:
#     1. Filter severity levels.
#     2. Convert CSVs to JSON.
#     3. Generate prompt.
#     4. Call the LLaMA-based API with prompt.
#     5. Summarize the API response for the patient.
#     6. Print final summary after 'Patient-Facing Summary:' marker
#        so Node.js can parse it.
#     """

#     # 1. Filter out extra scales from SeverityLevels.csv
#     filtered_severity_csv = "filtered_severity_levels.csv"
#     remove_extra_scales(patient_scores_file, severity_file, filtered_severity_csv)

#     # 2. Convert the CSVs to JSON (using the newly filtered severity CSV)
#     file1_json = csv_to_json(patient_scores_file)
#     file2_json = csv_to_json(filtered_severity_csv)

#     # 3. Generate the prompt
#     prompt = generate_prompt(file1_json, file2_json)
#     print("\nGenerated Prompt:\n")
#     print(prompt)

#     # 4. Call the model with the prompt
#     response = call_api_with_prompt(prompt)
#     response_data = response.get("response", "").strip()
#     print("\nExtracted Response Data:\n")
#     print(response_data)

#     # 5. Summarize the API response in a patient-friendly manner
#     summarized_text = summarize_response_data(response_data)

#     # 6. Print final summary so Node.js can read it from stdout
#     print("\nPatient-Facing Summary:")
#     print(summarized_text)


# if __name__ == "__main__":
#     # Expect exactly two arguments: patient_scores_file, severity_levels_file
#     if len(sys.argv) < 3:
#         print("Usage: python llama_script.py <patient_scores_file> <severity_levels_file>")
#         sys.exit(1)

#     patient_scores_file = sys.argv[1]
#     severity_file = sys.argv[2]

#     if not os.path.exists(patient_scores_file):
#         print(f"Error: patient_scores_file '{patient_scores_file}' does not exist.")
#         sys.exit(1)

#     if not os.path.exists(severity_file):
#         print(f"Error: severity_levels_file '{severity_file}' does not exist.")
#         sys.exit(1)

#     main(patient_scores_file, severity_file)




# """
# This is update on the Doctor and refinement in the output.

# """

# import csv
# import json
# import subprocess
# import sys
# import os

# def remove_extra_scales(
#     patient_scores_file: str,
#     severity_levels_file: str,
#     output_file: str = "filtered_severity_levels.csv"
# ):
#     """
#     Filters out rows in severity_levels_file whose 'Scale' values
#     do not match any 'trace_name' in patient_scores_file.
#     """
#     trace_names = set()
#     with open(patient_scores_file, mode='r', encoding='utf-8', newline='') as p_file:
#         patient_reader = csv.DictReader(p_file)
#         for row in patient_reader:
#             trace_names.add(row['trace_name'])

#     filtered_rows = []
#     with open(severity_levels_file, mode='r', encoding='utf-8', newline='') as s_file:
#         severity_reader = csv.DictReader(s_file)
#         fieldnames = severity_reader.fieldnames
#         for row in severity_reader:
#             if row['Scale'] in trace_names:
#                 filtered_rows.append(row)

#     with open(output_file, mode='w', encoding='utf-8', newline='') as out_file:
#         writer = csv.DictWriter(out_file, fieldnames=fieldnames)
#         writer.writeheader()
#         writer.writerows(filtered_rows)

#     # print(f"Done filtering scales. Filtered severity levels saved to '{output_file}'.")

# def csv_to_json(csv_file_path):
#     """
#     Convert a CSV file to JSON format and return it as a string.
#     """
#     with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
#         csv_reader = csv.DictReader(csv_file)
#         json_data = [row for row in csv_reader]
#         return json.dumps(json_data, indent=4)

# def generate_prompt(file1_data, file2_data):
#     """
#     Generate a prompt focusing only on takeaways for the doctor.
#     """
#     prompt = (
#         f"Analyze the patient scores provided in the following JSON data (file1):\n{file1_data}\n\n"
#         f"Use the severity levels and scoring limits from the following JSON data (file2):\n{file2_data}\n\n"
#         "Provide only key takeaways and actionable recommendations for the doctor to guide the patient's treatment."
#         " Focus on critical observations and necessary interventions in JSON format."
#     )
#     return prompt

# def call_api_with_prompt(prompt):
#     """
#     Make a POST request to the API using `curl` with the generated prompt.
#     """
#     command = [
#         "curl", "http://localhost:11434/api/generate",
#         "-d", json.dumps({
#             "model": "llama3.2",
#             "prompt": prompt,
#             "format": "json",
#             "stream": False
#         }),
#         "-H", "Content-Type: application/json"
#     ]
#     result = subprocess.run(command, capture_output=True, text=True)
#     return json.loads(result.stdout)

# def extract_takeaways(response_data):
#     """
#     Extract only the takeaways from the model's response for the doctor.
#     """
#     takeaway_prompt = (
#         "From the following JSON data, extract only the key takeaways and actionable recommendations for the doctor."
#         " Do not include general observations, only focus on necessary actions:\n\n"
#         f"{response_data}"
#     )
#     takeaway_response = call_api_with_prompt(takeaway_prompt)
#     return takeaway_response.get("response", "").strip()

# def main(patient_scores_file, severity_file):
#     """
#     Main workflow for generating doctor-specific takeaways.
#     """
#     filtered_severity_csv = "filtered_severity_levels.csv"
#     remove_extra_scales(patient_scores_file, severity_file, filtered_severity_csv)

#     file1_json = csv_to_json(patient_scores_file)
#     file2_json = csv_to_json(filtered_severity_csv)

#     prompt = generate_prompt(file1_json, file2_json)
#     # print("\nGenerated Prompt:\n")
#     # print(prompt)

#     response = call_api_with_prompt(prompt)
#     response_data = response.get("response", "").strip()
#     # print("\nExtracted Response Data:\n")
#     # print(response_data)

#     takeaways = extract_takeaways(response_data)
#     print("\nDoctor-Focused Takeaways:")
#     print(takeaways)

# if __name__ == "__main__":
#     if len(sys.argv) < 3:
#         print("Usage: python llama_script.py <patient_scores_file> <severity_levels_file>")
#         sys.exit(1)

#     patient_scores_file = sys.argv[1]
#     severity_file = sys.argv[2]

#     if not os.path.exists(patient_scores_file):
#         print(f"Error: patient_scores_file '{patient_scores_file}' does not exist.")
#         sys.exit(1)

#     if not os.path.exists(severity_file):
#         print(f"Error: severity_levels_file '{severity_file}' does not exist.")
#         sys.exit(1)

#     main(patient_scores_file, severity_file)



# '''
# This is the update on the code to remove extra things from the final response.
# '''



import csv
import json
import subprocess
import sys
import os
import re
import json5

def remove_extra_scales(
    patient_scores_file: str,
    severity_levels_file: str,
    output_file: str = "filtered_severity_levels.csv"
):
    """
    Filters out rows in severity_levels_file whose 'Scale' values
    do not match any 'trace_name' in patient_scores_file.
    """
    trace_names = set()
    with open(patient_scores_file, mode='r', encoding='utf-8', newline='') as p_file:
        patient_reader = csv.DictReader(p_file)
        for row in patient_reader:
            trace_names.add(row['trace_name'])

    filtered_rows = []
    with open(severity_levels_file, mode='r', encoding='utf-8', newline='') as s_file:
        severity_reader = csv.DictReader(s_file)
        fieldnames = severity_reader.fieldnames
        for row in severity_reader:
            if row['Scale'] in trace_names:
                filtered_rows.append(row)

    with open(output_file, mode='w', encoding='utf-8', newline='') as out_file:
        writer = csv.DictWriter(out_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(filtered_rows)

def csv_to_json(csv_file_path):
    """
    Convert a CSV file to JSON format and return it as a string.
    """
    with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        json_data = [row for row in csv_reader]
        return json.dumps(json_data, indent=4)

def generate_prompt(file1_data, file2_data):
    """
    Generate a prompt focusing only on takeaways for the doctor.
    """

    #version 1:

    # prompt = (
    #     f"Analyze the patient scores provided in the following JSON data (file1):\n{file1_data}\n\n"
    #     f"Use the severity levels and scoring limits from the following JSON data (file2):\n{file2_data}\n\n"
    #     "Provide only key takeaways and actionable recommendations for the doctor to guide the patient's treatment."
    #     " Focus on critical observations and necessary interventions in JSON format."
    # )
    
    #Version 2:
    # prompt = (
    #     f"Review the patient scores below (file1):\n{file1_data}\n\n"
    #     f"Then consult the severity levels (file2):\n{file2_data}\n\n"
    #     "Provide an in-depth clinical assessment specifically for the doctor, highlighting urgent findings "
    #     "and direct intervention strategies. Focus on immediate treatments and follow-up steps. "
    #     "Return the answer in JSON format with 'keyTakeaways' and 'actionableRecommendations'."
    # )

    #Version 3:

    # prompt = (
    #     f"Examine the patient's score details (file1):\n{file1_data}\n\n"
    #     f"Combine this with the severity references (file2):\n{file2_data}\n\n"
    #     "Draft a concise but comprehensive report for the doctor. Emphasize major clinical insights, "
    #     "priority follow-ups, and recommended therapies. Format the output in JSON with 'keyTakeaways' "
    #     "and 'actionableRecommendations'."
    # )


    #Version 4:

    # prompt = (
    #     f"Patient score data (file1):\n{file1_data}\n\n"
    #     f"Relevant severity thresholds (file2):\n{file2_data}\n\n"
    #     "Create a medically oriented summary that highlights significant abnormalities, "
    #     "potential health risks, and proposed interventions. Focus on clinical relevance and "
    #     "actionable insights in JSON format under 'keyTakeaways' and 'actionableRecommendations'."
    # )

    #Version 5:

    prompt = (
        f"Here is the patient's score information (file1):\n{file1_data}\n\n"
        f"Here are the severity guidelines (file2):\n{file2_data}\n\n"
        "Formulate concise directives for the doctor that emphasize the most important findings, "
        "clinical alerts, and next-step protocols. Return them in JSON using 'keyTakeaways' "
        "and 'actionableRecommendations'."
    )


    return prompt

def call_api_with_prompt(prompt):
    """
    Make a POST request to the API using `curl` with the generated prompt.
    """
    command = [
        "curl", "http://localhost:11434/api/generate",
        "-d", json.dumps({
            "model": "llama3.2",
            "prompt": prompt,
            "format": "json",
            "stream": False
        }),
        "-H", "Content-Type: application/json"
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    return json.loads(result.stdout)

def extract_takeaways(response_data):
    """
    Extract only the takeaways from the model's response for the doctor.
    """

    #Version 1:

    # takeaway_prompt = (
    #     "From the following JSON data, extract only the key takeaways and actionable recommendations for the doctor."
    #     " Do not include general observations, only focus on necessary actions:\n\n"
    #     f"{response_data}"
    # )

    # version 2:

    # takeaway_prompt = (
    #     "From the JSON data below, isolate only the urgent clinical takeaways and recommended treatments "
    #     "for the physician. Present them as 'keyTakeaways' and 'actionableRecommendations' in JSON:\n\n"
    #     f"{response_data}"
    # )

    #Version 3:

    # takeaway_prompt = (
    #     "From the following JSON, provide strictly the essential points a doctor needs "
    #     "to know and act upon, as 'keyTakeaways' and 'actionableRecommendations':\n\n"
    #     f"{response_data}"
    # )

    #Version 4:

    # takeaway_prompt = (
    #     "From the JSON below, identify the most urgent and impactful measures the doctor should take. "
    #     "Keep the response limited to 'keyTakeaways' and 'actionableRecommendations':\n\n"
    #     f"{response_data}"
    # )


    #Version 5:

    takeaway_prompt = (
        "From this JSON data, please provide only the direct instructions and urgent recommendations "
        "a doctor must follow, using 'keyTakeaways' and 'actionableRecommendations' in JSON:\n\n"
        f"{response_data}"
    )


    takeaway_response = call_api_with_prompt(takeaway_prompt)
    return takeaway_response.get("response", "").strip()

def format_json_output(json_string):
    """
    Attempt to parse the string as JSON and then format top-level key-value pairs
    on separate lines. If parsing fails, return the original text.
    """
    try:
        data = json5.loads(json_string)  # Attempt to parse JSON with json5
    except Exception:
        # If it's not valid JSON, just return it as-is
        return json_string

    # If it is valid JSON, handle it as a dictionary or another data type
    if isinstance(data, dict):
        # Print each top-level key-value pair on its own line
        lines = []
        for key, value in data.items():
            lines.append(f"{key}: {value}")
        return "\n".join(lines)
    else:
        # If it's not a dict (e.g., a list), just dump it with pretty-print
        return json.dumps(data, indent=4)

def main(patient_scores_file, severity_file):
    """
    Main workflow for generating doctor-specific takeaways.
    """
    filtered_severity_csv = "filtered_severity_levels.csv"
    remove_extra_scales(patient_scores_file, severity_file, filtered_severity_csv)

    file1_json = csv_to_json(patient_scores_file)
    file2_json = csv_to_json(filtered_severity_csv)

    prompt = generate_prompt(file1_json, file2_json)
    # print("\nGenerated Prompt:\n")
    # print(prompt)

    response = call_api_with_prompt(prompt)
    response_data = response.get("response", "").strip()
    # print("\nExtracted Response Data:\n")
    # print(response_data)

    takeaways = extract_takeaways(response_data)

    # ---------------------------------------
    #  Format and print the takeaways output
    # ---------------------------------------

    #Version 1:

    # print("\nDoctor-Focused Takeaways:")
    # formatted_takeaways = format_json_output(takeaways)
    # print(formatted_takeaways)

    #Version 2:

    # print("\nDoctor’s Critical Summary:")
    # formatted_takeaways = format_json_output(takeaways)
    # print(formatted_takeaways)


    #Version 3:

    # print("\nPhysician-Focused Key Points:")
    # formatted_takeaways = format_json_output(takeaways)
    # print(formatted_takeaways)

    #Version 4:

    # print("\nClinical Actionable Highlights:")
    # formatted_takeaways = format_json_output(takeaways)
    # print(formatted_takeaways)


    #Version 5

    print("\nUrgent Clinical Directives:")
    formatted_takeaways = format_json_output(takeaways)
    print(formatted_takeaways)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python llama_script.py <patient_scores_file> <severity_levels_file>")
        sys.exit(1)

    patient_scores_file = sys.argv[1]
    severity_file = sys.argv[2]

    if not os.path.exists(patient_scores_file):
        print(f"Error: patient_scores_file '{patient_scores_file}' does not exist.")
        sys.exit(1)

    if not os.path.exists(severity_file):
        print(f"Error: severity_levels_file '{severity_file}' does not exist.")
        sys.exit(1)

    main(patient_scores_file, severity_file)
