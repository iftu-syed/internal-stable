#this code is english and arabic version on x-axis

import pymongo
import numpy as np
from datetime import datetime
import plotly.graph_objs as go
from collections import defaultdict
import os
import re
import pandas as pd
import math
import subprocess
import sys

# Connect to MongoDB
client = pymongo.MongoClient("mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/")  # Update with your MongoDB connection string
db = client["Data_Entry_Incoming"]
collection = db["patient_data"]
# Define the mapping of questions to physical and mental health
PHYSICAL_HEALTH_QUESTIONS = {
    "Global03": "In general, how would you rate your physical health?",
    "Global06": "To what extent are you able to carry out your everyday physical activities such as walking, climbing stairs, carrying groceries, or moving a chair?",
    "Global07": "How would you rate your pain on average?",
    "Global08": "How would you rate your fatigue on average?"
}

MENTAL_HEALTH_QUESTIONS = {
    "Global02": "In general, would you say your quality of life is",
    "Global04": "In general, how would you rate your mental health, including your mood and your ability to think?",
    "Global05": "In general, how would you rate your satisfaction with your social activities and relationships?",
    "Global10": "How often have you been bothered by emotional problems such as feeling anxious, depressed, or irritable?"
}

# Define the mapping from database fields to PROMIS Global Health items
DB_TO_PROMIS_MAPPING = {
    "In general, how would you rate your physical health?": "Global03",
    "To what extent are you able to carry out your everyday physical activities such as walking, climbing stairs, carrying groceries, or moving a chair?": "Global06",
    "How would you rate your pain on average?": "Global07",
    "How would you rate your fatigue on average?": "Global08",
    "In general, would you say your quality of life is": "Global02",  # Correct mapping for Global02
    "In general, how would you rate your mental health, including your mood and your ability to think?": "Global04",
    "In general, how would you rate your satisfaction with your social activities and relationships?": "Global05",
    "How often have you been bothered by emotional problems such as feeling anxious, depressed, or irritable?": "Global10"
}

# Define T-score conversion tables
PHYSICAL_HEALTH_T_SCORE_TABLE = {
    4: 16.2, 5: 19.9, 6: 23.5, 7: 26.7, 8: 29.6, 9: 32.4, 10: 34.9,
    11: 37.4, 12: 39.8, 13: 42.3, 14: 44.9, 15: 47.7, 16: 50.8, 17: 54.1, 18: 57.1, 19: 61.9, 20: 67.7
}
MENTAL_HEALTH_T_SCORE_TABLE = {
    4: 21.2, 5: 25.1, 6: 28.4, 7: 31.3, 8: 33.8, 9: 36.3, 10: 38.8,
    11: 41.1, 12: 43.5, 13: 45.8, 14: 48.3, 15: 50.8, 16: 53.3, 17: 56.0, 18: 59.0, 19: 62.5, 20: 67.6
}

PAIN_10B_T_SCORE_TABLE = {
    6: 41.0, 7: 48.5, 8: 50.8, 9: 52.5, 10: 53.8, 11: 55.0,
    12: 56.1, 13: 57.1, 14: 58.1, 15: 59.1, 16: 60.0, 17: 60.9,
    18: 61.8, 19: 62.7, 20: 63.6, 21: 64.5, 22: 65.5, 23: 66.4,
    24: 67.4, 25: 68.5, 26: 69.6, 27: 70.9, 28: 72.4, 29: 74.4, 30: 78.3
}

PHYSICAL_6B_T_SCORE_TABLE = {
    6: 21.0, 7: 25.0, 8: 27.1, 9: 28.8, 10: 30.1, 11: 31.3, 12: 32.3, 
    13: 33.2, 14: 34.2, 15: 35.0, 16: 35.9, 17: 36.8, 18: 37.6, 
    19: 38.5, 20: 39.3, 21: 40.2, 22: 41.2, 23: 42.1, 24: 43.2, 
    25: 44.3, 26: 45.6, 27: 47.1, 28: 48.9, 29: 51.3, 30: 59.0
}

'''
This is the logic of the SAQ-7 Survey
'''

# --- Add these near your other constants ---

# Mapping from database field names (assumed based on document/screenshot) to SAQ-7 identifiers
# !! IMPORTANT: Update these keys to match your actual MongoDB field names for SAQ-7 !!
SAQ7_QUESTION_MAPPING = {
    "Walking indoors on level ground": "SAQ_PL_1",
    "Preparing meals or lifting/carrying objects (e.g., grocery bags)": "SAQ_PL_2",
    "Lifting or moving heavy objects (furniture, children)": "SAQ_PL_3",
    "Over the past four weeks, how often did you have chest pain, chest tightness, or angina?": "SAQ_AF_1",
    "Over the past four weeks, how often did you use nitroglycerin for your symptoms?": "SAQ_AF_2",
    "To what extent has your chest pain limited your enjoyment of life?": "SAQ_QL_1",
    "If you had to spend the rest of your life with your current symptoms, how would you feel?": "SAQ_QL_2",
}

# Define SAQ-7 questions for each domain using the internal identifiers
SAQ7_PL_QUESTIONS = ["SAQ_PL_1", "SAQ_PL_2", "SAQ_PL_3"]
SAQ7_AF_QUESTIONS = ["SAQ_AF_1", "SAQ_AF_2"]
SAQ7_QL_QUESTIONS = ["SAQ_QL_1", "SAQ_QL_2"]

# Raw Score Mapping (assuming input values are 1-based positional index as strings: '1', '2', ...)
# Higher score = better health state
SAQ7_PL_SCORE_MAP = {'1': 5, '2': 4, '3': 3, '4': 2, '5': 1} # Maps option index -> score
SAQ7_AF_SCORE_MAP = {'1': 6, '2': 5, '3': 4, '4': 3, '5': 2, '6': 1} # Maps option index -> score
SAQ7_QL1_SCORE_MAP = {'1': 5, '2': 4, '3': 3, '4': 2, '5': 1} # Maps option index -> score (Enjoyment)
SAQ7_QL2_SCORE_MAP = {'1': 5, '2': 4, '3': 3, '4': 2, '5': 1} # Maps option index -> score (Satisfaction)
# Note: The 6th option for PL ("Limited for other reasons", value '6') is handled explicitly in the code

