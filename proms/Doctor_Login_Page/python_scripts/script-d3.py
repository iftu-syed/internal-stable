#this code is english and arabic version on x-axis

import pymongo
import numpy as np
from datetime import datetime
import plotly.graph_objs as go
from collections import defaultdict
import os
import re
import pandas as pd

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
# Function to fetch survey responses based on Mr_no
def fetch_promis_responses(mr_no):
    document = collection.find_one({"Mr_no": mr_no}, {"PROMIS-10": 1})
    if document and "PROMIS-10" in document:
        return document["PROMIS-10"]
    return {}



def recode_icq_ui_sf_scores(response):
    recoded_response = {}
    for key, value in response.items():
        try:
            # Only process q3, q4, q5 for ICIQ_UI_SF
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

# # Function to calculate raw scores for physical and mental health
# def calculate_raw_scores(responses, health_type):
#     raw_scores_by_date = {}
#     for key, response in responses.items():
#         timestamp = response.get("timestamp")
#         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
#         mapped_response = map_db_to_promis(response)
#         recoded_response = recode_responses(mapped_response)
        
#         if health_type == 'physical':
#             # Collect the individual scores and the questions for debugging
#             scores = [(q, recoded_response.get(q + 'r' if q == 'Global07' else q, 0)) for q in PHYSICAL_HEALTH_QUESTIONS.keys()]
#         else:  # For mental health
#             scores = [(q, recoded_response.get(q, 0)) for q in MENTAL_HEALTH_QUESTIONS.keys()]

#         # Calculate the raw score
#         raw_score = sum(score for _, score in scores)

#         # Print each question and its score
#         print(f"Date: {date} ({health_type.capitalize()} Health)")
#         for question, score in scores:
#             print(f"  {question}: {score}")

#         # Print the total raw score for the date
#         print(f"Raw Score for {date} ({health_type.capitalize()} Health): {raw_score}\n")

#         # Store the raw score
#         if date in raw_scores_by_date:
#             raw_scores_by_date[date].append(raw_score)
#         else:
#             raw_scores_by_date[date] = [raw_score]
    
#     return {date: sum(scores) / len(scores) for date, scores in raw_scores_by_date.items()}


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


# def generate_graph(mr_no, health_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)",
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)",
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     responses = fetch_promis_responses(mr_no)  # Assuming this is a function that fetches data
#     if not responses:
#         print(f"No PROMIS-10 data found for Mr_no: {mr_no}")
#         return

#     raw_scores_by_date = calculate_raw_scores(responses, health_type)  # Call the function to calculate scores
#     t_scores_by_date = convert_to_t_scores(raw_scores_by_date, health_type)

#     dates = sorted(t_scores_by_date.keys())
#     scores = [t_scores_by_date[date] for date in dates]

#     if not scores:
#         print(f"No scores found for {health_type} health")
#         return

#     # Calculate months since initial date
#     initial_date = datetime.strptime(dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in dates]

#     trace = go.Scatter(x=months_since_initial, y=scores, name=f"{health_type.capitalize()} Health", mode='lines+markers')

#     # Define max_score based on the T-score range
#     max_score = 80  # Set this to the appropriate upper bound for your T-scores

#     # Add horizontal line at T-score 50
#     horizontal_line = {
#         "type": "line",
#         "x0": 0,
#         "x1": len(months_since_initial) + 1,
#         "xref": "x",
#         "y0": 50,
#         "y1": 50,
#         "yref": "y",
#         "line": {
#             "color": "black",
#             "width": 2,
#             "dash": "dash"
#         }
#     }

#     # Add annotation for the horizontal line
#     horizontal_line_annotation = {
#         "xref": "x",
#         "yref": "y",
#         "x": len(months_since_initial) + 1.25,
#         "y": 50,
#         "text": "Population Average",
#         "showarrow": False,
#         "font": {
#             "color": "rgba(0,0,0,0.5)",
#             "size": 8
#         }
#     }

#     gradient_shapes = create_gradient_shapes(max_score, 50, 'PROMIS-10')  # Using max_score defined here

#     label_annotations = [
#         {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1.25, "y": 75, "text": "Excellent",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1.25, "y": 65, "text": "Very Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1.25, "y": 55, "text": "Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1.25, "y": 40, "text": "Fair",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1.25, "y": 25, "text": "Poor",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}}
#     ]

#     layout = {
#         "title": f'{health_type.capitalize()} Health',
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=list(range(1, len(months_since_initial) + 2)),  # Extend by 1 month
#             ticktext=ARABIC_MONTH_LABELS[:len(months_since_initial) + 1],  # Use the Arabic labels
#             range=[0.5, len(months_since_initial) + 1.5]  # Ensure proper spacing
#         ),
#         "yaxis": dict(
#             title='T-Score',
#             range=[20, max_score],  # Use max_score for the upper limit
#             gridcolor='rgba(255, 255, 255, 0)',  # Make the grid lines transparent
#             gridwidth=0.5  # You can also try setting this to 0 to remove grid lines entirely
#         ),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "shapes": [horizontal_line] + gradient_shapes,
#         "annotations": [horizontal_line_annotation] + label_annotations
#     }

