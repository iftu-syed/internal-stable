# #code that can the mcid field for Global Health proms Instrument

# from pymongo import MongoClient
# import time
# from typing import Dict, List, Optional, Any
# from dateutil.parser import isoparse
# from datetime import datetime
# from collections import defaultdict

# def create_mongo_client(connection_string: str) -> MongoClient:
#     try:
#         print("Connected to MongoDB")
#         return MongoClient(connection_string)
#     except Exception as e:
#         print(f"Error connecting to MongoDB: {e}")
#         return None

# def get_document(client: MongoClient, db_name: str, collection_name: str, query: dict) -> dict:
#     try:
#         db = client[db_name]
#         collection = db[collection_name]
#         return collection.find_one(query)
#     except Exception as e:
#         print(f"Error getting document: {e}")
#         return None

# def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[str, Dict]:
#     try:
#         hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': hospital_code})
#         return hospital['hospital_name'], hospital['sites']
#     except Exception as e:
#         print(f"Error getting hospital information: {e}")
#         return None, None

# def find_site_name(sites: List[Dict], site_code: str) -> str:
#     try:
#         return next(
#             (site['site_name'] for site in sites if site['site_code'] == site_code),
#             'Unknown Site'
#         )
#     except Exception as e:
#         print(f"Error finding site name: {e}")

# def get_patient_name(document: Dict) -> str:
#     try:
#         return f"{document['firstName']} {document['lastName']}"
#     except Exception as e:
#         print(f"Error getting patient name: {e}")

# def find_latest_record(records: List[Dict], date_field: str, date_format: str) -> Dict:
#     current_time = datetime.now()
    
#     def get_time_diff(record: Dict) -> float:
#         parsed_time = datetime.strptime(record[date_field], date_format)
#         return abs((parsed_time - current_time).total_seconds())
    
#     return min(records, key=get_time_diff)

# def get_instrument_survey_type(survey_entry: str) -> tuple[str, str]:
#     try:
#         instrument, number = survey_entry.split('_')
#         survey_type = "Baseline" if number == "0" else f"Follow-up {number}"
#         return instrument, survey_type
#     except Exception as e:
#         print(f"Error getting instrument and survey type: {e}")

# def adjust_proms_and_scale(proms_instrument: str) -> tuple[str, Optional[str]]:
#     if "Global-Health Physical" in proms_instrument:
#         return "Global Health", "Global Physical Health"
#     elif "Global-Health Mental" in proms_instrument:
#         return "Global Health", "Global Mental Health"
#     return proms_instrument, None

# def process_all_health_scores(document: Dict) -> List[Dict]:
#     """
#     Modified so that:
#     - If months_since_baseline == 1 => surveyType = 'Baseline'
#     - For subsequent entries of the same promsInstrument (any months_since_baseline != 1),
#       we assign Follow-up 1, Follow-up 2, etc. in ascending order as they appear
#       *for that specific promsInstrument*.
#     """
#     try:
#         results = []
        
#         def get_appointment_sent_time(document: Dict, speciality: str, survey_type: str):
#             appointment_tracker = document.get('appointment_tracker', {})
#             if not isinstance(appointment_tracker, dict):
#                 print("appointment_tracker is not a dict.")
#                 return None

#             appts_for_spec = appointment_tracker.get(speciality, [])
#             if not isinstance(appts_for_spec, list):
#                 print(f"appointment_tracker[{speciality}] is not a list.")
#                 return None

#             for appt in appts_for_spec:
#                 if appt.get('surveyType') == survey_type:
#                     return datetime.strptime(
#                         appt['appointment_time'], "%m/%d/%Y, %I:%M %p"
#                     )
#             return None

#         from collections import defaultdict
#         grouped_scores = defaultdict(list)
#         for survey in document['SurveyData']['patient_health_scores']:
#             grouped_scores[survey['trace_name']].append(survey)

#         for trace_name, surveys in grouped_scores.items():
#             surveys.sort(key=lambda x: x['months_since_baseline'])

#             followup_count = 1
#             for survey in surveys:
#                 proms_instrument, scale = adjust_proms_and_scale(trace_name)

#                 # Decide surveyType
#                 if survey['months_since_baseline'] == 1:
#                     survey_type = "Baseline"
#                 else:
#                     survey_type = f"Follow-up {followup_count}"
#                     followup_count += 1

#                 # Use `survey['date']` as the received time
#                 survey_received_str = survey.get("date")
#                 if survey_received_str:
#                     try:
#                         received_time = datetime.strptime(survey_received_str, "%Y-%m-%d")
#                     except ValueError:
#                         received_time = datetime.now()
#                 else:
#                     received_time = datetime.now()

#                 sent_time_value = get_appointment_sent_time(
#                     document, document['speciality'], survey_type
#                 ) or datetime.now()

#                 result = {
#                     'promsInstrument': proms_instrument,
#                     'surveyType': survey_type,
#                     'score': survey['score'],
#                     'scale': scale,
#                     'received_time': received_time,
#                     'sent_time': sent_time_value
#                 }
#                 results.append(result)

#         return results
#     except Exception as e:
#         print(f"Error processing all health scores: {e}")
#         return []

# def find_mcid_document(client: MongoClient, patient_id: str, proms_instrument: str, 
#                        scale: Optional[str], survey_type: str) -> Optional[Dict]:
#     base_query = {
#         'patientId': patient_id,
#         'promsInstrument': proms_instrument,
#         'surveyType': survey_type
#     }
    
#     # Try first with scale
#     if scale is not None:
#         try:
#             doc = client['dashboards']['test'].find_one({**base_query, 'scale': scale})
#             if doc:
#                 return doc
#         except:
#             pass  # fall through to try without scale
    
#     # Try without scale if first attempt failed or scale was None
#     return client['dashboards']['test'].find_one(base_query)

# def get_latest_icd_description(codes: List[Dict]) -> Optional[str]:
#     if not codes:
#         return None
#     latest = find_latest_record(codes, 'date', "%Y-%m-%d")
#     return latest.get('description')

# def calculate_mcid(client: MongoClient, patient_id: str, proms_instrument: str, 
#                    scale: str, survey_type: str, current_score: float) -> Optional[int]:
#     """
#     Custom MCID logic:
#     - Only apply for 'Global Health'.
#     - If Baseline => None.
#     - Compare with Baseline:
#        if (current - baseline) > 0 => 1
#        else => 0
#     """
#     try:
#         # Only Global Health uses MCID
#         if proms_instrument != "Global Health":
#             return None

#         # No MCID for Baseline
#         if survey_type == "Baseline":
#             return None

#         # Find the baseline doc
#         baseline_record = find_mcid_document(
#             client,
#             patient_id,
#             proms_instrument,
#             scale,
#             "Baseline"
#         )
#         if baseline_record and 'score' in baseline_record:
#             difference = current_score - baseline_record['score']
#             return 1 if difference > 0 else 0
#         else:
#             return None

#     except Exception as e:
#         print(f"Error calculating MCID: {e}")
#         return None

# def create_dashboard_entry(
#     hospital_info: Dict[str, str],
#     doctor_info: Dict[str, str],
#     patient_info: Dict[str, str],
#     clinical_info: Dict[str, Any],
#     survey_info: Dict[str, str],
#     result: Dict[str, Any]
# ) -> Dict:
#     try:
#         entry = {
#             **hospital_info,
#             **doctor_info,
#             **patient_info,
#             **clinical_info,
#             **survey_info,
#             'scale': result['scale'],
#             'score': result['score'],
#             'surveySentDate': result['sent_time'],
#             'surveyReceivedDate': result['received_time']
#         }
        