# Domain Score Ranges and Mins
SAQ_PL_MIN, SAQ_PL_MAX, SAQ_PL_RANGE = 3, 15, 12
SAQ_AF_MIN, SAQ_AF_MAX, SAQ_AF_RANGE = 2, 12, 10
SAQ_QL_MIN, SAQ_QL_MAX, SAQ_QL_RANGE = 2, 10, 8
# --- End of new constants ---


# Ensure this function uses "SeattleAngina" to query the DB
def fetch_saq7_responses(mr_no):
    """Fetches SAQ-7 survey responses for a given patient."""
    # Use the EXACT key name from your MongoDB screenshot
    document = collection.find_one({"Mr_no": mr_no}, {"SeattleAngina": 1}) # <-- Uses "SeattleAngina"

    if document and "SeattleAngina" in document: # <-- Uses "SeattleAngina"
        responses = document["SeattleAngina"] # <-- Uses "SeattleAngina"

        # --- Rest of the logic to handle nested structures ---
        if isinstance(responses, dict) and len(responses) >= 1:
            first_key = next(iter(responses.keys()))
            if first_key.startswith("SeattleAngina_"):
                 print("Adjusting fetch for nested SAQ structure.")
                 processed_responses = {}
                 for nested_key, actual_response_data in responses.items():
                     if isinstance(actual_response_data, dict):
                         timestamp = actual_response_data.get("timestamp", nested_key)
                         processed_responses[timestamp] = actual_response_data
                     else:
                         print(f"Warning: Unexpected data type under {nested_key}: {type(actual_response_data)}")
                 return processed_responses # Return dict {timestamp: {answers}}
            elif any(q in responses for q in SAQ7_QUESTION_MAPPING):
                 timestamp = responses.get("timestamp", "response_0")
                 return {timestamp: responses} # Wrap single response
            else:
                 return responses # Assume already {response_id: {answers}}

        elif isinstance(responses, list) and responses:
             print("Warning: SAQ-7 data is a list, attempting conversion.")
             # Return as dict {timestamp: {answers}}
             return {resp.get("timestamp", idx): resp for idx, resp in enumerate(responses)}
        else:
            print(f"Warning: Unexpected SAQ-7 data format for Mr_no {mr_no}: {type(responses)}")
            return {}
    return {}



def _calculate_single_saq7_score(response_data):
    """
    Calculates SAQ-7 domain and summary scores for a SINGLE response dictionary.

    Args:
        response_data (dict): A dictionary containing question-answer pairs
                              for one SAQ-7 submission.

    Returns:
        dict: A dictionary containing the calculated scores for this response.
              Example: {'PL_score': 75.0, 'AF_score': 70.0, 'QL_score': 50.0, 'Summary_score': 65.0}
              Returns NaNs if calculation is not possible for a score.
    """
    db_field_to_saq_id = {v: k for k, v in SAQ7_QUESTION_MAPPING.items()}
    raw_pl, raw_af, raw_ql = 0, 0, 0
    count_pl, count_af, count_ql = 0, 0, 0

    for db_question, answer in response_data.items():
        if db_question in ["timestamp", "Mr_no", "Lang"]: continue
        saq_id = db_field_to_saq_id.get(db_question)
        if not saq_id: continue
        answer_str = str(answer).strip()
        try:
            if saq_id in SAQ7_PL_QUESTIONS:
                score = SAQ7_PL_SCORE_MAP.get(answer_str) if answer_str != '6' else None
                if score is not None: raw_pl += score; count_pl += 1
            elif saq_id in SAQ7_AF_QUESTIONS:
                score = SAQ7_AF_SCORE_MAP.get(answer_str)
                if score is not None: raw_af += score; count_af += 1
            elif saq_id in SAQ7_QL_QUESTIONS:
                score_map = SAQ7_QL1_SCORE_MAP if saq_id == "SAQ_QL_1" else SAQ7_QL2_SCORE_MAP
                score = score_map.get(answer_str)
                if score is not None: raw_ql += score; count_ql += 1
        except Exception as e:
            print(f"Error processing single SAQ-7: Q='{db_question}', A='{answer_str}', Error: {e}")
            pass

    pl_score_0_100 = np.nan
    if count_pl == len(SAQ7_PL_QUESTIONS) and SAQ_PL_RANGE > 0: pl_score_0_100 = ((raw_pl - SAQ_PL_MIN) / SAQ_PL_RANGE) * 100
    af_score_0_100 = np.nan
    if count_af == len(SAQ7_AF_QUESTIONS) and SAQ_AF_RANGE > 0: af_score_0_100 = ((raw_af - SAQ_AF_MIN) / SAQ_AF_RANGE) * 100
    ql_score_0_100 = np.nan
    if count_ql == len(SAQ7_QL_QUESTIONS) and SAQ_QL_RANGE > 0: ql_score_0_100 = ((raw_ql - SAQ_QL_MIN) / SAQ_QL_RANGE) * 100

    summary_score_0_100 = np.nan
    valid_domain_scores = [s for s in [pl_score_0_100, af_score_0_100, ql_score_0_100] if not np.isnan(s)]
    if len(valid_domain_scores) == 3: summary_score_0_100 = sum(valid_domain_scores) / 3

    return {'PL_score': pl_score_0_100, 'AF_score': af_score_0_100, 'QL_score': ql_score_0_100, 'Summary_score': summary_score_0_100}

import json