#     patient_events = fetch_patient_events(mr_no)

#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event  # Event date in months since initial date

#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{health_type}_health_{mr_no}.jpg"))

#      # Collect data to return
#     graph_data = {
#             'dates': dates,
#             'months_since_initial': months_since_initial,
#             'scores': scores,
#             'trace_name': [trace.name] * len(dates),  # Include trace name
#             'mr_no': [mr_no] * len(dates),  # Include Mr_no
#             'health_type': [health_type] * len(dates)  # Include health type
#         }

#     return graph_data  # Add this line to return the data




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
            # elif key == 'Global08':
            #     value = int(value)
            #     recoded_response[key + 'r'] = value
            # elif key == 'Global10':
            #     value = int(value)
            #     recoded_response[key + 'r'] = value
            else:
                recoded_response[key] = int(value)
        except ValueError:
            # Skip non-integer values like timestamps
            continue
    return recoded_response

# def aggregate_scores_by_date(survey_responses, survey_type):
#     scores_by_date = defaultdict(int)
#     date_responses = defaultdict(list)
#     for response in survey_responses:
#         if survey_type == "ICIQ-UI_SF":
#             recoded_response = recode_icq_ui_sf_scores(response)
#         else:
#             recoded_response = recode_promis_scores(response)

#         timestamp = response.get('timestamp')
#         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        
#         # Aggregate the scores based on the selected keys
#         if survey_type == "ICIQ-UI_SF":
#             scores_by_date[date] += sum(recoded_response.get(key, 0) for key in ['How often do you leak urine?', 'How much urine do you usually leak?', 'Overall, how much does leaking urine interfere with your everyday life?'])
#         else:
#             scores_by_date[date] += sum(value for key, value in recoded_response.items() if key != 'Mr_no' and key != 'timestamp')

#         date_responses[date].append(recoded_response)
#     return scores_by_date, date_responses



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
        elif survey_type == "PAID":
            # Multiply each score by 1.25 for the PAID survey before adding it to the total
            scores_by_date[date] += sum((recoded_response.get(key, 0) * 1.25) for key in recoded_response if key != 'Mr_no' and key != 'timestamp')
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

    if survey_type == 'PROMIS-10':
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

    if survey_type == 'PROMIS-10':
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
        'PROMIS-10': 50,  # Update threshold for PROMIS-10
        'ICIQ_UI_SF': 12,
        'PAID': 39,
        'Wexner': 8,
        # 'PBQ': 39,
        # Add other survey types and their thresholds here
    }
    return thresholds.get(survey_type, 10)  # Default threshold is 10


# def graph_generate(mr_no, survey_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     patient_name = fetch_patient_name(mr_no)
#     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
#     print(f"Survey responses for {survey_type}: {survey_responses}")
    
#     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses, survey_type)
#     all_dates = sorted(scores_by_date.keys())
#     scores = [scores_by_date[date] for date in all_dates]
#     hover_text = create_hover_text(date_responses)

#     print(f"All dates: {all_dates}")
#     print(f"Scores: {scores}")

#     if not scores:
#         print(f"No data found for survey type {survey_type}")
#         return

#     initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

#     trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     safe_limit = get_threshold(survey_type)

#     max_score = max(scores) + 5
#     layout = {
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=list(range(1, len(months_since_initial) + 2)),  # Extend by 1 month
#             ticktext=ARABIC_MONTH_LABELS[:len(months_since_initial) + 1],  # Use the Arabic labels
#             range=[0.5, len(months_since_initial) + 1.5]  # Ensure proper spacing
#         ),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
#         "annotations": create_label_annotations(max_score, safe_limit, survey_type, months_since_initial)
#     }

#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event  # Event date in months since initial date
#         annotation_y = max_score - 5  # Adjust y-coordinate for annotation text

#         # annotations.append(
#         #     dict(
#         #         x=annotation_x,
#         #         y=annotation_y,
#         #         xref="x",
#         #         yref="y",
#         #         text=event["event"],
#         #         showarrow=True,
#         #         arrowhead=7,
#         #         ax=0,
#         #         ay=-40
#         #     )
#         # )
# # Add annotation for the intervention event with vertical text
#         # Add annotation for the intervention event with vertical text within the graph
#         annotations.append(
#             dict(
#                 x=annotation_x,  # Keep the x coordinate at the event position
#                 y=max_score / 1.3,  # Position it in the middle of the vertical line
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,  # No arrow needed
#                 font=dict(size=12, color="black"),  # Adjust size and color as needed
#                 textangle=-90,  # Rotate text to be vertical
#                 valign="middle",  # Align text to the middle of the annotation point
#                 xanchor="right"  # Anchor text to the right to keep it inside the graph
#             )
#         )

        

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)
    
#     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#     fig.update_layout(
#         autosize=True,
#         title=dict(font=dict(size=16, color='#333'), x=0.5),
#         margin=dict(l=40, r=100, b=40, t=60),  # Increase right margin for label space
#         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
#         legend_title=dict(font=dict(size=12, color='#333')),
#     )

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))