#         # If we already placed 'mcid' in result, set it now
#         if 'mcid' in result:
#             entry['mcid'] = result['mcid']
        
#         return entry
#     except Exception as e:
#         print(f"Error creating dashboard entry: {e}")

# ###############################################################################
# # NEW FUNCTIONS: Matching ICD codes and Events by month/year of the survey date
# ###############################################################################
# def get_icd_for_month(codes: List[Dict], survey_date: datetime) -> Optional[str]:
#     """
#     Return the 'description' from the first code whose month/year
#     matches the month/year of survey_date. If no match, return None.
#     """
#     survey_month_year = (survey_date.year, survey_date.month)
#     for code in codes:
#         try:
#             code_date = datetime.strptime(code['date'], "%Y-%m-%d")
#             code_month_year = (code_date.year, code_date.month)
#             if code_month_year == survey_month_year:
#                 return code.get('description')
#         except Exception as e:
#             print(f"Error parsing code date: {e}")
#     return None

# def get_event_for_month(events: List[Dict], survey_date: datetime) -> Optional[Dict]:
#     """
#     Return the first event dict whose month/year matches the month/year
#     of survey_date. If no match, return None.
#     """
#     survey_month_year = (survey_date.year, survey_date.month)
#     for ev in events:
#         try:
#             ev_date = datetime.strptime(ev['date'], "%Y-%m-%d")
#             ev_month_year = (ev_date.year, ev_date.month)
#             if ev_month_year == survey_month_year:
#                 return ev  # return the entire event dict
#         except Exception as e:
#             print(f"Error parsing event date: {e}")
#     return None
# ###############################################################################

# def main(Mr_no: str):
#     # Configuration
#     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///'
#     client = create_mongo_client(MONGO_URI)
    
#     # Get initial patient document
#     document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
#     if not document:
#         print(f"No document found for {Mr_no}")
#         return

#     # Get hospital information
#     hospital_name, sites = get_hospital_info(client, document['hospital_code'])
#     site_name = find_site_name(sites, document['site_code'])
    
#     # Get latest doctor and clinical information
#     latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")
#     latest_event = None
#     if 'Events' in document and document['Events']:
#         latest_event = find_latest_record(document['Events'], 'date', "%Y-%m-%d")
    
#     # Process all survey data for patient health scores
#     all_survey_results = process_all_health_scores(document)
    
#     # Prepare common information dictionaries
#     hospital_info = {
#         'hospitalId': document['hospital_code'],
#         'hospitalName': hospital_name,
#         'siteId': document['site_code'],
#         'siteName': site_name
#     }
    
#     doctor_info = {
#         'doctorId': latest_speciality['doctor_ids'][0],
#         'departmentName': document['speciality']
#     }
    
#     patient_info = {
#         'patientId': document['Mr_no'],
#         'patientName': get_patient_name(document)
#     }
    
#     clinical_info = {
#         # We'll assign 'intervention' per survey below
#         'treatmentPlan': latest_event['treatment_plan'] if latest_event else None
#     }
    
#     # Prepare the collection
#     collection = client['dashboards']['test']

#     # Now insert each survey individually, then update MCID if needed
#     for survey_result in all_survey_results:
#         proms_instrument = survey_result['promsInstrument']
#         survey_type = survey_result['surveyType']
#         current_score = survey_result['score']
        
#         # Match ICD code for this survey's month/year
#         icd_description = get_icd_for_month(
#             document.get('Codes', []),
#             survey_result['received_time']
#         )

#         # Match event for this survey's month/year
#         matching_event = get_event_for_month(
#             document.get('Events', []),
#             survey_result['received_time']
#         )
        
#         # Build a custom clinical_info for this survey
#         updated_clinical_info = {
#             **clinical_info,
#             'diagnosisICD10': icd_description,
#             'intervention': matching_event['event'] if matching_event else None
#         }

#         # Create the entry without MCID
#         entry = create_dashboard_entry(
#             hospital_info,
#             doctor_info,
#             patient_info,
#             updated_clinical_info,
#             {
#                 'promsInstrument': proms_instrument,
#                 'surveyType': survey_type
#             },
#             survey_result
#         )

#         # # 1) Check if it already exists
#         # existing_entry = collection.find_one(entry)
#         # if existing_entry:
#         #     print(
#         #         f"Skipped duplicate entry for patient {entry['patientId']} "
#         #         f"- {entry['promsInstrument']} ({entry['surveyType']})"
#         #     )
#         #     continue

#         # 1) Check if an equivalent record already exists by excluding dynamic datetime fields.
#         duplicate_query = {
#             'hospitalId': entry['hospitalId'],
#             'hospitalName': entry['hospitalName'],
#             'siteId': entry['siteId'],
#             'siteName': entry['siteName'],
#             'doctorId': entry['doctorId'],
#             'departmentName': entry['departmentName'],
#             'patientId': entry['patientId'],
#             'patientName': entry['patientName'],
#             'treatmentPlan': entry.get('treatmentPlan'),
#             'diagnosisICD10': entry.get('diagnosisICD10'),
#             'intervention': entry.get('intervention'),
#             'promsInstrument': entry['promsInstrument'],
#             'surveyType': entry['surveyType'],
#             'scale': entry['scale'],
#             'score': entry['score']
#         }

#         existing_entry = collection.find_one(duplicate_query)
#         if existing_entry:
#             print(
#                 f"Skipped duplicate entry for patient {entry['patientId']} "
#                 f"- {entry['promsInstrument']} ({entry['surveyType']})"
#             )
#             continue

        
#         # 2) Insert the survey result first (so 'Baseline' is always present)
#         result_insert = collection.insert_one(entry)
#         print(
#             f"Inserted new entry for patient {entry['patientId']} "
#             f"- {entry['promsInstrument']} ({entry['surveyType']})"
#         )

#         # 3) Now calculate MCID (only relevant for Follow-up of Global Health)
#         mcid_value = calculate_mcid(
#             client,
#             patient_info['patientId'],
#             proms_instrument,
#             survey_result['scale'],
#             survey_type,
#             current_score
#         )
#         if mcid_value is not None:
#             # 4) Update the newly inserted doc with the MCID
#             collection.update_one(
#                 {'_id': result_insert.inserted_id},
#                 {'$set': {'mcid': mcid_value}}
#             )
#             print(f"Updated MCID to {mcid_value} for {survey_type}")

# if __name__ == "__main__":
#     main(Mr_no='400')




# #For All patietnts in the database


# # def main(Mr_no: str, client: MongoClient):
# #     """
# #     We now pass in the MongoDB client so that we don't recreate it
# #     for every patient. Everything else remains the same as your original code,
# #     except we remove the local creation of 'client'.
# #     """
# #     # Get initial patient document
# #     document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
# #     if not document:
# #         print(f"No document found for {Mr_no}")
# #         return

# #     # Get hospital information
# #     hospital_name, sites = get_hospital_info(client, document['hospital_code'])
# #     site_name = find_site_name(sites, document['site_code'])

# #     # Get latest doctor and clinical information
# #     latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")
# #     latest_event = None
# #     if 'Events' in document and document['Events']:
# #         latest_event = find_latest_record(document['Events'], 'date', "%Y-%m-%d")