def store_csv_to_db(csv_file, mr_no, survey_type):
    if os.path.exists(csv_file):
        # Log file details for debugging
        print(f"Processing file: {csv_file}")

        # Check if the file is empty
        if os.stat(csv_file).st_size == 0:
            print(f"File {csv_file} is empty. Skipping database storage.")
            return

        try:
            # Read the CSV file into a DataFrame
            df = pd.read_csv(csv_file)

            # Ensure the DataFrame has data
            if df.empty:
                print(f"DataFrame created from {csv_file} is empty. Skipping database storage.")
                return

            # Convert the DataFrame to a dictionary
            data_dict = df.to_dict(orient="records")

            # Update the database
            collection.update_one(
                {"Mr_no": mr_no},
                {"$set": {f"SurveyData.{survey_type}": data_dict}},
                upsert=True
            )
        except pd.errors.EmptyDataError:
            print(f"No data found in {csv_file}. Skipping database storage.")
    else:
        print(f"File {csv_file} not found. Skipping database storage.")


def store_combined_csv_to_db(csv_file, mr_no):
    if os.path.exists(csv_file):
        # Read the combined CSV file into a DataFrame
        df = pd.read_csv(csv_file)
        
        # Convert the DataFrame to a dictionary
        data_dict = df.to_dict(orient="records")
        
        # Update the database under a dedicated field for patient health scores
        collection.update_one(
            {"Mr_no": mr_no},
            {"$set": {"SurveyData.patient_health_scores": data_dict}},
            upsert=True
        )
    else:
        print(f"Combined CSV file {csv_file} not found. Skipping database storage.")


# Function to fetch survey responses based on Mr_no
def fetch_promis_responses(mr_no):
    document = collection.find_one({"Mr_no": mr_no}, {"Global-Health": 1})
    if document and "Global-Health" in document:
        return document["Global-Health"]
    return {}



def recode_icq_ui_sf_scores(response):
    recoded_response = {}
    for key, value in response.items():
        try:
            # Only process q3, q4, q5 for ICIQ-UI_SF
            if key in ['How often do you leak urine?', 'How much urine do you usually leak?', 'Overall, how much does leaking urine interfere with your everyday life?']:
                recoded_response[key] = int(value)
            else:
                # Skip processing for list values and other non-integer fields
                if not isinstance(value, list):
                    recoded_response[key] = int(value)
        except ValueError:
            # Skip non-integer values like lists
            continue
    return recoded_response

# Function to recode responses as per PROMIS v1.2
def recode_responses(response):
    recoded_response = {}
    for key, value in response.items():
        if key == 'timestamp':
            continue  # Skip the timestamp field
        try:
            value = int(value)
            if key == 'Global07':
                # Recode Global07 (pain) in reverse
                if value == 0:
                    recoded_response[key + 'r'] = 5
                elif 1 <= value <= 3:
                    recoded_response[key + 'r'] = 4
                elif 4 <= value <= 6:
                    recoded_response[key + 'r'] = 3
                elif 7 <= value <= 9:
                    recoded_response[key + 'r'] = 2
                elif value == 10:
                    recoded_response[key + 'r'] = 1
            else:
                # Directly use the value for other keys
                recoded_response[key] = value
        except (ValueError, TypeError) as e:
            print(f"Skipping non-integer value for {key}: {value} ({e})")
    return recoded_response

# Function to map database fields to PROMIS Global Health items
def map_db_to_promis(response):
    mapped_response = {}
    for db_field, promis_field in DB_TO_PROMIS_MAPPING.items():
        if db_field in response:
            mapped_response[promis_field] = response[db_field]
    return mapped_response


# Function to calculate raw scores for physical and mental health
def calculate_raw_scores(responses, health_type):
    raw_scores_by_date = {}
    for key, response in responses.items():
        timestamp = response.get("timestamp")
        date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        mapped_response = map_db_to_promis(response)
        recoded_response = recode_responses(mapped_response)
        
        if health_type == 'physical':
            raw_score = sum(recoded_response.get(q + 'r' if q == 'Global07' else q, 0) for q in PHYSICAL_HEALTH_QUESTIONS.keys())
        else:  # For mental health
            raw_score = sum(recoded_response.get(q, 0) for q in MENTAL_HEALTH_QUESTIONS.keys())
        
        # Print raw scores to the console
        print(f"Raw Score for {date} ({health_type.capitalize()} Health): {raw_score}")

        if date in raw_scores_by_date:
            raw_scores_by_date[date].append(raw_score)
        else:
            raw_scores_by_date[date] = [raw_score]
    
    return {date: sum(scores) / len(scores) for date, scores in raw_scores_by_date.items()}

# Function to convert raw scores to T-scores
def convert_to_t_scores(raw_scores_by_date, health_type):
    t_scores_by_date = {}
    for date, raw_score in raw_scores_by_date.items():
        if health_type == 'physical':
            t_score = PHYSICAL_HEALTH_T_SCORE_TABLE.get(raw_score, raw_score)
        else:
            t_score = MENTAL_HEALTH_T_SCORE_TABLE.get(raw_score, raw_score)
        t_scores_by_date[date] = t_score
    return t_scores_by_date


# Original functions and graph generation logic
def fetch_survey_responses(mr_no, survey_type):
    survey_responses = []
    cursor = collection.find({"Mr_no": mr_no})
    for response in cursor:
        if survey_type in response:
            survey_responses.extend(response[survey_type].values())
    return survey_responses

def recode_promis_scores(response):
    recoded_response = {}
    for key, value in response.items():
        try:
            if key == 'Global07':
                value = int(value)
                if value == 0:
                    recoded_response[key + 'r'] = 5
                elif 1 <= value <= 3:
                    recoded_response[key + 'r'] = 4
                elif 4 <= value <= 6:
                    recoded_response[key + 'r'] = 3
                elif 7 <= value <= 9:
                    recoded_response[key + 'r'] = 2
                elif value == 10:
                    recoded_response[key + 'r'] = 1
            else:
                recoded_response[key] = int(value)
        except ValueError:
            # Skip non-integer values like timestamps
            continue
    return recoded_response