# def graph_generate(mr_no, survey_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     patient_name = fetch_patient_name(mr_no)
#     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
#     print(f"Survey responses for {survey_type}: {survey_responses}")
    
#     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses, survey_type)
#     all_dates = sorted(scores_by_date.keys())
#     scores = [scores_by_date[date] for date in all_dates]
#     hover_text = create_hover_text(date_responses)

#     print(f"All dates: {all_dates}")
#     print(f"Scores: {scores}")

#     if not scores:
#         print(f"No data found for survey type {survey_type}")
#         return

#     initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in all_dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     safe_limit = get_threshold(survey_type)

#     max_score = max(scores) + 5
#     layout = {
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
#         "annotations": create_label_annotations(max_score, safe_limit, survey_type, months_since_initial)
#     }

#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event
#         annotation_y = max_score - 5

#         # Add annotation for the intervention event with vertical text
#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)
    
#     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#     fig.update_layout(
#         autosize=True,
#         title=dict(font=dict(size=16, color='#333'), x=0.5),
#         margin=dict(l=40, r=100, b=40, t=60),
#         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
#         legend_title=dict(font=dict(size=12, color='#333')),
#     )

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))


# def graph_generate(mr_no, survey_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     patient_name = fetch_patient_name(mr_no)
#     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
#     print(f"Survey responses for {survey_type}: {survey_responses}")
    
#     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses, survey_type)
#     all_dates = sorted(scores_by_date.keys())
#     scores = [scores_by_date[date] for date in all_dates]
#     hover_text = create_hover_text(date_responses)

#     print(f"All dates: {all_dates}")
#     print(f"Scores: {scores}")

#     if not scores:
#         print(f"No data found for survey type {survey_type}")
#         return

#     initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in all_dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     safe_limit = get_threshold(survey_type)

#     max_score = max(scores) + 5
#     layout = {
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
#         "annotations": create_label_annotations(max_score, safe_limit, survey_type, months_since_initial)
#     }

#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event
#         annotation_y = max_score - 5

#         # Add annotation for the intervention event with vertical text
#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)
    
#     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#     fig.update_layout(
#         autosize=True,
#         title=dict(font=dict(size=16, color='#333'), x=0.5),
#         margin=dict(l=40, r=100, b=40, t=60),
#         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
#         legend_title=dict(font=dict(size=12, color='#333')),
#     )

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))

#     # Collect data to return
#     graph_data = {
#         'dates': all_dates,
#         'months_since_initial': months_since_initial,
#         'scores': scores,
#         'trace_name': [trace.name] * len(all_dates),
#         'mr_no': [mr_no] * len(all_dates),
#         'survey_type': [survey_type] * len(all_dates)
#     }

#     return graph_data


# def graph_generate(mr_no, survey_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     patient_name = fetch_patient_name(mr_no)
#     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
#     print(f"Survey responses for {survey_type}: {survey_responses}")
    
#     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses, survey_type)
#     all_dates = sorted(scores_by_date.keys())
#     scores = [scores_by_date[date] for date in all_dates]
#     hover_text = create_hover_text(date_responses)

#     print(f"All dates: {all_dates}")
#     print(f"Scores: {scores}")

#     if not scores:
#         print(f"No data found for survey type {survey_type}")
#         return

#     initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in all_dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     safe_limit = get_threshold(survey_type)

#     max_score = max(scores) + 5
#     layout = {
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
#         "annotations": create_label_annotations(max_score, safe_limit, survey_type, months_since_initial)
#     }

#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event
#         annotation_y = max_score - 5

#         # Add annotation for the intervention event with vertical text
#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)
    
#     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#     fig.update_layout(
#         autosize=True,
#         title=dict(font=dict(size=16, color='#333'), x=0.5),
#         margin=dict(l=40, r=100, b=40, t=60),
#         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
#         legend_title=dict(font=dict(size=12, color='#333')),
#     )

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))

#     # Collect data to return
#     graph_data = {
#         'dates': all_dates,
#         'months_since_initial': months_since_initial,
#         'scores': scores,
#         'trace_name': [trace.name] * len(all_dates),
#         'mr_no': [mr_no] * len(all_dates),
#         'survey_type': [survey_type] * len(all_dates),
#         'title': [survey_type] * len(all_dates),
#         'ymin': [min(scores)] * len(all_dates),
#         'ymax': [max(scores)] * len(all_dates)
#     }

#     return graph_data


# def graph_generate(mr_no, survey_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     # Define ymin and ymax for each survey type
#     survey_limits = {
#         'PROMIS-10 Physical': (16, 68),
#         'PROMIS-10 Mental': (21, 68),
#         'WEXNER': (0, 20),
#         'ICIQ-UI SF': (0, 21),
#         'PAID': (0, 100),
#         'EPDS': (0, 30)
#     }
    
#     patient_name = fetch_patient_name(mr_no)
#     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
#     print(f"Survey responses for {survey_type}: {survey_responses}")
    
#     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses, survey_type)
#     all_dates = sorted(scores_by_date.keys())
#     scores = [scores_by_date[date] for date in all_dates]
#     hover_text = create_hover_text(date_responses)