# #     # Process all survey data for patient health scores
# #     all_survey_results = process_all_health_scores(document)

# #     # Prepare common information dictionaries
# #     hospital_info = {
# #         'hospitalId': document['hospital_code'],
# #         'hospitalName': hospital_name,
# #         'siteId': document['site_code'],
# #         'siteName': site_name
# #     }

# #     doctor_info = {
# #         'doctorId': latest_speciality['doctor_ids'][0],
# #         'departmentName': document['speciality']
# #     }

# #     patient_info = {
# #         'patientId': document['Mr_no'],
# #         'patientName': get_patient_name(document)
# #     }

# #     clinical_info = {
# #         'treatmentPlan': latest_event['treatment_plan'] if latest_event else None
# #     }

# #     # Prepare the collection
# #     collection = client['dashboards']['test']

# #     # Insert each survey individually, then update MCID if needed
# #     for survey_result in all_survey_results:
# #         proms_instrument = survey_result['promsInstrument']
# #         survey_type = survey_result['surveyType']
# #         current_score = survey_result['score']

# #         # Match ICD code for this survey's month/year
# #         icd_description = get_icd_for_month(
# #             document.get('Codes', []),
# #             survey_result['received_time']
# #         )

# #         # Match event for this survey's month/year
# #         matching_event = get_event_for_month(
# #             document.get('Events', []),
# #             survey_result['received_time']
# #         )

# #         # Build a custom clinical_info for this survey
# #         updated_clinical_info = {
# #             **clinical_info,
# #             'diagnosisICD10': icd_description,
# #             'intervention': matching_event['event'] if matching_event else None
# #         }

# #         # Create the entry without MCID
# #         entry = create_dashboard_entry(
# #             hospital_info,
# #             doctor_info,
# #             patient_info,
# #             updated_clinical_info,
# #             {
# #                 'promsInstrument': proms_instrument,
# #                 'surveyType': survey_type
# #             },
# #             survey_result
# #         )

# #         # 1) Build a stable duplicate query (exclude dynamic datetime fields).
# #         duplicate_query = {
# #             'hospitalId': entry['hospitalId'],
# #             'hospitalName': entry['hospitalName'],
# #             'siteId': entry['siteId'],
# #             'siteName': entry['siteName'],
# #             'doctorId': entry['doctorId'],
# #             'departmentName': entry['departmentName'],
# #             'patientId': entry['patientId'],
# #             'patientName': entry['patientName'],
# #             'treatmentPlan': entry.get('treatmentPlan'),
# #             'diagnosisICD10': entry.get('diagnosisICD10'),
# #             'intervention': entry.get('intervention'),
# #             'promsInstrument': entry['promsInstrument'],
# #             'surveyType': entry['surveyType'],
# #             'scale': entry['scale'],
# #             'score': entry['score']
# #         }

# #         existing_entry = collection.find_one(duplicate_query)
# #         if existing_entry:
# #             print(
# #                 f"Skipped duplicate entry for patient {entry['patientId']} "
# #                 f"- {entry['promsInstrument']} ({entry['surveyType']})"
# #             )
# #             continue

# #         # 2) Insert the survey result first (so 'Baseline' is always present)
# #         result_insert = collection.insert_one(entry)
# #         print(
# #             f"Inserted new entry for patient {entry['patientId']} "
# #             f"- {entry['promsInstrument']} ({entry['surveyType']})"
# #         )

# #         # 3) Now calculate MCID (only relevant for Follow-up of Global Health)
# #         mcid_value = calculate_mcid(
# #             client,
# #             patient_info['patientId'],
# #             proms_instrument,
# #             survey_result['scale'],
# #             survey_type,
# #             current_score
# #         )
# #         if mcid_value is not None:
# #             # 4) Update the newly inserted doc with the MCID
# #             collection.update_one(
# #                 {'_id': result_insert.inserted_id},
# #                 {'$set': {'mcid': mcid_value}}
# #             )
# #             print(f"Updated MCID to {mcid_value} for {survey_type}")


# # if __name__ == "__main__":
# #     # 1) Create the client once
# #     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///'
# #     client = create_mongo_client(MONGO_URI)

# #     # 2) Get all Mr_no from 'patient_data' collection
# #     db = client['Data_Entry_Incoming']
# #     patient_collection = db['patient_data']
# #     all_mr_nos = patient_collection.distinct('Mr_no')

# #     # 3) Loop through every Mr_no and call main()
# #     for mr_no in all_mr_nos:
# #         print(f"Processing Mr_no: {mr_no}")
# #         main(mr_no, client)









#This is implementation of Post CDC for the ETL for the dashboard.




# from pymongo import MongoClient
# import time
# from typing import Dict, List, Optional, Any
# from dateutil.parser import isoparse
# from datetime import datetime
# from collections import defaultdict

# def create_mongo_client(connection_string: str) -> MongoClient:
#     try:
#         print("Connected to MongoDB")
#         return MongoClient(connection_string)
#     except Exception as e:
#         print(f"Error connecting to MongoDB: {e}")
#         return None

# def get_document(client: MongoClient, db_name: str, collection_name: str, query: dict) -> dict:
#     try:
#         db = client[db_name]
#         collection = db[collection_name]
#         return collection.find_one(query)
#     except Exception as e:
#         print(f"Error getting document: {e}")
#         return None

# def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[str, Dict]:
#     try:
#         hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': hospital_code})
#         return hospital['hospital_name'], hospital['sites']
#     except Exception as e:
#         print(f"Error getting hospital information: {e}")
#         return None, None

# def find_site_name(sites: List[Dict], site_code: str) -> str:
#     try:
#         return next(
#             (site['site_name'] for site in sites if site['site_code'] == site_code),
#             'Unknown Site'
#         )
#     except Exception as e:
#         print(f"Error finding site name: {e}")

# def get_patient_name(document: Dict) -> str:
#     try:
#         return f"{document['firstName']} {document['lastName']}"
#     except Exception as e:
#         print(f"Error getting patient name: {e}")

# def find_latest_record(records: List[Dict], date_field: str, date_format: str) -> Dict:
#     current_time = datetime.now()
    
#     def get_time_diff(record: Dict) -> float:
#         parsed_time = datetime.strptime(record[date_field], date_format)
#         return abs((parsed_time - current_time).total_seconds())
    
#     return min(records, key=get_time_diff)

# def get_instrument_survey_type(survey_entry: str) -> tuple[str, str]:
#     try:
#         instrument, number = survey_entry.split('_')
#         survey_type = "Baseline" if number == "0" else f"Follow-up {number}"
#         return instrument, survey_type
#     except Exception as e:
#         print(f"Error getting instrument and survey type: {e}")

# def adjust_proms_and_scale(proms_instrument: str) -> tuple[str, Optional[str]]:
#     if "Global-Health Physical" in proms_instrument:
#         return "Global Health", "Global Physical Health"
#     elif "Global-Health Mental" in proms_instrument:
#         return "Global Health", "Global Mental Health"
#     return proms_instrument, None

# def process_all_health_scores(document: Dict) -> List[Dict]:
#     """
#     Modified so that:
#     - If months_since_baseline == 1 => surveyType = 'Baseline'
#     - For subsequent entries of the same promsInstrument (any months_since_baseline != 1),
#       we assign Follow-up 1, Follow-up 2, etc. in ascending order as they appear
#       *for that specific promsInstrument*.
#     """
#     try:
#         results = []
        
