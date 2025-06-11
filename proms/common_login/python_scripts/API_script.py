

import pymongo
import pandas as pd
import sys
from datetime import datetime
import os

# MongoDB connection
client = pymongo.MongoClient("mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/")
db = client["Data_Entry_Incoming"]
collection = db["patient_data"]

def save_api_surveys_to_db(api_surveys_data, mr_no):
    """
    Save API_SURVEYS data to the database under the SurveyData object.
    """
    try:
        # Update the SurveyData object with API_SURVEYS data
        collection.update_one(
            {"Mr_no": mr_no},
            {"$set": {"SurveyData.API_SURVEYS": api_surveys_data}},
            upsert=True
        )
        print(f"API_SURVEYS data successfully saved for Mr_no: {mr_no}")
    except Exception as e:
        print(f"Error while saving API_SURVEYS data for Mr_no {mr_no}: {e}")


# Function to fetch patient events
def fetch_patient_events(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Events": 1})
    if patient_data and "Events" in patient_data:
        print(f"Events for MR No {mr_no}: {patient_data['Events']}")  # Debugging statement
        return patient_data["Events"]
    else:
        print(f"No events found for MR No {mr_no}")  # Debugging statement
        return []

# Function to extract and process data
def process_data(record, mr_no, events):
    rows = []
    trace_name = None

    # Function to get event details based on month
    def get_event_for_month(month):
        for event in events:
            event_month = datetime.strptime(event["date"], "%Y-%m-%d").month
            if event_month == month:
                return event["date"], event["event"]
        return None, None

    if "FORM_ID" in record:
        for form_id, form_data in record["FORM_ID"].items():
            assessments = form_data["assessments"]
            if not assessments:
                continue

            for idx, assessment in enumerate(assessments):
                date = assessment["timestamp"]
                months_since_baseline = idx + 1  # Use index to represent months_since_baseline count
                score = assessment["scoreDetails"]["T-Score"]
                trace_name = assessment["scoreDetails"]["Name"]  # Capture the trace_name
                title = assessment["scoreDetails"]["Name"]

                # Get event details for the month
                event_date, event_name = get_event_for_month(date.month)
                print(f"Assessment date: {date.strftime('%Y-%m-%d')}, Event date: {event_date}, Event name: {event_name}")  # Debugging statement

                row = {
                    "date": date.strftime("%Y-%m-%d"),
                    "months_since_baseline": months_since_baseline,
                    "score": score,
                    "trace_name": trace_name,
                    "mr_no": mr_no,
                    "title": title,
                    "ymin": 20,
                    "ymax": 80,
                    "event_date": event_date,
                    "event": event_name
                }
                print(f"Row data: {row}")  # Debugging statement
                rows.append(row)

    return rows, trace_name

# Get the mr_no from command-line arguments
if len(sys.argv) < 2:
    print("Please provide the Mr_no as a command-line argument.")
    sys.exit(1)

mr_no = sys.argv[1]

# Extract data for the specific Mr_no
all_records = collection.find({"Mr_no": mr_no})
all_data = []
trace_name = None

# Fetch events for the Mr_no
events = fetch_patient_events(mr_no)
print(f"Events fetched: {events}")  # Debugging statement

for record in all_records:
    data, trace_name = process_data(record, mr_no, events)
    all_data.extend(data)

# Ensure the directory exists
output_dir = "common_login/data"
os.makedirs(output_dir, exist_ok=True)



# Create DataFrame and save to CSV
df = pd.DataFrame(all_data)
csv_filename = f"{output_dir}/API_SURVEYS_{mr_no}.csv"

api_surveys_data = df.to_dict(orient="records")  # Convert DataFrame to JSON-like structure
save_api_surveys_to_db(api_surveys_data, mr_no)

df.to_csv(csv_filename, index=False)

# print(f"CSV file generated successfully: {csv_filename}")
