import csv
import json
import subprocess
import sys
import os

def remove_extra_scales(
    patient_scores_file: str,
    severity_levels_file: str,
    output_file: str = "filtered_severity_levels.csv"
):
    """
    Filters out rows in severity_levels_file whose 'Scale' values
    do not match any 'trace_name' in patient_scores_file.
    Debug/log prints go to stderr to avoid breaking JSON parsing.
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

    # Print to stderr so stdout remains valid JSON
    print(f"Done filtering scales. Filtered severity levels saved to '{output_file}'.", file=sys.stderr)


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
    Generate a prompt by combining the data from file1 and file2.
    """
    prompt = (
        f"Analyze the patient scores (file1):\n{file1_data}\n\n"
        f"Use severity levels and scoring limits (file2):\n{file2_data}\n\n"
        "Based on these data, summarize the patient's health condition in JSON format."
    )
    return prompt


def call_api_with_prompt(prompt):
    """
    Make a POST request to the API using `curl` with the generated prompt.
    This example uses 'llama3.2' as the model.
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


def summarize_response_data(response_data):
    """
    Summarize the entire JSON response for a patient-friendly explanation.
    """
    summary_prompt = (
        "Please provide a clear, patient-friendly summary of the health condition based on the JSON data below.\n\n"
        f"{response_data}"
    )
    summary_response = call_api_with_prompt(summary_prompt)
    summarized_text = summary_response.get("response", "").strip()
    return summarized_text


def translate_to_arabic(english_text):
    """
    Use the same LLaMA API to get an Arabic translation of the English text.
    """
    translation_prompt = (
        "Translate the following text to Arabic:\n\n"
        f"{english_text}"
    )
    translation_response = call_api_with_prompt(translation_prompt)
    arabic_text = translation_response.get("response", "").strip()
    return arabic_text


def main(patient_scores_file, severity_file):
    """
    Main workflow for 2-file input:
    1. Filter severity levels.
    2. Convert CSVs to JSON.
    3. Generate the prompt.
    4. Call the LLaMA-based API with prompt for raw response.
    5. Summarize the response in a patient-friendly manner (English).
    6. Translate the summary to Arabic.
    7. Print the final JSON (only!) to stdout for Node to parse.
    """

    # 1. Filter severity levels
    filtered_severity_csv = "filtered_severity_levels.csv"
    remove_extra_scales(patient_scores_file, severity_file, filtered_severity_csv)

    # 2. Convert CSV to JSON
    file1_json = csv_to_json(patient_scores_file)
    file2_json = csv_to_json(filtered_severity_csv)

    # 3. Generate prompt
    prompt = generate_prompt(file1_json, file2_json)
    print("\nGenerated Prompt:\n", file=sys.stderr)
    print(prompt, file=sys.stderr)

    # 4. Call LLaMA for raw response
    response = call_api_with_prompt(prompt)
    response_data = response.get("response", "").strip()
    print("\nExtracted Response Data:\n", file=sys.stderr)
    print(response_data, file=sys.stderr)

    # 5. Summarize in English
    summarized_text = summarize_response_data(response_data)

    # 6. Translate to Arabic
    arabic_text = translate_to_arabic(summarized_text)

    # 7. Print final JSON to stdout (only!)
    output_json = {
        "english_summary": summarized_text,
        "arabic_translation": arabic_text
    }
    print(json.dumps(output_json))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Print usage errors to stderr
        print("Usage: python llama_script.py <patient_scores_file> <severity_levels_file>", file=sys.stderr)
        sys.exit(1)

    patient_scores_file = sys.argv[1]
    severity_file = sys.argv[2]

    if not os.path.exists(patient_scores_file):
        print(f"Error: patient_scores_file '{patient_scores_file}' does not exist.", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(severity_file):
        print(f"Error: severity_levels_file '{severity_file}' does not exist.", file=sys.stderr)
        sys.exit(1)

    main(patient_scores_file, severity_file)