#         def get_appointment_sent_time(document: Dict, speciality: str, survey_type: str):
#             appointment_tracker = document.get('appointment_tracker', {})
#             if not isinstance(appointment_tracker, dict):
#                 print("appointment_tracker is not a dict.")
#                 return None

#             appts_for_spec = appointment_tracker.get(speciality, [])
#             if not isinstance(appts_for_spec, list):
#                 print(f"appointment_tracker[{speciality}] is not a list.")
#                 return None

#             for appt in appts_for_spec:
#                 if appt.get('surveyType') == survey_type:
#                     return datetime.strptime(
#                         appt['appointment_time'], "%m/%d/%Y, %I:%M %p"
#                     )
#             return None

#         from collections import defaultdict
#         grouped_scores = defaultdict(list)
#         for survey in document['SurveyData']['patient_health_scores']:
#             grouped_scores[survey['trace_name']].append(survey)

#         for trace_name, surveys in grouped_scores.items():
#             surveys.sort(key=lambda x: x['months_since_baseline'])

#             followup_count = 1
#             for survey in surveys:
#                 proms_instrument, scale = adjust_proms_and_scale(trace_name)

#                 # Decide surveyType
#                 if survey['months_since_baseline'] == 1:
#                     survey_type = "Baseline"
#                 else:
#                     survey_type = f"Follow-up {followup_count}"
#                     followup_count += 1

#                 # Use `survey['date']` as the received time
#                 survey_received_str = survey.get("date")
#                 if survey_received_str:
#                     try:
#                         received_time = datetime.strptime(survey_received_str, "%Y-%m-%d")
#                     except ValueError:
#                         received_time = datetime.now()
#                 else:
#                     received_time = datetime.now()

#                 sent_time_value = get_appointment_sent_time(
#                     document, document['speciality'], survey_type
#                 ) or datetime.now()

#                 result = {
#                     'promsInstrument': proms_instrument,
#                     'surveyType': survey_type,
#                     'score': survey['score'],
#                     'scale': scale,
#                     'received_time': received_time,
#                     'sent_time': sent_time_value
#                 }
#                 results.append(result)

#         return results
#     except Exception as e:
#         print(f"Error processing all health scores: {e}")
#         return []

# def find_mcid_document(client: MongoClient, patient_id: str, proms_instrument: str, 
#                        scale: Optional[str], survey_type: str) -> Optional[Dict]:
#     base_query = {
#         'patientId': patient_id,
#         'promsInstrument': proms_instrument,
#         'surveyType': survey_type
#     }
    
#     # Try first with scale
#     if scale is not None:
#         try:
#             doc = client['dashboards']['test'].find_one({**base_query, 'scale': scale})
#             if doc:
#                 return doc
#         except:
#             pass  # fall through to try without scale
    
#     # Try without scale if first attempt failed or scale was None
#     return client['dashboards']['test'].find_one(base_query)

# def get_latest_icd_description(codes: List[Dict]) -> Optional[str]:
#     if not codes:
#         return None
#     latest = find_latest_record(codes, 'date', "%Y-%m-%d")
#     return latest.get('description')

# def calculate_mcid(client: MongoClient, patient_id: str, proms_instrument: str, 
#                    scale: str, survey_type: str, current_score: float) -> Optional[int]:
#     """
#     Custom MCID logic:
#     - Only apply for 'Global Health'.
#     - If Baseline => None.
#     - Compare with Baseline:
#        if (current - baseline) > 0 => 1
#        else => 0
#     """
#     try:
#         # Only Global Health uses MCID
#         if proms_instrument != "Global Health":
#             return None

#         # No MCID for Baseline
#         if survey_type == "Baseline":
#             return None

#         # Find the baseline doc
#         baseline_record = find_mcid_document(
#             client,
#             patient_id,
#             proms_instrument,
#             scale,
#             "Baseline"
#         )
#         if baseline_record and 'score' in baseline_record:
#             difference = current_score - baseline_record['score']
#             return 1 if difference > 0 else 0
#         else:
#             return None

#     except Exception as e:
#         print(f"Error calculating MCID: {e}")
#         return None

# def create_dashboard_entry(
#     hospital_info: Dict[str, str],
#     doctor_info: Dict[str, str],
#     patient_info: Dict[str, str],
#     clinical_info: Dict[str, Any],
#     survey_info: Dict[str, str],
#     result: Dict[str, Any]
# ) -> Dict:
#     try:
#         entry = {
#             **hospital_info,
#             **doctor_info,
#             **patient_info,
#             **clinical_info,
#             **survey_info,
#             'scale': result['scale'],
#             'score': result['score'],
#             'surveySentDate': result['sent_time'],
#             'surveyReceivedDate': result['received_time']
#         }
        
#         # If we already placed 'mcid' in result, set it now
#         if 'mcid' in result:
#             entry['mcid'] = result['mcid']
        
#         return entry
#     except Exception as e:
#         print(f"Error creating dashboard entry: {e}")

# ###############################################################################
# # NEW FUNCTIONS: Matching ICD codes and Events by month/year of the survey date
# ###############################################################################
# def get_icd_for_month(codes: List[Dict], survey_date: datetime) -> Optional[str]:
#     """
#     Return the 'description' from the first code whose month/year
#     matches the month/year of survey_date. If no match, return None.
#     """
#     survey_month_year = (survey_date.year, survey_date.month)
#     for code in codes:
#         try:
#             code_date = datetime.strptime(code['date'], "%Y-%m-%d")
#             code_month_year = (code_date.year, code_date.month)
#             if code_month_year == survey_month_year:
#                 return code.get('description')
#         except Exception as e:
#             print(f"Error parsing code date: {e}")
#     return None

# def get_event_for_month(events: List[Dict], survey_date: datetime) -> Optional[Dict]:
#     """
#     Return the first event dict whose month/year matches the month/year
#     of survey_date. If no match, return None.
#     """
#     survey_month_year = (survey_date.year, survey_date.month)
#     for ev in events:
#         try:
#             ev_date = datetime.strptime(ev['date'], "%Y-%m-%d")
#             ev_month_year = (ev_date.year, ev_date.month)
#             if ev_month_year == survey_month_year:
#                 return ev  # return the entire event dict
#         except Exception as e:
#             print(f"Error parsing event date: {e}")
#     return None
# ###############################################################################

# def main(Mr_no: str):
#     # Configuration
#     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///'
#     client = create_mongo_client(MONGO_URI)
    
#     # Get initial patient document
#     document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
#     if not document:
#         print(f"No document found for {Mr_no}")
#         return

#     # Get hospital information
#     hospital_name, sites = get_hospital_info(client, document['hospital_code'])
#     site_name = find_site_name(sites, document['site_code'])
    
#     # Get latest doctor and clinical information
#     latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")
#     latest_event = None
#     if 'Events' in document and document['Events']:
#         latest_event = find_latest_record(document['Events'], 'date', "%Y-%m-%d")
    
#     # Process all survey data for patient health scores
#     all_survey_results = process_all_health_scores(document)
    
#     # Prepare common information dictionaries
#     hospital_info = {
#         'hospitalId': document['hospital_code'],
#         'hospitalName': hospital_name,
#         'siteId': document['site_code'],
#         'siteName': site_name
#     }
    
#     doctor_info = {
#         'doctorId': latest_speciality['doctor_ids'][0],
#         'departmentName': document['speciality']
#     }
    