#     print(f"All dates: {all_dates}")
#     print(f"Scores: {scores}")

#     if not scores:
#         print(f"No data found for survey type {survey_type}")
#         return

#     initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in all_dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     safe_limit = get_threshold(survey_type)

#     max_score = max(scores) + 5
#     layout = {
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
#         "annotations": create_label_annotations(max_score, safe_limit, survey_type, months_since_initial)
#     }

#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event
#         annotation_y = max_score - 5

#         # Add annotation for the intervention event with vertical text
#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)
    
#     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#     fig.update_layout(
#         autosize=True,
#         title=dict(font=dict(size=16, color='#333'), x=0.5),
#         margin=dict(l=40, r=100, b=40, t=60),
#         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
#         legend_title=dict(font=dict(size=12, color='#333')),
#     )

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))

#     # Retrieve the limits for the survey type
#     ymin, ymax = survey_limits.get(survey_type, (0, 100))

#     # Collect data to return
#     graph_data = {
#         'dates': all_dates,
#         'months_since_initial': months_since_initial,
#         'scores': scores,
#         'trace_name': [trace.name] * len(all_dates),
#         'mr_no': [mr_no] * len(all_dates),
#         'survey_type': [survey_type] * len(all_dates),
#         'title': [survey_type] * len(all_dates),
#         'ymin': [ymin] * len(all_dates),
#         'ymax': [ymax] * len(all_dates)
#     }

#     return graph_data


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
        'EPDS': (0, 30)
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

    output_dir = 'new_folder'
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




# def generate_and_save_survey_data(mr_no, survey_type):
#     survey_data = graph_generate(mr_no, survey_type)
    
#     if survey_data:
#         survey_df = pd.DataFrame(survey_data)
#         survey_df.to_csv(f'common_login/data/{survey_type}_{mr_no}.csv', index=False)

# def generate_and_save_survey_data(mr_no, survey_type):
#     if survey_type == 'PROMIS-10':
#         return  # Skip generating CSV and JPG for PROMIS-10
    
#     survey_data = graph_generate(mr_no, survey_type)
    
#     if survey_data:
#         survey_df = pd.DataFrame(survey_data)
#         survey_df.to_csv(f'common_login/data/{survey_type}_{mr_no}.csv', index=False)


def generate_and_save_survey_data(mr_no, survey_type):
    if survey_type == 'PROMIS-10':
        return  # Skip generating CSV and JPG for PROMIS-10
    
    survey_data = graph_generate(mr_no, survey_type)
    
    if survey_data:
        survey_df = pd.DataFrame(survey_data)
        survey_df.to_csv(f'data/{survey_type}_{mr_no}.csv', index=False)
    else:
        print(f"No data found for survey type {survey_type} for Mr_no: {mr_no}")


# def merge_and_save_all_survey_data(mr_no):
#     all_data = []

#     # Collect data for physical and mental health
#     physical_data, mental_data = generate_physical_and_mental_graphs(mr_no)
#     if physical_data:
#         all_data.extend(physical_data)
#     if mental_data:
#         all_data.extend(mental_data)

#     # Collect data for other survey types
#     other_survey_types = ['WEXNER', 'ICIQ-UI_SF', 'PAID', 'EPDS']
#     for survey_type in other_survey_types:
#         survey_data = generate_and_save_survey_data(mr_no, survey_type)
#         if survey_data:
#             all_data.extend(survey_data)

#     # Create a DataFrame from the collected data
#     if all_data:
#         merged_df = pd.DataFrame(all_data)
#         merged_df.to_csv(f'common_login/data/patient_health_scores_{mr_no}.csv', index=False)
#     else:
#         print(f"No data found for Mr_no: {mr_no}")



# def combine_all_csvs(mr_no):
#     # List all individual CSV files
#     csv_files = [
#         f'common_login/data/physical_health_{mr_no}.csv',
#         f'common_login/data/mental_health_{mr_no}.csv',
#         f'common_login/data/ICIQ-UI_SF_{mr_no}.csv',
#         f'common_login/data/Wexner_{mr_no}.csv',
#         f'common_login/data/PAID_{mr_no}.csv',
#         f'common_login/data/EPDS_{mr_no}.csv'
#     ]

#     combined_df = pd.DataFrame()

#     for csv_file in csv_files:
#         if os.path.exists(csv_file):
#             df = pd.read_csv(csv_file)
#             combined_df = pd.concat([combined_df, df], ignore_index=True)
#         else:
#             print(f"File {csv_file} not found. Skipping.")

#     combined_df.to_csv(f'common_login/data/patient_health_scores_{mr_no}.csv', index=False)

# Call the function to combine all CSVs

# def combine_all_csvs(mr_no):
#     # List all individual CSV files
#     csv_files = [
#         f'common_login/data/physical_health_{mr_no}.csv',
#         f'common_login/data/mental_health_{mr_no}.csv',
#         f'common_login/data/ICIQ-UI_SF_{mr_no}.csv',
#         f'common_login/data/Wexner_{mr_no}.csv',
#         f'common_login/data/PAID_{mr_no}.csv',
#         f'common_login/data/EPDS_{mr_no}.csv'
#     ]