def aggregate_scores_by_date(survey_responses, survey_type):
    scores_by_date = defaultdict(int)
    date_responses = defaultdict(list)
    for response in survey_responses:
        if survey_type == "ICIQ_UI_SF":
            recoded_response = recode_icq_ui_sf_scores(response)
        else:
            recoded_response = recode_promis_scores(response)

        timestamp = response.get('timestamp')
        date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        
        # Aggregate the scores based on the selected keys
        if survey_type == "ICIQ_UI_SF":
            scores_by_date[date] += sum(recoded_response.get(key, 0) for key in ['How often do you leak urine?', 'How much urine do you usually leak?', 'Overall, how much does leaking urine interfere with your everyday life?'])
        # elif survey_type == "PAID":
        elif survey_type == "PAID" or survey_type == "PAID-5":
            # Multiply each score by 1.25 for the PAID survey before adding it to the total
            scores_by_date[date] += sum((recoded_response.get(key, 0) * 1.25) for key in recoded_response if key != 'Mr_no' and key != 'timestamp')
        elif survey_type == "Pain-Interference":
            raw_score = sum(recoded_response.get(key, 0) for key in recoded_response if key != 'Mr_no' and key != 'timestamp')
            # Convert raw score to T-score for Pain-Interference
            t_score = PAIN_10B_T_SCORE_TABLE.get(raw_score, raw_score)
            scores_by_date[date] += t_score
        
        elif survey_type == "Physical-Function":
            raw_score = sum(recoded_response.get(key, 0) for key in recoded_response if key != 'Mr_no' and key != 'timestamp')
            # Convert raw score to T-score for Physical-Function
            t_score = PHYSICAL_6B_T_SCORE_TABLE.get(raw_score, raw_score)
            scores_by_date[date] += t_score

        # elif survey_type == "SAQ-7":
        #     calculated_scores = _calculate_single_saq7_score(response)
        #     summary_score = calculated_scores.get('Summary_score', np.nan)
        #     if not np.isnan(summary_score):
        #         scores_by_date[date] += float(summary_score)
        #     date_responses[date].append(calculated_scores) # Append detailed scores for hover
        
        # # Inside aggregate_scores_by_date function, within the
        # # for response in survey_responses: loop
        # # Ensure 'timestamp' variable is defined from response.get('timestamp') before this block

        
        elif survey_type == "EQ-5D":
            current_score = np.nan
            response_identifier_for_error = timestamp if timestamp else f"Unknown EQ-5D Response (Keys: {list(response.keys())})"
            
            # Prepare initial hover data with original DB keys
            db_to_standard_dim_map = {
                "MOBILITY": "MO", "SELF-CARE": "SC", "USUAL ACTIVITIES": "UA",
                "PAIN / DISCOMFORT": "PD", "ANXIETY / DEPRESSION": "AD"
            }
            hover_data_eq5d = {db_key: response.get(db_key, "N/A") for db_key in db_to_standard_dim_map.keys()}
            if "VAS_value" in response: hover_data_eq5d["VAS_Value"] = response.get("VAS_value")
            if timestamp: hover_data_eq5d["timestamp"] = timestamp
            hover_data_eq5d["IndexScore_UK"] = "Calculation Error" # Default

            eq5d_script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "EQ-5D.py")
            tto_csv_path_for_eq5d_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "TTO.csv")

            if not os.path.exists(tto_csv_path_for_eq5d_script):
                print(f"ERROR: TTO.csv not found at {tto_csv_path_for_eq5d_script} for EQ-5D. Response ID: {response_identifier_for_error}", file=sys.stderr)
            elif not os.path.exists(eq5d_script_path):
                print(f"ERROR: EQ-5D.py script not found at {eq5d_script_path}. Response ID: {response_identifier_for_error}", file=sys.stderr)
            else:
                eq5d_input_scores_for_script = {}
                all_dimensions_valid = True
                missing_keys_list = []

                for db_field_key, standard_code in db_to_standard_dim_map.items():
                    if db_field_key in response:
                        value_str = str(response[db_field_key]).strip()
                        if not value_str:
                            print(f"ERROR: Empty score for EQ-5D dimension '{db_field_key}' in response {response_identifier_for_error}. Input: '{response[db_field_key]}'", file=sys.stderr)
                            all_dimensions_valid = False; break
                        try:
                            val = int(value_str)
                            if val not in [1, 2, 3]:
                                print(f"ERROR: Invalid score value '{val}' for EQ-5D dimension '{db_field_key}' in response {response_identifier_for_error}. Must be 1, 2, or 3.", file=sys.stderr)
                                all_dimensions_valid = False; break
                            eq5d_input_scores_for_script[standard_code] = str(val)
                        except (ValueError, TypeError):
                            print(f"ERROR: Non-integer score for EQ-5D dimension '{db_field_key}'. Value: '{response[db_field_key]}' in response {response_identifier_for_error}.", file=sys.stderr)
                            all_dimensions_valid = False; break
                    else:
                        missing_keys_list.append(db_field_key)
                        all_dimensions_valid = False
                
                if missing_keys_list:
                    print(f"ERROR: Missing EQ-5D dimension key(s) '{', '.join(missing_keys_list)}' in response {response_identifier_for_error}. Available keys: {list(response.keys())}.", file=sys.stderr)

                if all_dimensions_valid and len(eq5d_input_scores_for_script) == 5:
                    country_for_eq5d = "UK"
                    command = [
                        sys.executable, eq5d_script_path, country_for_eq5d,
                        eq5d_input_scores_for_script["MO"], eq5d_input_scores_for_script["SC"],
                        eq5d_input_scores_for_script["UA"], eq5d_input_scores_for_script["PD"],
                        eq5d_input_scores_for_script["AD"], tto_csv_path_for_eq5d_script
                    ]
                    try:
                        process = subprocess.run(command, capture_output=True, text=True, check=False, timeout=15)
                        stdout_output = process.stdout.strip()
                        stderr_output = process.stderr.strip()

                        if process.returncode == 0 and stdout_output:
                            try:
                                current_score = float(stdout_output)
                                hover_data_eq5d["IndexScore_UK"] = round(current_score, 3)
                            except ValueError:
                                print(f"ERROR: EQ-5D.py returned non-float output '{stdout_output}'. Stderr: '{stderr_output}'. Response ID: {response_identifier_for_error}.", file=sys.stderr)
                        else:
                            print(f"ERROR: EQ-5D.py script execution failed. RC: {process.returncode}. Stdout: '{stdout_output}'. Stderr: '{stderr_output}'. Resp ID: {response_identifier_for_error}.", file=sys.stderr)
                    except subprocess.TimeoutExpired:
                        print(f"ERROR: EQ-5D.py script timed out for response {response_identifier_for_error}.", file=sys.stderr)
                    except Exception as e:
                        print(f"ERROR: Exception running EQ-5D.py script for response {response_identifier_for_error}. Error: {e}", file=sys.stderr)
                else:
                    if all_dimensions_valid and len(eq5d_input_scores_for_script) != 5: # Should not happen if all_dimensions_valid is true after loop
                         print(f"ERROR: Incorrect number of valid dimensions for EQ-5D, expected 5, got {len(eq5d_input_scores_for_script)}. Resp ID: {response_identifier_for_error}.", file=sys.stderr)
                    # Errors already printed if not all_dimensions_valid
                    pass # current_score remains np.nan, hover_data_eq5d["IndexScore_UK"] remains "Calculation Error"
            
            if not np.isnan(current_score):
                scores_by_date[date] += current_score
            
            # For EQ-5D, the recoded_response for hover text is the hover_data_eq5d itself
            recoded_response = hover_data_eq5d # This will be appended to date_responses later


       

        else:
            scores_by_date[date] += sum(recoded_response.get(key, 0) for key in recoded_response if key != 'Mr_no' and key != 'timestamp')

        date_responses[date].append(recoded_response)
    return scores_by_date, date_responses