#     patient_info = {
#         'patientId': document['Mr_no'],
#         'patientName': get_patient_name(document)
#     }
    
#     clinical_info = {
#         # We'll assign 'intervention' per survey below
#         'treatmentPlan': latest_event['treatment_plan'] if latest_event else None
#     }
    
#     # Prepare the collection
#     collection = client['dashboards']['test']

#     # Now insert each survey individually, then update MCID if needed
#     for survey_result in all_survey_results:
#         proms_instrument = survey_result['promsInstrument']
#         survey_type = survey_result['surveyType']
#         current_score = survey_result['score']
        
#         # Match ICD code for this survey's month/year
#         icd_description = get_icd_for_month(
#             document.get('Codes', []),
#             survey_result['received_time']
#         )

#         # Match event for this survey's month/year
#         matching_event = get_event_for_month(
#             document.get('Events', []),
#             survey_result['received_time']
#         )
        
#         # Build a custom clinical_info for this survey
#         updated_clinical_info = {
#             **clinical_info,
#             'diagnosisICD10': icd_description,
#             'intervention': matching_event['event'] if matching_event else None
#         }

#         # Create the entry without MCID
#         entry = create_dashboard_entry(
#             hospital_info,
#             doctor_info,
#             patient_info,
#             updated_clinical_info,
#             {
#                 'promsInstrument': proms_instrument,
#                 'surveyType': survey_type
#             },
#             survey_result
#         )

#         # 1) Check if an equivalent record already exists by excluding dynamic datetime fields.
#         duplicate_query = {
#             'hospitalId': entry['hospitalId'],
#             'hospitalName': entry['hospitalName'],
#             'siteId': entry['siteId'],
#             'siteName': entry['siteName'],
#             'doctorId': entry['doctorId'],
#             'departmentName': entry['departmentName'],
#             'patientId': entry['patientId'],
#             'patientName': entry['patientName'],
#             'treatmentPlan': entry.get('treatmentPlan'),
#             'diagnosisICD10': entry.get('diagnosisICD10'),
#             'intervention': entry.get('intervention'),
#             'promsInstrument': entry['promsInstrument'],
#             'surveyType': entry['surveyType'],
#             'scale': entry['scale'],
#             'score': entry['score']
#         }

#         existing_entry = collection.find_one(duplicate_query)
#         if existing_entry:
#             print(
#                 f"Skipped duplicate entry for patient {entry['patientId']} "
#                 f"- {entry['promsInstrument']} ({entry['surveyType']})"
#             )
#             continue

        
#         # 2) Insert the survey result first (so 'Baseline' is always present)
#         result_insert = collection.insert_one(entry)
#         print(
#             f"Inserted new entry for patient {entry['patientId']} "
#             f"- {entry['promsInstrument']} ({entry['surveyType']})"
#         )

#         # 3) Now calculate MCID (only relevant for Follow-up of Global Health)
#         mcid_value = calculate_mcid(
#             client,
#             patient_info['patientId'],
#             proms_instrument,
#             survey_result['scale'],
#             survey_type,
#             current_score
#         )
#         if mcid_value is not None:
#             # 4) Update the newly inserted doc with the MCID
#             collection.update_one(
#                 {'_id': result_insert.inserted_id},
#                 {'$set': {'mcid': mcid_value}}
#             )
#             print(f"Updated MCID to {mcid_value} for {survey_type}")

# ###############################################################################
# # NEW CODE: Watch for surveyStatus change from "Not Completed" to "Completed"
# ###############################################################################
# # def watch_surveyStatus():
# #     """
# #     Listens for updates in 'patient_data' collection where surveyStatus
# #     goes from "Not Completed" to "Completed". On detection, it calls
# #     main(Mr_no=...) with the updated Mr_no.
# #     """
# #     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///'
# #     client = create_mongo_client(MONGO_URI)
# #     collection = client['Data_Entry_Incoming']['patient_data']

# #     pipeline = [
# #         {
# #             "$match": {
# #                 "operationType": "update",
# #                 "updateDescription.updatedFields.surveyStatus": "Completed"
# #             }
# #         }
# #     ]

# #     print("🔎 Watching for patient_data.surveyStatus changes from Not Completed → Completed...")
# #     with collection.watch(pipeline, full_document="updateLookup") as stream:
# #         for change in stream:
# #             full_doc = change.get("fullDocument")
# #             if full_doc:
# #                 mr_no = full_doc["Mr_no"]
# #                 print(f"✅ Detected surveyStatus changed to 'Completed' for Mr_no={mr_no}")
# #                 main(Mr_no=mr_no)

# def watch_surveyStatus():
#     """
#     Listens for updates in 'patient_data' collection where surveyStatus
#     changes from "Not Completed" to "Completed". After detection, waits 10 seconds
#     and then runs main(Mr_no=...) for that specific patient.
#     """
#     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///'
#     client = create_mongo_client(MONGO_URI)
#     collection = client['Data_Entry_Incoming']['patient_data']

#     pipeline = [
#         {
#             "$match": {
#                 "operationType": "update",
#                 "updateDescription.updatedFields.surveyStatus": "Completed"
#             }
#         }
#     ]

#     print("🔎 Watching for patient_data.surveyStatus changes from Not Completed → Completed...")
#     with collection.watch(pipeline, full_document="updateLookup") as stream:
#         for change in stream:
#             full_doc = change.get("fullDocument")
#             if full_doc:
#                 mr_no = full_doc["Mr_no"]
#                 print(f"✅ Detected surveyStatus changed to 'Completed' for Mr_no={mr_no}. Waiting 10 seconds...")
#                 time.sleep(10)  # Wait for 10 seconds before processing
#                 main(Mr_no=mr_no)


# if __name__ == "__main__":
#     # Currently calls main(Mr_no='400') by default:
#     # main(Mr_no='400')
    
#     # Uncomment below if you want to run the watch function instead:
#     watch_surveyStatus()

#     # main(Mr_no='400')





#This code as the logic to handle the even after codes and Events are inserted by doctor.




from pymongo import MongoClient
import time
from typing import Dict, List, Optional, Any
# from dateutil.parser import isoparse # Not used
from datetime import datetime
from collections import defaultdict

# --- Database Connection ---
def create_mongo_client(connection_string: str) -> MongoClient:
    """Establishes connection to MongoDB."""
    try:
        client = MongoClient(connection_string)
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        print("Successfully connected to MongoDB")
        return client
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

# --- Data Retrieval Helpers ---
def get_document(client: MongoClient, db_name: str, collection_name: str, query: dict) -> Optional[dict]:
    """Retrieves a single document from a specified collection."""
    if not client:
        print("MongoDB client not available.")
        return None
    try:
        db = client[db_name]
        collection = db[collection_name]
        return collection.find_one(query)
    except Exception as e:
        print(f"Error getting document with query {query}: {e}")
        return None

def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[Optional[str], Optional[Dict]]:
    """Fetches hospital name and sites based on hospital code."""
    if not hospital_code:
        return "Unknown Hospital", {} # Return defaults if no code
    try:
        # Ensure hospital_code is treated as string if needed, adjust query accordingly
        hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': str(hospital_code)})
        if hospital:
            return hospital.get('hospital_name', "Name Not Found"), hospital.get('sites', {})
        else:
            print(f"Hospital document not found for code: {hospital_code}")
            return "Not Found", {}
    except Exception as e:
        print(f"Error getting hospital information for code {hospital_code}: {e}")
        return None, None