#     combined_df = pd.DataFrame()

#     for csv_file in csv_files:
#         if os.path.exists(csv_file):
#             df = pd.read_csv(csv_file)
#             df = df.drop(columns=['survey_type'], errors='ignore')  # Drop the 'survey_type' column if it exists
#             combined_df = pd.concat([combined_df, df], ignore_index=True)
#         else:
#             print(f"File {csv_file} not found. Skipping.")

#     combined_df.to_csv(f'common_login/data/patient_health_scores_{mr_no}.csv', index=False)

# def combine_all_csvs(mr_no):
#     # List all individual CSV files
#     csv_files = [
#         f'data/physical_health_{mr_no}.csv',
#         f'data/mental_health_{mr_no}.csv',
#         f'data/ICIQ-UI_SF_{mr_no}.csv',
#         f'data/Wexner_{mr_no}.csv',
#         f'data/PAID_{mr_no}.csv',
#         f'data/EPDS_{mr_no}.csv'
#     ]

#     combined_df = pd.DataFrame()

#     for csv_file in csv_files:
#         if os.path.exists(csv_file):
#             df = pd.read_csv(csv_file)
#             # Drop the 'health_type' column if it exists
#             df = df.drop(columns=['health_type'], errors='ignore')
#             df = df.drop(columns=['survey_type'], errors='ignore')
#             combined_df = pd.concat([combined_df, df], ignore_index=True)
#         else:
#             print(f"File {csv_file} not found. Skipping.")

#     # Rename columns
#     combined_df = combined_df.rename(columns={
#         'dates': 'date',
#         'months_since_initial': 'months_since_baseline',
#         'scores': 'score'
#     })

#     # Update trace_name values
#     combined_df['trace_name'] = combined_df['trace_name'].replace({
#         'Physical Health': 'PROMIS-10 Physical',
#         'Mental Health': 'PROMIS-10 Mental',
#         'ICIQ-UI_SF': 'ICIQ-UI SF',
#         'Wexner': 'WEXNER',
#         'PAID': 'PAID',
#         'EPDS': 'EPDS'
#     })

#     # Update title field based on trace_name
#     combined_df['title'] = combined_df['trace_name'].replace({
#         'PROMIS-10 Physical': 'PROMIS-10 Physical Health Score',
#         'PROMIS-10 Mental': 'PROMIS-10 Mental Health Score',
#         'ICIQ-UI SF': 'Urinary Incontinence Score (Pregnancy)',
#         'WEXNER': 'Wexner Incontinence Score (Pregnancy)',
#         'PAID': 'Problem Areas in Diabetes Score',
#         'EPDS': 'Postnatal Depression Score (Pregnancy)'
#     })

#     combined_df.to_csv(f'data/patient_health_scores_{mr_no}.csv', index=False)


# def combine_all_csvs(mr_no):
#     # List all individual CSV files
#     csv_files = [
#         f'data/physical_health_{mr_no}.csv',
#         f'data/mental_health_{mr_no}.csv',
#         f'data/ICIQ-UI_SF_{mr_no}.csv',
#         f'data/Wexner_{mr_no}.csv',
#         f'data/PAID_{mr_no}.csv',
#         f'data/EPDS_{mr_no}.csv'
#     ]

#     combined_df = pd.DataFrame()

#     # Fetch events data
#     events = fetch_patient_events(mr_no)  # Assumes this function is defined elsewhere in your code

#     for csv_file in csv_files:
#         if os.path.exists(csv_file):
#             df = pd.read_csv(csv_file)
#             # Drop the 'health_type' and 'survey_type' columns if they exist
#             df = df.drop(columns=['health_type', 'survey_type'], errors='ignore')
#             combined_df = pd.concat([combined_df, df], ignore_index=True)
#         else:
#             print(f"File {csv_file} not found. Skipping.")

#     # Rename columns
#     combined_df = combined_df.rename(columns={
#         'dates': 'date',
#         'months_since_initial': 'months_since_baseline',
#         'scores': 'score'
#     })

#     # Update trace_name values
#     combined_df['trace_name'] = combined_df['trace_name'].replace({
#         'Physical Health': 'PROMIS-10 Physical',
#         'Mental Health': 'PROMIS-10 Mental',
#         'ICIQ-UI_SF': 'ICIQ-UI SF',
#         'Wexner': 'WEXNER',
#         'PAID': 'PAID',
#         'EPDS': 'EPDS'
#     })

#     # Update title field based on trace_name
#     combined_df['title'] = combined_df['trace_name'].replace({
#         'PROMIS-10 Physical': 'PROMIS-10 Physical Health Score',
#         'PROMIS-10 Mental': 'PROMIS-10 Mental Health Score',
#         'ICIQ-UI SF': 'Urinary Incontinence Score (Pregnancy)',
#         'WEXNER': 'Wexner Incontinence Score (Pregnancy)',
#         'PAID': 'Problem Areas in Diabetes Score',
#         'EPDS': 'Postnatal Depression Score (Pregnancy)'
#     })