def fetch_patient_name(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
    if patient_data:
        return patient_data.get("Name")
    else:
        return "Unknown"

def fetch_patient_events(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Events": 1})
    if patient_data and "Events" in patient_data:
        return patient_data["Events"]
    else:
        return []

def create_hover_text(date_responses):
    hover_texts = []
    for date, responses in date_responses.items():
        hover_text = f"<b>Date:</b> {date}<br><br>"
        for response in responses:
            hover_text += "<b>Response:</b><br>{}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
        hover_texts.append(hover_text)
    return hover_texts



def create_gradient_shapes(max_score, safe_limit, survey_type):

    def parse_rgba(color):
        # Extract the numeric values from the RGBA string
        rgba = re.findall(r"[\d\.]+", color)
        return tuple(map(float, rgba))

    shapes = []

    if survey_type == 'Global-Health':
        # Use the provided gradient colors
        gradients = [
            {"y0": 70, "y1": 80, "color_start": (144, 238, 144, 1), "color_end": (0, 128, 0, 1)},       # Excellent (Dark Green to Light Green)
            {"y0": 60, "y1": 70, "color_start": (173, 255, 47, 1), "color_end": (144, 238, 144, 1)},   # Very Good (Light Green to Yellow-Green)
            {"y0": 50, "y1": 60, "color_start": (255, 255, 0, 1), "color_end": (173, 255, 47, 1)},     # Good (Yellow-Green to Yellow)
            {"y0": 40, "y1": 50, "color_start": (255, 169, 0, 1), "color_end": (255, 255, 0, 1)},      # Fair (Yellow to Orange)
            {"y0": 20, "y1": 40, "color_start": (255, 69, 0, 1), "color_end": (255, 165, 0, 1)}        # Poor (Orange to Red)
        ]

        # Add the gradient rectangles to the shapes
        for gradient in gradients:
            steps = 400  # Increase steps for smoother gradients

            for i in range(steps):
                # Linear interpolation between colors
                r = gradient["color_start"][0] + (gradient["color_end"][0] - gradient["color_start"][0]) * i / steps
                g = gradient["color_start"][1] + (gradient["color_end"][1] - gradient["color_start"][1]) * i / steps
                b = gradient["color_start"][2] + (gradient["color_end"][2] - gradient["color_start"][2]) * i / steps
                alpha = gradient["color_start"][3] + (gradient["color_end"][3] - gradient["color_start"][3]) * i / steps

                shapes.append({
                    "type": "rect",
                    "xref": "paper",
                    "yref": "y",
                    "x0": 0,
                    "x1": 1,
                    "y0": gradient["y0"] + i * (gradient["y1"] - gradient["y0"]) / steps,
                    "y1": gradient["y0"] + (i + 1) * (gradient["y1"] - gradient["y0"]) / steps,
                    "fillcolor": f"rgba({int(r)}, {int(g)}, {int(b)}, {alpha})",
                    "layer": "below",
                    "line": {"width": 0}
                })

    else:
        # For other surveys, use the previous logic if needed
        gradient_steps = 100
        for i in range(gradient_steps):
            shapes.append({
                "type": "rect",
                "xref": "paper",
                "yref": "y",
                "x0": 0,
                "x1": 1,
                "y0": i * safe_limit / gradient_steps,
                "y1": (i + 1) * safe_limit / gradient_steps,
                "fillcolor": f"rgba(0, 255, 0, {0.2 * (1 - i / gradient_steps)})",
                "layer": "below",
                "line": {"width": 0}
            })
            shapes.append({
                "type": "rect",
                "xref": "paper",
                "yref": "y",
                "x0": 0,
                "x1": 1,
                "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
                "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
                "fillcolor": f"rgba(255, 0, 0, {0.2 * (i / gradient_steps)})",
                "layer": "below",
                "line": {"width": 0}
            })

    return shapes




def create_label_annotations(max_score, safe_limit, survey_type, months_since_initial):
    opacity = 0.5  # Adjust this value to set the desired opacity
    label_x = len(months_since_initial) + 1  # Positioning outside the graph

    if survey_type == 'Global-Health':
        return [
            dict(
                xref="x",
                yref="y",
                x=label_x,
                y=safe_limit / 4,
                text="severe",
                showarrow=False,
                font=dict(size=14, color=f"rgba(0,0,0,{opacity})")
            ),
            dict(
                xref="x",
                yref="y",
                x=label_x,
                y=safe_limit * 0.75,
                text="moderate",
                showarrow=False,
                font=dict(size=14, color=f"rgba(0,0,0,{opacity})")
            ),
            dict(
                xref="x",
                yref="y",
                x=label_x,
                y=safe_limit + (max_score - safe_limit) / 2,
                text="mild",
                showarrow=False,
                font=dict(size=14, color=f"rgba(0,0,0,{opacity})")
            )
        ]
    else:
        return [
            dict(
                xref="x",
                yref="y",
                x=label_x+0.3,
                y=safe_limit / 4,
                text="mild",
                showarrow=False,
                font=dict(size=14, color=f"rgba(0,0,0,{opacity})")
            ),
            dict(
                xref="x",
                yref="y",
                x=label_x+0.3,
                y=safe_limit * 0.75,
                text="moderate",
                showarrow=False,
                font=dict(size=14, color=f"rgba(0,0,0,{opacity})")
            ),
            dict(
                xref="x",
                yref="y",
                x=label_x+0.3,
                y=safe_limit + (max_score - safe_limit) / 2,
                text="severe",
                showarrow=False,
                font=dict(size=14, color=f"rgba(0,0,0,{opacity})")
            )
        ]

def get_threshold(survey_type):
    thresholds = {
        'EPDS': 12,
        'Global-Health': 50,  # Update threshold for Global-Health
        'ICIQ_UI_SF': 12,
        'PAID': 39,
        'PAID-5':39,
        'Wexner': 8,
        'Pain-Interference': 50,  # Add threshold for Pain-Interference
        'Physical-Function':50,
        'PHQ-2': 3,
        'SAQ-7': 50,
        'EQ-5D': 0,
        # 'PBQ': 39,
        # Add other survey types and their thresholds here
    }
    return thresholds.get(survey_type, 10)  # Default threshold is 10



def graph_generate(mr_no, survey_type):
    ARABIC_MONTH_LABELS = [
        "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
        "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
        "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
    ]

    # Define ymin and ymax for each survey type
    survey_limits = {
        'Wexner': (0, 20),
        'ICIQ_UI_SF': (0, 21),
        'PAID': (0, 100),
        'PAID-5': (0, 25),
        'EPDS': (0, 30),
        'Pain-Interference': (16, 80),  # Add ymin and ymax for Pain-Interference
        'Physical-Function': (16, 80),
        'PHQ-2': (0, 6),
        'SAQ-7': (0, 100),
        'EQ-5D': (-0.594, 1),
    }
    
    patient_name = fetch_patient_name(mr_no)
    survey_responses = fetch_survey_responses(mr_no, survey_type)
    
    print(f"Survey responses for {survey_type}: {survey_responses}")
    
    scores_by_date, date_responses = aggregate_scores_by_date(survey_responses, survey_type)
    all_dates = sorted(scores_by_date.keys())
    scores = [scores_by_date[date] for date in all_dates]
    hover_text = create_hover_text(date_responses)

    print(f"All dates: {all_dates}")
    print(f"Scores: {scores}")

    if not scores:
        print(f"No data found for survey type {survey_type}")
        return

    initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
    months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

    # Adjust x-axis labels to reflect actual months with data
    x_labels = []
    for date in all_dates:
        months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
        if months_diff == 1:
            x_labels.append("Baseline<br>(الأساسي)")
        else:
            x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

    trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
                       hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
                       line=dict(width=2),
                       marker=dict(size=8))

    safe_limit = get_threshold(survey_type)

    max_score = max(scores) + 5
    layout = {
        "xaxis": dict(
            title='Timeline (Months)',
            tickvals=months_since_initial,
            ticktext=x_labels,
            range=[0.5, max(months_since_initial) + 1.5]
        ),
        "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
        "plot_bgcolor": 'rgba(0,0,0,0)',
        "paper_bgcolor": 'rgba(255,255,255,1)',
        "hovermode": 'closest',
        "legend": {
            "x": 0.02,
            "y": 0.98,
            "bgcolor": 'rgba(255,255,255,0.5)',
            "bordercolor": 'rgba(0,0,0,0.5)',
            "borderwidth": 2
        },
        "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
        "annotations": create_label_annotations(max_score, safe_limit, survey_type, months_since_initial)
    }

    patient_events = fetch_patient_events(mr_no)
    
    annotations = []
    for event in patient_events:
        event_date = event["date"]
        annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
        months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
        annotation_x = months_since_initial_event
        annotation_y = max_score - 5

        # Add annotation for the intervention event with vertical text
        annotations.append(
            dict(
                x=annotation_x,
                y=max_score / 1.3,
                xref="x",
                yref="y",
                text=event["event"],
                showarrow=False,
                font=dict(size=12, color="black"),
                textangle=-90,
                valign="middle",
                xanchor="right"
            )
        )

        layout["shapes"].append({
            "type": "line",
            "x0": annotation_x,
            "y0": 0,
            "x1": annotation_x,
            "y1": max_score,
            "line": {"color": "black", "width": 1, "dash": "dash"}
        })

    layout["annotations"].extend(annotations)

    fig = go.Figure(data=[trace], layout=layout)
    
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

    fig.update_layout(
        autosize=True,
        title=dict(font=dict(size=16, color='#333'), x=0.5),
        margin=dict(l=40, r=100, b=40, t=60),
        hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
        legend_title=dict(font=dict(size=12, color='#333')),
    )

    output_dir = 'common_login/new_folder'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    # fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))

    # Retrieve the limits for the survey type using the trace name
    trace_name = trace.name
    ymin, ymax = survey_limits.get(trace_name, (0, 100))

    # Collect data to return
    graph_data = {
        'dates': all_dates,
        'months_since_initial': months_since_initial,
        'scores': scores,
        'trace_name': [trace.name] * len(all_dates),
        'mr_no': [mr_no] * len(all_dates),
        'survey_type': [survey_type] * len(all_dates),
        'title': [trace_name] * len(all_dates),  # Ensure title is set from the correct trace name
        'ymin': [ymin] * len(all_dates),
        'ymax': [ymax] * len(all_dates)
    }

    return graph_data







def generate_and_save_survey_data(mr_no, survey_type):
    if survey_type == 'Global-Health':
        return  # Skip generating CSV and storing for Global-Health
    
    survey_data = graph_generate(mr_no, survey_type)
    
    if survey_data:
        csv_file = f'common_login/data/{survey_type}_{mr_no}.csv'
        survey_df = pd.DataFrame(survey_data)
        survey_df.to_csv(csv_file, index=False)
        
        # Log file details for debugging
        print(f"CSV file generated: {csv_file}")
        print(f"CSV file preview:\n{survey_df.head()}")

        # Store the CSV data into MongoDB
        store_csv_to_db(csv_file, mr_no, survey_type)
    else:
        print(f"No data found for survey type {survey_type} for Mr_no: {mr_no}")


#     combined_df.to_csv(f'common_login/data/patient_health_scores_{mr_no}.csv', index=False)
def fetch_patient_events(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Events": 1})
    if patient_data and "Events" in patient_data:
        return patient_data["Events"]
    else:
        return []


def combine_all_csvs(mr_no):
    # List all individual CSV files
    csv_files = [
        f'common_login/data/physical_health_{mr_no}.csv',
        f'common_login/data/mental_health_{mr_no}.csv',
        f'common_login/data/ICIQ_UI_SF_{mr_no}.csv',
        f'common_login/data/Wexner_{mr_no}.csv',
        f'common_login/data/PAID_{mr_no}.csv',
        f'common_login/data/PAID-5_{mr_no}.csv',
        f'common_login/data/EPDS_{mr_no}.csv',
        f'common_login/data/Pain-Interference_{mr_no}.csv',
        f'common_login/data/Physical-Function_{mr_no}.csv',
        f'common_login/data/PHQ-2_{mr_no}.csv',
        f'common_login/data/SAQ-7_{mr_no}.csv',
        f'common_login/data/EQ-5D_{mr_no}.csv',
        
    ]

    combined_df = pd.DataFrame()

    # Fetch events data
    events = fetch_patient_events(mr_no)  # Assumes this function is defined elsewhere in your code

    for csv_file in csv_files:
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            # Drop the 'health_type' and 'survey_type' columns if they exist
            df = df.drop(columns=['health_type', 'survey_type'], errors='ignore')
            combined_df = pd.concat([combined_df, df], ignore_index=True)
        else:
            print(f"File {csv_file} not found. Skipping.")

    # Rename columns
    combined_df = combined_df.rename(columns={
        'dates': 'date',
        'months_since_initial': 'months_since_baseline',
        'scores': 'score'
    })

    # Update trace_name values
    combined_df['trace_name'] = combined_df['trace_name'].replace({
        'Physical Health': 'Global-Health Physical',
        'Mental Health': 'Global-Health Mental',
        'ICIQ_UI_SF': 'ICIQ_UI SF',
        'Wexner': 'WEXNER',
        'PAID': 'PAID',
        'PAID-5': 'PAID-5',
        'PHQ-2': 'PHQ-2',
        'SAQ-7': 'SAQ-7 Summary',
        'EPDS': 'EPDS',
        'Pain-Interference':'Pain-Interference',
        'Physical-Function':'Physical-Function',
        'EQ-5D': 'EQ-5D',
    })

    # Update title field based on trace_name
    combined_df['title'] = combined_df['trace_name'].replace({
        'Global-Health Physical': 'Global Physical Health Score',
        'Global-Health Mental': 'Global Mental Health Score',
        'ICIQ_UI SF': 'Urinary Incontinence Score (Pregnancy)',
        'WEXNER': 'Wexner Incontinence Score (Pregnancy)',
        'PAID': 'Problem Areas in Diabetes Score',
        'PAID-5': 'Diabetes Related Emotional Distress',
        'PHQ-2': 'Depression Screening Score (PHQ-2)',
        'SAQ-7 Summary': 'Seattle Angina Questionnaire 7 Summary Score',
        'EPDS': 'Postnatal Depression Score (Pregnancy)',
        'Pain-Interference':'Pain Interference',
        'Physical-Function':'Physical Function',
        'EQ-5D': 'Overall Quality Of Life',
    })

    # Match the closest event date to the score date
    combined_df['event_date'] = None
    combined_df['event'] = None

    for idx, row in combined_df.iterrows():
        score_date = datetime.strptime(row['date'], "%Y-%m-%d")
        if events:
            closest_event = min(events, key=lambda event: abs(datetime.strptime(event['date'], "%Y-%m-%d") - score_date))
            combined_df.at[idx, 'event_date'] = closest_event['date']
            combined_df.at[idx, 'event'] = closest_event['event']

    combined_csv_file = f'common_login/data/patient_health_scores_{mr_no}.csv'
    combined_df.to_csv(combined_csv_file, index=False)

    # Store the combined CSV data into MongoDB
    store_combined_csv_to_db(combined_csv_file, mr_no)


# Get the Mr_no and survey_type from command-line arguments
import sys

try:
    mr_no = str(sys.argv[1])
    survey_type = str(sys.argv[2])
except IndexError:
    print("No input value provided.")
    sys.exit(1)
except ValueError:
    print("Invalid input value. Please provide valid Mr_no and survey_type.")
    sys.exit(1)

# Call the graph generation function for the specified survey type
graph_generate(mr_no, survey_type)





def generate_graph(mr_no, health_type):
    ARABIC_MONTH_LABELS = [
        "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)",
        "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)",
        "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
    ]

    responses = fetch_promis_responses(mr_no)
    if not responses:
        print(f"No Global-Health data found for Mr_no: {mr_no}")
        return

    raw_scores_by_date = calculate_raw_scores(responses, health_type)
    t_scores_by_date = convert_to_t_scores(raw_scores_by_date, health_type)

    dates = sorted(t_scores_by_date.keys())
    scores = [t_scores_by_date[date] for date in dates]

    if not scores:
        print(f"No scores found for {health_type} health")
        return

    # Calculate months since initial date dynamically
    initial_date = datetime.strptime(dates[0], "%Y-%m-%d")
    months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in dates]

    # Adjust x-axis labels to reflect actual months with data
    x_labels = []
    for date in dates:
        months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
        if months_diff == 1:
            x_labels.append("Baseline<br>(الأساسي)")
        else:
            x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

    trace = go.Scatter(x=months_since_initial, y=scores, name=f"{health_type.capitalize()} Health", mode='lines+markers')

    max_score = 80  # Set this to the appropriate upper bound for your T-scores

    # Add horizontal line at T-score 50
    horizontal_line = {
        "type": "line",
        "x0": 0,
        "x1": max(months_since_initial) + 1,
        "xref": "x",
        "y0": 50,
        "y1": 50,
        "yref": "y",
        "line": {
            "color": "black",
            "width": 2,
            "dash": "dash"
        }
    }

    # Add annotation for the horizontal line
    horizontal_line_annotation = {
        "xref": "x",
        "yref": "y",
        "x": max(months_since_initial) + 1.25,
        "y": 50,
        "text": "Population Average",
        "showarrow": False,
        "font": {
            "color": "rgba(0,0,0,0.5)",
            "size": 8
        }
    }

    gradient_shapes = create_gradient_shapes(max_score, 50, 'Global-Health')

    label_annotations = [
        {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 75, "text": "Excellent",
         "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 65, "text": "Very Good",
         "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 55, "text": "Good",
         "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 40, "text": "Fair",
         "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 25, "text": "Poor",
         "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}}
    ]

    layout = {
        "title": f'{health_type.capitalize()} Health',
        "xaxis": dict(
            title='Timeline (Months)',
            tickvals=months_since_initial,
            ticktext=x_labels,
            range=[0.5, max(months_since_initial) + 1.5]
        ),
        "yaxis": dict(
            title='T-Score',
            range=[20, max_score],
            gridcolor='rgba(255, 255, 255, 0)',
            gridwidth=0.5
        ),
        "plot_bgcolor": 'rgba(0,0,0,0)',
        "paper_bgcolor": 'rgba(255,255,255,1)',
        "hovermode": 'closest',
        "shapes": [horizontal_line] + gradient_shapes,
        "annotations": [horizontal_line_annotation] + label_annotations
    }

    patient_events = fetch_patient_events(mr_no)

    annotations = []
    for event in patient_events:
        event_date = event["date"]
        annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
        months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
        annotation_x = months_since_initial_event

        annotations.append(
            dict(
                x=annotation_x,
                y=max_score / 1.3,
                xref="x",
                yref="y",
                text=event["event"],
                showarrow=False,
                font=dict(size=12, color="black"),
                textangle=-90,
                valign="middle",
                xanchor="right"
            )
        )

        layout["shapes"].append({
            "type": "line",
            "x0": annotation_x,
            "y0": 0,
            "x1": annotation_x,
            "y1": max_score,
            "line": {"color": "black", "width": 1, "dash": "dash"}
        })

    layout["annotations"].extend(annotations)

    fig = go.Figure(data=[trace], layout=layout)

    output_dir = 'common_login/new_folder'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    # fig.write_image(os.path.join(output_dir, f"plot_{health_type}_health_{mr_no}.jpg"))

    # Define ymin and ymax limits based on health type
    if health_type == 'physical':
        ymin, ymax = 16, 68
    elif health_type == 'mental':
        ymin, ymax = 21, 68
    else:
        ymin, ymax = 20, max_score  # Default values

    # Collect data to return
    graph_data = {
        'dates': dates,
        'months_since_initial': months_since_initial,
        'scores': scores,
        'trace_name': [trace.name] * len(dates),
        'mr_no': [mr_no] * len(dates),
        'health_type': [health_type] * len(dates),
        'title': [f'Global-Health {health_type.capitalize()} Health'] * len(dates),
        'ymin': [ymin] * len(dates),  # ymin value
        'ymax': [ymax] * len(dates)   # ymax value
    }

    return graph_data




# Update generate_physical_and_mental_graphs
def generate_physical_and_mental_graphs(mr_no):
    physical_data = generate_graph(mr_no, 'physical')
    mental_data = generate_graph(mr_no, 'mental')

    if physical_data:
        # Create and save physical health CSV
        physical_csv_file = f'common_login/data/physical_health_{mr_no}.csv'
        physical_df = pd.DataFrame(physical_data)
        physical_df.to_csv(physical_csv_file, index=False)
        
        # Store the physical health CSV into MongoDB
        store_csv_to_db(physical_csv_file, mr_no, 'physical_health')
    else:
        print(f"No physical health data found for Mr_no: {mr_no}")

    if mental_data:
        # Create and save mental health CSV
        mental_csv_file = f'common_login/data/mental_health_{mr_no}.csv'
        mental_df = pd.DataFrame(mental_data)
        mental_df.to_csv(mental_csv_file, index=False)
        
        # Store the mental health CSV into MongoDB
        store_csv_to_db(mental_csv_file, mr_no, 'mental_health')
    else:
        print(f"No mental health data found for Mr_no: {mr_no}")



# Generate and save data for the specified survey type (excluding Global-Health)
if survey_type != 'Global-Health':
    generate_and_save_survey_data(mr_no, survey_type)

# Generate physical and mental health graphs
generate_physical_and_mental_graphs(mr_no)

# Combine all CSVs into a single CSV
combine_all_csvs(mr_no)



# Generate physical and mental health graphs
generate_physical_and_mental_graphs(mr_no)