def find_site_name(sites: Optional[List[Dict]], site_code: str) -> str:
    """Finds the site name from a list of sites based on site code."""
    if not sites or not site_code:
        return 'Unknown Site'
    try:
        # Ensure site_code is treated as string if needed
        return next(
            (site.get('site_name', 'Name Missing') for site in sites if str(site.get('site_code')) == str(site_code)),
            'Unknown Site'
        )
    except Exception as e:
        print(f"Error finding site name for code {site_code}: {e}")
        return 'Error Finding Site' # Return specific error string

def get_patient_name(document: Dict) -> str:
    """Constructs the full patient name from first and last names."""
    if not document: return "Unknown Patient"
    try:
        firstName = document.get('firstName', '')
        lastName = document.get('lastName', '')
        return f"{firstName} {lastName}".strip() or "Name Not Provided"
    except Exception as e:
        print(f"Error getting patient name: {e}")
        return "Error Getting Name"

def find_latest_record(records: Optional[List[Dict]], date_field: str, date_format: str) -> Optional[Dict]:
    """Finds the most recent record in a list based on a date field."""
    if not records:
        return None
    current_time = datetime.now()

    latest_record = None
    min_diff = float('inf')

    for record in records:
        record_time_str = record.get(date_field)
        if not record_time_str:
            continue
        try:
            parsed_time = datetime.strptime(record_time_str, date_format)
            diff = abs((parsed_time - current_time).total_seconds())
            if diff < min_diff:
                min_diff = diff
                latest_record = record
        except (ValueError, TypeError) as e:
            print(f"Error parsing date '{record_time_str}' with format '{date_format}': {e}")
            continue # Skip records with invalid date format

    return latest_record

# --- Survey Processing Helpers ---
def adjust_proms_and_scale(proms_instrument: str) -> tuple[str, Optional[str]]:
    """Adjusts PROMS instrument names and extracts scales, handling potential None input."""
    if not proms_instrument:
        return "Unknown Instrument", None

    if "Global-Health Physical" in proms_instrument:
        return "Global Health", "Global Physical Health"
    elif "Global-Health Mental" in proms_instrument:
        return "Global Health", "Global Mental Health"
    # Add more specific adjustments if needed
    # Example: elif "PROMIS Pain Interference" in proms_instrument:
    #             return "PROMIS Pain Interference", None # Or specific scale if applicable
    else:
        # Assume instruments without specific adjustments don't have a separate scale
        return proms_instrument, None


def process_all_health_scores(document: Dict) -> List[Dict]:
    """
    Processes patient health scores from SurveyData.
    Assigns 'Baseline' or 'Follow-up X' survey types based on months_since_baseline.
    Determines survey sent and received times.
    """
    results = []
    if not document or 'SurveyData' not in document or 'patient_health_scores' not in document['SurveyData']:
        print("Warning: Missing SurveyData or patient_health_scores in document.")
        return []

    patient_health_scores = document['SurveyData']['patient_health_scores']
    if not isinstance(patient_health_scores, list):
        print("Warning: patient_health_scores is not a list.")
        return []

    # --- Helper to find appointment sent time ---
    def get_appointment_sent_time(doc: Dict, speciality: Optional[str], survey_type: str) -> Optional[datetime]:
        appointment_tracker = doc.get('appointment_tracker')
        # Check if appointment_tracker is a dict and speciality is valid
        if not isinstance(appointment_tracker, dict) or not speciality:
            # print("Debug: appointment_tracker missing, not a dict, or speciality missing.")
            return None

        appts_for_spec = appointment_tracker.get(str(speciality)) # Ensure speciality key is string
        if not isinstance(appts_for_spec, list):
            # print(f"Debug: No appointment list found for speciality '{speciality}'.")
            return None

        for appt in appts_for_spec:
            if isinstance(appt, dict) and appt.get('surveyType') == survey_type:
                appt_time_str = appt.get('appointment_time')
                if appt_time_str:
                    try:
                        # Adjust format string to handle potential variations if necessary
                        return datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing appointment time '{appt_time_str}': {e}")
                        # Fallback or continue trying other formats if needed
        return None # Return None if no matching appointment is found

    # --- Group scores by instrument ---
    grouped_scores = defaultdict(list)
    for survey in patient_health_scores:
        if isinstance(survey, dict) and 'trace_name' in survey and 'months_since_baseline' in survey:
             # Ensure trace_name is usable as a key, convert if necessary
            trace_name = str(survey['trace_name']) if survey.get('trace_name') is not None else "UnknownTrace"
            grouped_scores[trace_name].append(survey)
        else:
            print(f"Warning: Skipping invalid survey entry: {survey}")


    # --- Process each group ---
    for trace_name, surveys in grouped_scores.items():
        # Sort by months_since_baseline to correctly assign Follow-up numbers
        try:
            surveys.sort(key=lambda x: int(x.get('months_since_baseline', 0)))
        except (ValueError, TypeError):
             print(f"Warning: Could not sort surveys for {trace_name} due to invalid 'months_since_baseline'. Processing in original order.")


        followup_count = 1
        for survey in surveys:
            # Ensure survey has score before processing
            if 'score' not in survey:
                 print(f"Warning: Skipping survey for {trace_name} due to missing 'score'.")
                 continue

            proms_instrument, scale = adjust_proms_and_scale(trace_name)

            # Decide surveyType based on months_since_baseline
            months_since = survey.get('months_since_baseline')
            survey_type = "Unknown Type" # Default
            try:
                # Handle potential non-integer values
                months_since_int = int(months_since) if months_since is not None else 0
                if months_since_int == 1:
                    survey_type = "Baseline"
                elif months_since_int > 1:
                    survey_type = f"Follow-up {followup_count}"
                    followup_count += 1
                # Handle 0 or negative if necessary, currently defaults to "Unknown Type"
                elif months_since_int <= 0:
                    print(f"Warning: Survey {trace_name} has non-positive months_since_baseline: {months_since}. Setting type to 'Unknown Type'.")

            except (ValueError, TypeError):
                 print(f"Warning: Invalid months_since_baseline '{months_since}' for {trace_name}. Setting type to 'Unknown Type'.")


            # Determine received time (use survey 'date' if available)
            survey_received_str = survey.get("date")
            received_time = None
            if survey_received_str:
                try:
                    received_time = datetime.strptime(survey_received_str, "%Y-%m-%d")
                except (ValueError, TypeError) as e:
                    print(f"Error parsing survey received date '{survey_received_str}': {e}. Using current time.")
                    # Fallback to current time or handle as None if preferred
                    received_time = datetime.now() # Or None
            else:
                 print(f"Warning: Survey date missing for {trace_name}. Using current time as received time.")
                 received_time = datetime.now() # Fallback

            # Get sent time using the determined survey_type
            # Ensure speciality is fetched correctly, handle if missing
            doc_speciality = str(document.get('speciality')) if document.get('speciality') else None
            sent_time_value = get_appointment_sent_time(
                document, doc_speciality, survey_type
            )
            # Fallback for sent_time if not found
            if sent_time_value is None:
                 print(f"Warning: Sent time not found for {proms_instrument} - {survey_type}. Using current time.")
                 sent_time_value = datetime.now() # Or None if preferred


            result = {
                'promsInstrument': proms_instrument,
                'surveyType': survey_type,
                'score': survey['score'], # Assumed to exist from check above
                'scale': scale,
                'received_time': received_time,
                'sent_time': sent_time_value
            }
            # Only add valid results
            if received_time is not None:
                 results.append(result)


    return results