#     # Match the closest event date to the score date
#     combined_df['event_date'] = None
#     combined_df['event'] = None

#     for idx, row in combined_df.iterrows():
#         score_date = datetime.strptime(row['date'], "%Y-%m-%d")
#         if events:
#             closest_event = min(events, key=lambda event: abs(datetime.strptime(event['date'], "%Y-%m-%d") - score_date))
#             combined_df.at[idx, 'event_date'] = closest_event['date']
#             combined_df.at[idx, 'event'] = closest_event['event']

#     combined_df.to_csv(f'data/patient_health_scores_{mr_no}.csv', index=False)



def combine_all_csvs(mr_no):
    # List all individual CSV files
    csv_files = [
        f'data/physical_health_{mr_no}.csv',
        f'data/mental_health_{mr_no}.csv',
        f'data/ICIQ_UI_SF_{mr_no}.csv',
        f'data/Wexner_{mr_no}.csv',
        f'data/PAID_{mr_no}.csv',
        f'data/EPDS_{mr_no}.csv'
    ]

    combined_df = pd.DataFrame()

    # Fetch events data
    events = fetch_patient_events(mr_no)  # Assumes this function is defined elsewhere in your code

    data_found = False

    for csv_file in csv_files:
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            # Drop the 'health_type' and 'survey_type' columns if they exist
            df = df.drop(columns=['health_type', 'survey_type'], errors='ignore')
            combined_df = pd.concat([combined_df, df], ignore_index=True)
            data_found = True
        else:
            print(f"File {csv_file} not found. Skipping.")

    # If no data is found, create an empty CSV with headers
    if not data_found:
        print(f"No data found for Mr_no: {mr_no}. Creating an empty file.")
        combined_df = pd.DataFrame(columns=['date', 'months_since_baseline', 'score', 'trace_name', 'title', 'ymin', 'ymax', 'event_date', 'event'])

    else:
        # Rename columns if data is found
        combined_df = combined_df.rename(columns={
            'dates': 'date',
            'months_since_initial': 'months_since_baseline',
            'scores': 'score'
        })

        # Update trace_name values
        combined_df['trace_name'] = combined_df['trace_name'].replace({
            'Physical Health': 'PROMIS-10 Physical',
            'Mental Health': 'PROMIS-10 Mental',
            'ICIQ_UI_SF': 'ICIQ_UI SF',
            'Wexner': 'WEXNER',
            'PAID': 'PAID',
            'EPDS': 'EPDS'
        })

        # Update title field based on trace_name
        combined_df['title'] = combined_df['trace_name'].replace({
            'PROMIS-10 Physical': 'PROMIS-10 Physical Health Score',
            'PROMIS-10 Mental': 'PROMIS-10 Mental Health Score',
            'ICIQ_UI SF': 'Urinary Incontinence Score (Pregnancy)',
            'WEXNER': 'Wexner Incontinence Score (Pregnancy)',
            'PAID': 'Problem Areas in Diabetes Score',
            'EPDS': 'Postnatal Depression Score (Pregnancy)'
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

    # Save the combined data or the empty template to the CSV file
    combined_df.to_csv(f'data/patient_health_scores_{mr_no}.csv', index=False)


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

# Call the merge_and_save_all_survey_data function to create the merged CSV
# merge_and_save_all_survey_data(mr_no)


# def generate_graph(mr_no, health_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)",
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)",
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     responses = fetch_promis_responses(mr_no)
#     if not responses:
#         print(f"No PROMIS-10 data found for Mr_no: {mr_no}")
#         return

#     raw_scores_by_date = calculate_raw_scores(responses, health_type)
#     t_scores_by_date = convert_to_t_scores(raw_scores_by_date, health_type)

#     dates = sorted(t_scores_by_date.keys())
#     scores = [t_scores_by_date[date] for date in dates]

#     if not scores:
#         print(f"No scores found for {health_type} health")
#         return

#     # Calculate months since initial date dynamically
#     initial_date = datetime.strptime(dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=f"{health_type.capitalize()} Health", mode='lines+markers')

#     max_score = 80  # Set this to the appropriate upper bound for your T-scores

#     # Add horizontal line at T-score 50
#     horizontal_line = {
#         "type": "line",
#         "x0": 0,
#         "x1": max(months_since_initial) + 1,
#         "xref": "x",
#         "y0": 50,
#         "y1": 50,
#         "yref": "y",
#         "line": {
#             "color": "black",
#             "width": 2,
#             "dash": "dash"
#         }
#     }

#     # Add annotation for the horizontal line
#     horizontal_line_annotation = {
#         "xref": "x",
#         "yref": "y",
#         "x": max(months_since_initial) + 1.25,
#         "y": 50,
#         "text": "Population Average",
#         "showarrow": False,
#         "font": {
#             "color": "rgba(0,0,0,0.5)",
#             "size": 8
#         }
#     }

#     gradient_shapes = create_gradient_shapes(max_score, 50, 'PROMIS-10')

#     label_annotations = [
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 75, "text": "Excellent",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 65, "text": "Very Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 55, "text": "Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 40, "text": "Fair",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 25, "text": "Poor",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}}
#     ]

