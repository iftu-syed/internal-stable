# import pymongo
# import pandas as pd
# from datetime import datetime

# # MongoDB connection
# client = pymongo.MongoClient("mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///")
# db = client["Data_Entry_Incoming"]
# collection = db["patient_data"]

# # Function to calculate months_since_baseline
# def calculate_months_since_baseline(baseline_date, current_date):
#     return (current_date.year - baseline_date.year) * 12 + (current_date.month - baseline_date.month)

# # Function to extract and process data
# def process_data(record):
#     rows = []
#     mr_no = record.get("Mr_no")  # Correctly access the Mr_no field

#     if "FORM_ID" in record:
#         for form_id, form_data in record["FORM_ID"].items():
#             assessments = form_data["assessments"]
#             if not assessments:
#                 continue

#             # Determine baseline date as the first assessment's timestamp
#             baseline_date = assessments[0]["timestamp"]

#             for idx, assessment in enumerate(assessments):
#                 date = assessment["timestamp"]
#                 months_since_baseline = calculate_months_since_baseline(baseline_date, date)
#                 score = assessment["scoreDetails"]["T-Score"]
#                 trace_name = assessment["scoreDetails"]["Name"]
#                 title = assessment["scoreDetails"]["Name"]

#                 row = {
#                     "date": date.strftime("%Y-%m-%d"),
#                     "months_since_baseline": months_since_baseline,
#                     "score": score,
#                     "trace_name": trace_name,
#                     "mr_no": mr_no,
#                     "title": title,
#                     "ymin": 0,
#                     "ymax": 100
#                 }
#                 rows.append(row)

#     return rows

# # Test with a specific Mr_no
# test_mr_no = "7866"  # Replace with the Mr_no you want to test

# # Extract data for the specific Mr_no
# all_records = collection.find({"Mr_no": test_mr_no})
# all_data = []

# for record in all_records:
#     all_data.extend(process_data(record))

# # Create DataFrame and save to CSV
# df = pd.DataFrame(all_data)
# df.to_csv("output.csv", index=False)

# print("CSV file generated successfully.")



import pymongo
import pandas as pd
from datetime import datetime

# MongoDB connection
client = pymongo.MongoClient("mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///")
db = client["Data_Entry_Incoming"]
collection = db["patient_data"]

# Function to extract and process data
def process_data(record):
    rows = []
    mr_no = record.get("Mr_no")  # Correctly access the Mr_no field

    if "FORM_ID" in record:
        for form_id, form_data in record["FORM_ID"].items():
            assessments = form_data["assessments"]
            if not assessments:
                continue

            for idx, assessment in enumerate(assessments):
                date = assessment["timestamp"]
                months_since_baseline = idx + 1  # Use index to represent months_since_baseline count
                score = assessment["scoreDetails"]["T-Score"]
                trace_name = assessment["scoreDetails"]["Name"]
                title = assessment["scoreDetails"]["Name"]

                row = {
                    "date": date.strftime("%Y-%m-%d"),
                    "months_since_baseline": months_since_baseline,
                    "score": score,
                    "trace_name": trace_name,
                    "mr_no": mr_no,
                    "title": title,
                    "ymin": 0,
                    "ymax": 100
                }
                rows.append(row)

    return rows

# Test with a specific Mr_no
test_mr_no = "7866"  # Replace with the Mr_no you want to test

# Extract data for the specific Mr_no
all_records = collection.find({"Mr_no": test_mr_no})
all_data = []

for record in all_records:
    all_data.extend(process_data(record))

# Create DataFrame and save to CSV
df = pd.DataFrame(all_data)
df.to_csv("output.csv", index=False)

print("CSV file generated successfully.")