# --- MCID Calculation ---
def find_mcid_document(client: MongoClient, patient_id: str, proms_instrument: str,
                       scale: Optional[str], survey_type: str) -> Optional[Dict]:
    """Finds a specific survey document in the target dashboard collection."""
    if not client: return None
    base_query = {
        'patientId': patient_id,
        'promsInstrument': proms_instrument,
        'surveyType': survey_type
    }

    collection = client['dashboards']['test']

    # Try first with scale if it's provided
    if scale is not None:
        try:
            query_with_scale = {**base_query, 'scale': scale}
            doc = collection.find_one(query_with_scale)
            if doc:
                return doc
        except Exception as e:
            print(f"Error querying with scale {scale} for {proms_instrument}: {e}")
            # Fall through to try without scale

    # Try without scale (either scale was None or query with scale failed/returned no doc)
    try:
        # Ensure scale is explicitly not included if it was None or failed above
        query_without_scale = {k: v for k, v in base_query.items()} # Copy base query
        # Add condition that scale field either doesn't exist or is null
        # query_without_scale['scale'] = None # Or {'$in': [None, '$exists': False]} depending on data
        doc = collection.find_one(query_without_scale)
        return doc
    except Exception as e:
        print(f"Error querying without scale for {proms_instrument}: {e}")
        return None


def calculate_mcid(client: MongoClient, patient_id: str, proms_instrument: str,
                   scale: Optional[str], survey_type: str, current_score: Optional[float]) -> Optional[int]:
    """
    Calculates MCID based on custom logic:
    - Only applies for 'Global Health'.
    - Returns None for 'Baseline' or if current_score is invalid.
    - Compares 'Follow-up' score with 'Baseline' score.
    - Returns 1 if (current - baseline) > 0, else 0.
    """
    # Validate inputs
    if not client or proms_instrument != "Global Health" or survey_type == "Baseline":
        return None

    if current_score is None:
         print(f"Warning: Cannot calculate MCID for {patient_id} - {proms_instrument} ({survey_type}) due to missing current score.")
         return None


    try:
        # Find the baseline document
        baseline_record = find_mcid_document(
            client,
            patient_id,
            proms_instrument,
            scale, # Pass the scale to find the specific baseline
            "Baseline"
        )

        if baseline_record and 'score' in baseline_record:
            baseline_score = baseline_record['score']
            # Ensure both scores are valid numbers before comparison
            if isinstance(baseline_score, (int, float)) and isinstance(current_score, (int, float)):
                 difference = float(current_score) - float(baseline_score)
                 return 1 if difference > 0 else 0
            else:
                 print(f"Warning: Invalid score types for MCID calculation. Baseline: {type(baseline_score)}, Current: {type(current_score)}")
                 return None # Scores are not comparable numbers
        else:
            # print(f"Baseline record or score not found for MCID calculation ({patient_id}, {proms_instrument}, {scale}).")
            return None # Baseline not found or score missing

    except Exception as e:
        print(f"Error calculating MCID for {patient_id} - {proms_instrument} ({survey_type}): {e}")
        return None

# --- Dashboard Entry Creation ---
def create_dashboard_entry(
    hospital_info: Dict,
    doctor_info: Dict,
    patient_info: Dict,
    clinical_info: Dict,
    survey_info: Dict,
    result: Dict
) -> Dict:
    """Assembles the final dictionary for a dashboard entry."""
    try:
        entry = {
            **hospital_info,
            **doctor_info,
            **patient_info,
            **clinical_info,
            **survey_info,
            'scale': result.get('scale'), # Use .get for safety
            'score': result.get('score'),
            # Ensure datetime objects are handled correctly if not already strings
            'surveySentDate': result.get('sent_time'), # Store as datetime object
            'surveyReceivedDate': result.get('received_time') # Store as datetime object
            # 'mcid' is handled separately after insertion/update
        }
        return entry
    except Exception as e:
        print(f"Error creating dashboard entry: {e}")
        return {} # Return empty dict on error


# --- Clinical Data Matching (by Month/Year) ---
def get_clinical_data_for_month(items: Optional[List[Dict]], survey_date: Optional[datetime], date_field: str, data_field: str) -> Optional[Any]:
    """
    Generic function to find data (e.g., ICD description, event) from a list
    matching the survey_date's month and year.
    Returns the value of `data_field` from the first matching item.
    """
    if not items or not survey_date:
        return None

    survey_month_year = (survey_date.year, survey_date.month)
    for item in items:
         if not isinstance(item, dict): continue # Skip non-dict items

         item_date_str = item.get(date_field)
         if not item_date_str: continue # Skip items without the date field


         try:
            item_date = datetime.strptime(item_date_str, "%Y-%m-%d") # Assuming YYYY-MM-DD format
            item_month_year = (item_date.year, item_date.month)
            if item_month_year == survey_month_year:
                return item.get(data_field) # Return the desired data field's value
         except (ValueError, TypeError) as e:
            print(f"Error parsing item date '{item_date_str}' in get_clinical_data_for_month: {e}")
            continue # Skip items with invalid date format
    return None # No match found