#     layout = {
#         "title": f'{health_type.capitalize()} Health',
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(
#             title='T-Score',
#             range=[20, max_score],
#             gridcolor='rgba(255, 255, 255, 0)',
#             gridwidth=0.5
#         ),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "shapes": [horizontal_line] + gradient_shapes,
#         "annotations": [horizontal_line_annotation] + label_annotations
#     }

#     patient_events = fetch_patient_events(mr_no)

#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event

#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{health_type}_health_{mr_no}.jpg"))

#     # Collect data to return
#     graph_data = {
#         'dates': dates,
#         'months_since_initial': months_since_initial,
#         'scores': scores,
#         'trace_name': [trace.name] * len(dates),
#         'mr_no': [mr_no] * len(dates),
#         'health_type': [health_type] * len(dates)
#     }

#     return graph_data

# def generate_graph(mr_no, health_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)",
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)",
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     responses = fetch_promis_responses(mr_no)
#     if not responses:
#         print(f"No PROMIS-10 data found for Mr_no: {mr_no}")
#         return

#     raw_scores_by_date = calculate_raw_scores(responses, health_type)
#     t_scores_by_date = convert_to_t_scores(raw_scores_by_date, health_type)

#     dates = sorted(t_scores_by_date.keys())
#     scores = [t_scores_by_date[date] for date in dates]

#     if not scores:
#         print(f"No scores found for {health_type} health")
#         return

#     # Calculate months since initial date dynamically
#     initial_date = datetime.strptime(dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=f"{health_type.capitalize()} Health", mode='lines+markers')

#     max_score = 80  # Set this to the appropriate upper bound for your T-scores

#     # Add horizontal line at T-score 50
#     horizontal_line = {
#         "type": "line",
#         "x0": 0,
#         "x1": max(months_since_initial) + 1,
#         "xref": "x",
#         "y0": 50,
#         "y1": 50,
#         "yref": "y",
#         "line": {
#             "color": "black",
#             "width": 2,
#             "dash": "dash"
#         }
#     }

#     # Add annotation for the horizontal line
#     horizontal_line_annotation = {
#         "xref": "x",
#         "yref": "y",
#         "x": max(months_since_initial) + 1.25,
#         "y": 50,
#         "text": "Population Average",
#         "showarrow": False,
#         "font": {
#             "color": "rgba(0,0,0,0.5)",
#             "size": 8
#         }
#     }

#     gradient_shapes = create_gradient_shapes(max_score, 50, 'PROMIS-10')

#     label_annotations = [
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 75, "text": "Excellent",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 65, "text": "Very Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 55, "text": "Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 40, "text": "Fair",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 25, "text": "Poor",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}}
#     ]