# --- Main Processing Function ---
def main(Mr_no: str):
    """
    Main processing function for a given patient Mr_no.
    Fetches data, deletes existing dashboard entries for the patient,
    processes surveys, matches clinical data, inserts new entries,
    and calculates/updates MCID.
    """
    print(f"\n--- Processing patient Mr_no: {Mr_no} ---")
    # Configuration
    MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///' # Use environment variables in production
    client = create_mongo_client(MONGO_URI)
    if not client:
        print(f"Failed to connect to MongoDB. Aborting processing for {Mr_no}.")
        return

    # Get initial patient document
    # Make sure Mr_no is used correctly in the query (string vs number)
    patient_document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': str(Mr_no)}) # Assuming Mr_no is stored as string
    if not patient_document:
        print(f"No document found for Mr_no={Mr_no}. Aborting.")
        client.close()
        return

    # === Overwrite Logic: Delete existing dashboard entries for this patient ===
    dashboard_collection = client['dashboards']['test']
    try:
        print(f"Deleting existing dashboard entries for patientId: {Mr_no}...")
        delete_result = dashboard_collection.delete_many({'patientId': str(Mr_no)}) # Ensure patientId matches type
        print(f"Deleted {delete_result.deleted_count} entries.")
    except Exception as e:
        print(f"Error deleting existing dashboard entries for {Mr_no}: {e}. Proceeding with caution.")
    # =========================================================================

    # Get hospital information
    hospital_code = patient_document.get('hospital_code')
    hospital_name, sites = get_hospital_info(client, hospital_code)
    site_name = find_site_name(sites, patient_document.get('site_code'))

    # Get latest doctor and base clinical information
    # Use .get with defaults for robustness
    specialities = patient_document.get('specialities', [])
    events = patient_document.get('Events', [])
    codes = patient_document.get('Codes', []) # Get codes list

    latest_speciality = find_latest_record(specialities, 'timestamp', "%m/%d/%Y, %I:%M %p")
    latest_event_for_plan = find_latest_record(events, 'date', "%Y-%m-%d") # Find latest overall event for default plan

    # Prepare common information dictionaries
    hospital_info = {
        'hospitalId': str(hospital_code) if hospital_code else None,
        'hospitalName': hospital_name,
        'siteId': str(patient_document.get('site_code')) if patient_document.get('site_code') else None,
        'siteName': site_name
    }

    doctor_info = {
        # Handle cases where latest_speciality or doctor_ids might be missing/empty
        'doctorId': latest_speciality['doctor_ids'][0] if latest_speciality and latest_speciality.get('doctor_ids') else None,
        'departmentName': str(patient_document.get('speciality')) if patient_document.get('speciality') else None
    }

    patient_info = {
        'patientId': str(Mr_no), # Ensure consistency
        'patientName': get_patient_name(patient_document)
    }

    # Base clinical info (diagnosis/intervention will be overridden per survey)
    base_clinical_info = {
        'treatmentPlan': latest_event_for_plan.get('treatment_plan') if latest_event_for_plan else None
    }

    # Process all survey data for patient health scores
    all_survey_results = process_all_health_scores(patient_document)
    if not all_survey_results:
        print(f"No valid survey results found to process for {Mr_no}.")
        client.close()
        return

    print(f"Found {len(all_survey_results)} survey results to process.")

    # Insert each survey individually, then update MCID if needed
    for idx, survey_result in enumerate(all_survey_results):
        print(f"Processing survey {idx+1}/{len(all_survey_results)}: {survey_result.get('promsInstrument')} - {survey_result.get('surveyType')}")
        proms_instrument = survey_result.get('promsInstrument')
        survey_type = survey_result.get('surveyType')
        current_score = survey_result.get('score')
        scale = survey_result.get('scale')
        received_time = survey_result.get('received_time') # Datetime object

        # Match ICD code and Event for this survey's specific month/year
        icd_description = get_clinical_data_for_month(
            codes, received_time, 'date', 'description'
        )
        matching_event_data = get_clinical_data_for_month(
            events, received_time, 'date', 'event' # Get the 'event' field value
        )

        # Build clinical_info specific to this survey's timestamp
        survey_specific_clinical_info = {
            **base_clinical_info, # Start with base plan
            'diagnosisICD10': icd_description,
            'intervention': matching_event_data # Use the matched event description
        }

        # Create the dashboard entry dictionary
        entry = create_dashboard_entry(
            hospital_info,
            doctor_info,
            patient_info,
            survey_specific_clinical_info,
            { # Survey specific info
                'promsInstrument': proms_instrument,
                'surveyType': survey_type
            },
            survey_result # Contains scale, score, sent/received times
        )

        if not entry: # Skip if entry creation failed
            print("Skipping survey due to entry creation error.")
            continue

        # --- Insert the survey result ---
        # No duplicate check needed here as we deleted all previous entries
        try:
            result_insert = dashboard_collection.insert_one(entry)
            inserted_id = result_insert.inserted_id
            print(
                f"  Inserted entry with ID: {inserted_id} for "
                f"{proms_instrument} ({survey_type})"
            )

            # --- Calculate and Update MCID (only relevant for Follow-up of Global Health) ---
            # Ensure all necessary components are present before calculating
            if proms_instrument == "Global Health" and survey_type != "Baseline" and inserted_id is not None:
                 mcid_value = calculate_mcid(
                    client,
                    patient_info['patientId'],
                    proms_instrument,
                    scale,
                    survey_type,
                    current_score
                 )

                 if mcid_value is not None:
                    # Update the newly inserted doc with the MCID
                    try:
                        update_result = dashboard_collection.update_one(
                            {'_id': inserted_id},
                            {'$set': {'mcid': mcid_value}}
                        )
                        if update_result.modified_count > 0:
                            print(f"  Updated MCID to {mcid_value} for entry {inserted_id}")
                        # else:
                            # This might happen if the value was already set, which shouldn't occur here.
                            # print(f"  MCID value ({mcid_value}) might already be set for entry {inserted_id}.")
                    except Exception as e_update:
                        print(f"  Error updating MCID for entry {inserted_id}: {e_update}")

        except Exception as e_insert:
            print(f"Error inserting dashboard entry for {proms_instrument} ({survey_type}): {e_insert}")


    print(f"--- Finished processing patient Mr_no: {Mr_no} ---")
    client.close() # Close connection after processing is complete for the patient


# --- Change Data Capture (CDC) Watcher ---
def watch_patient_data_updates():
    """
    Listens for updates in 'patient_data' collection where surveyStatus
    changes to "Completed" OR 'Codes' or 'Events' arrays are updated.
    After detection, waits 10 seconds and then runs main(Mr_no=...)
    for that specific patient, overwriting previous dashboard entries.
    """
    MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///' # Use environment variables in production
    client = create_mongo_client(MONGO_URI)
    if not client:
        print("Cannot start watcher: Failed to connect to MongoDB.")
        return

    try:
        collection = client['Data_Entry_Incoming']['patient_data']

        # Define the pipeline to watch for relevant updates
        pipeline = [
            {
                "$match": {
                    "operationType": "update",
                    "$or": [
                        # Condition 1: surveyStatus updated to "Completed"
                        {"updateDescription.updatedFields.surveyStatus": "Completed"},
                        # Condition 2: 'Codes' field exists in the updated fields (array updated)
                        {"updateDescription.updatedFields.Codes": {"$exists": True}},
                        # Condition 3: 'Events' field exists in the updated fields (array updated)
                        {"updateDescription.updatedFields.Events": {"$exists": True}}
                    ]
                }
            }
        ]

        print("\n🔎 Watching for 'patient_data' updates (SurveyStatus='Completed', Codes, Events)...")
        # Use 'updateLookup' to get the full document *after* the update
        with collection.watch(pipeline, full_document="updateLookup") as stream:
            for change in stream:
                full_doc = change.get("fullDocument")
                if full_doc:
                    mr_no = full_doc.get("Mr_no")
                    if mr_no:
                        # Determine what triggered the update for logging
                        trigger = "Unknown"
                        updated_fields = change.get("updateDescription", {}).get("updatedFields", {})
                        if updated_fields.get("surveyStatus") == "Completed":
                            trigger = "SurveyStatus Completed"
                        elif "Codes" in updated_fields:
                            trigger = "Codes Updated"
                        elif "Events" in updated_fields:
                            trigger = "Events Updated"

                        print(f"\n✅ Detected change for Mr_no={mr_no} (Trigger: {trigger}). Waiting 10 seconds...")
                        time.sleep(10)  # Wait for 10 seconds before processing
                        print(f"🚀 Triggering reprocessing for Mr_no={mr_no}")
                        try:
                             main(Mr_no=str(mr_no)) # Ensure Mr_no is passed as string
                        except Exception as main_e:
                             print(f"🚨 Error during main processing for Mr_no={mr_no}: {main_e}")
                             # Decide if the watcher should continue or exit on error
                    else:
                        print("⚠️ Change detected but 'Mr_no' field missing in fullDocument.")
                else:
                    print("⚠️ Change detected but 'fullDocument' missing in change stream event.")
    except Exception as e:
        print(f"\n🚨 Error in watch_patient_data_updates: {e}")
        # Consider retry logic or alerting here
    finally:
        if client:
            client.close()
            print("MongoDB connection closed.")


if __name__ == "__main__":
    # Option 1: Run the watcher (default)
    watch_patient_data_updates()

    # Option 2: Run for a specific patient manually (for testing)
    # print("Running manual processing for Mr_no='400'")
    # main(Mr_no='400') # Ensure Mr_no is passed as string if stored as string