#     layout = {
#         "title": f'{health_type.capitalize()} Health',
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(
#             title='T-Score',
#             range=[20, max_score],
#             gridcolor='rgba(255, 255, 255, 0)',
#             gridwidth=0.5
#         ),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "shapes": [horizontal_line] + gradient_shapes,
#         "annotations": [horizontal_line_annotation] + label_annotations
#     }

#     patient_events = fetch_patient_events(mr_no)

#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event

#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{health_type}_health_{mr_no}.jpg"))

#     # Collect data to return
#     graph_data = {
#         'dates': dates,
#         'months_since_initial': months_since_initial,
#         'scores': scores,
#         'trace_name': [trace.name] * len(dates),
#         'mr_no': [mr_no] * len(dates),
#         'health_type': [health_type] * len(dates)
#     }

#     return graph_data

# def generate_graph(mr_no, health_type):
#     ARABIC_MONTH_LABELS = [
#         "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)",
#         "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)",
#         "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
#     ]

#     responses = fetch_promis_responses(mr_no)
#     if not responses:
#         print(f"No PROMIS-10 data found for Mr_no: {mr_no}")
#         return

#     raw_scores_by_date = calculate_raw_scores(responses, health_type)
#     t_scores_by_date = convert_to_t_scores(raw_scores_by_date, health_type)

#     dates = sorted(t_scores_by_date.keys())
#     scores = [t_scores_by_date[date] for date in dates]

#     if not scores:
#         print(f"No scores found for {health_type} health")
#         return

#     # Calculate months since initial date dynamically
#     initial_date = datetime.strptime(dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in dates]

#     # Adjust x-axis labels to reflect actual months with data
#     x_labels = []
#     for date in dates:
#         months_diff = (datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1
#         if months_diff == 1:
#             x_labels.append("Baseline<br>(الأساسي)")
#         else:
#             x_labels.append(f"{months_diff} months<br>(شهر {months_diff})")

#     trace = go.Scatter(x=months_since_initial, y=scores, name=f"{health_type.capitalize()} Health", mode='lines+markers')

#     max_score = 80  # Set this to the appropriate upper bound for your T-scores

#     # Add horizontal line at T-score 50
#     horizontal_line = {
#         "type": "line",
#         "x0": 0,
#         "x1": max(months_since_initial) + 1,
#         "xref": "x",
#         "y0": 50,
#         "y1": 50,
#         "yref": "y",
#         "line": {
#             "color": "black",
#             "width": 2,
#             "dash": "dash"
#         }
#     }

#     # Add annotation for the horizontal line
#     horizontal_line_annotation = {
#         "xref": "x",
#         "yref": "y",
#         "x": max(months_since_initial) + 1.25,
#         "y": 50,
#         "text": "Population Average",
#         "showarrow": False,
#         "font": {
#             "color": "rgba(0,0,0,0.5)",
#             "size": 8
#         }
#     }

#     gradient_shapes = create_gradient_shapes(max_score, 50, 'PROMIS-10')

#     label_annotations = [
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 75, "text": "Excellent",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 65, "text": "Very Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 55, "text": "Good",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 40, "text": "Fair",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}},
#         {"xref": "x", "yref": "y", "x": max(months_since_initial) + 1.25, "y": 25, "text": "Poor",
#          "showarrow": False, "font": {"size": 10, "color": "rgba(0,0,0,0.5)"}}
#     ]

#     layout = {
#         "title": f'{health_type.capitalize()} Health',
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=months_since_initial,
#             ticktext=x_labels,
#             range=[0.5, max(months_since_initial) + 1.5]
#         ),
#         "yaxis": dict(
#             title='T-Score',
#             range=[20, max_score],
#             gridcolor='rgba(255, 255, 255, 0)',
#             gridwidth=0.5
#         ),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "shapes": [horizontal_line] + gradient_shapes,
#         "annotations": [horizontal_line_annotation] + label_annotations
#     }

#     patient_events = fetch_patient_events(mr_no)

#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event

#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=max_score / 1.3,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=False,
#                 font=dict(size=12, color="black"),
#                 textangle=-90,
#                 valign="middle",
#                 xanchor="right"
#             )
#         )

#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     fig = go.Figure(data=[trace], layout=layout)

#     output_dir = 'common_login/new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{health_type}_health_{mr_no}.jpg"))

#     # Collect data to return
#     graph_data = {
#         'dates': dates,
#         'months_since_initial': months_since_initial,
#         'scores': scores,
#         'trace_name': [trace.name] * len(dates),
#         'mr_no': [mr_no] * len(dates),
#         'health_type': [health_type] * len(dates),
#         'title': [f'PROMIS-10 {health_type.capitalize()} Health'] * len(dates),
#         'ymin': [15] * len(dates),  # ymin value
#         'ymax': [75] * len(dates)   # ymax value
#     }

#     return graph_data


def generate_graph(mr_no, health_type):
    ARABIC_MONTH_LABELS = [
        "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)",
        "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)",
        "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
    ]

    responses = fetch_promis_responses(mr_no)
    if not responses:
        print(f"No PROMIS-10 data found for Mr_no: {mr_no}")
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

    gradient_shapes = create_gradient_shapes(max_score, 50, 'PROMIS-10')

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

    output_dir = 'new_folder'
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
        'title': [f'PROMIS-10 {health_type.capitalize()} Health'] * len(dates),
        'ymin': [ymin] * len(dates),  # ymin value
        'ymax': [ymax] * len(dates)   # ymax value
    }

    return graph_data


# Function to generate physical and mental health graphs using PROMIS-10 data
# def generate_physical_and_mental_graphs(mr_no):
#     physical_data = generate_graph(mr_no, 'physical')
#     mental_data = generate_graph(mr_no, 'mental')

def generate_physical_and_mental_graphs(mr_no):
    physical_data = generate_graph(mr_no, 'physical')
    mental_data = generate_graph(mr_no, 'mental')

    if physical_data:
        # Create DataFrame for physical health data
        physical_df = pd.DataFrame(physical_data)
        physical_df.to_csv(f'data/physical_health_{mr_no}.csv', index=False)
    else:
        print(f"No physical health data found for Mr_no: {mr_no}")

    if mental_data:
        # Create DataFrame for mental health data
        mental_df = pd.DataFrame(mental_data)
        mental_df.to_csv(f'data/mental_health_{mr_no}.csv', index=False)
    else:
        print(f"No mental health data found for Mr_no: {mr_no}")


    # if physical_data:
    #     # Create DataFrame for physical health data
    #     physical_df = pd.DataFrame(physical_data)
    #     physical_df.to_csv(f'common_login/data/physical_health_{mr_no}.csv', index=False)

    # if mental_data:
    #     # Create DataFrame for mental health data
    #     mental_df = pd.DataFrame(mental_data)
    #     mental_df.to_csv(f'common_login/data/mental_health_{mr_no}.csv', index=False)

# Generate and save data for the specified survey type (excluding PROMIS-10)
# if survey_type != 'PROMIS-10':
#     generate_and_save_survey_data(mr_no, survey_type)

# Generate and save data for the specified survey type (excluding PROMIS-10)
if survey_type != 'PROMIS-10':
    generate_and_save_survey_data(mr_no, survey_type)

# Generate physical and mental health graphs
generate_physical_and_mental_graphs(mr_no)

# Combine all CSVs into a single CSV
combine_all_csvs(mr_no)



# Generate physical and mental health graphs
generate_physical_and_mental_graphs(mr_no)



