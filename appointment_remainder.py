# from pymongo import MongoClient
# from datetime import datetime, timedelta


# def create_mongo_client(connection_string: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(connection_string)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         return None


# def check_appointments(document: dict):
#     mr_no = document.get("Mr_no", "Unknown")
#     tracker = document.get("appointment_tracker", {})

#     if not tracker:
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if appt_time_str:
#                 try:
#                     appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#                     if now < appt_time <= tomorrow:
#                         print(f"📢 Hello, you have an appointment tomorrow (Mr_no: {mr_no})")
#                 except ValueError:
#                     print(f"⚠️ Invalid date format in appointment_time for Mr_no {mr_no}")


# def check_existing_records(client: MongoClient):
#     print("📂 Checking existing patient records for upcoming appointments...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     cursor = collection.find({})
#     for document in cursor:
#         check_appointments(document)


# def watch_patient_data(client: MongoClient):
#     print("👀 Watching for new inserts in real-time...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         with collection.watch([{"$match": {"operationType": "insert"}}]) as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc)
#     except Exception as e:
#         print(f"❌ Error watching change stream: {e}")


# def main():
#     MONGO_URI = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
#     client = create_mongo_client(MONGO_URI)

#     # Step 1: Check already existing records for 24hr appointments
#     check_existing_records(client)

#     # Step 2: Listen for new incoming records
#     watch_patient_data(client)


# if __name__ == "__main__":
#     main()





# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests                     # <-- NEW
# import os                           # <-- NEW (optional for env vars)

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI          = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
# # URL of the Express route you added earlier
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"   # adjust port/basePath if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise


# # ----------------------------- NEW --------------------------------
# def send_survey_link(mr_no: str) -> None:
#     """Call the Node/Express route that emails/SMSes the survey link."""
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨  Survey link sent for Mr_no {mr_no}")
#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")
# # ------------------------------------------------------------------


# def check_appointments(document: dict):
#     mr_no   = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     now      = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no)          # <-- NEW
#                 return                           # One link per patient is enough


# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document)


# def watch_patient_data(client: MongoClient):
#     print("👀 Watching new inserts in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": "insert"}}]
#         with collection.watch(pipeline) as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")


# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # initial scan
#     watch_patient_data(client)       # stay alive & reactive


# if __name__ == "__main__":
#     main()





# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"   # adjust if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Node/Express route to send the survey link.
#     2. If successful, retrieve SurveySent from Data_Entry_Incoming.patient_data.
#     3. Upsert that value into dashboards.pretest, matching on patientId = mr_no.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")

#             # ✅ 2. Retrieve SurveySent from 'patient_data'
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#             if not patient_doc:
#                 print(f"⚠️  No patient_data doc found for Mr_no {mr_no}, skipping dashboard update.")
#                 return

#             # If 'SurveySent' doesn't exist, default to 0
#             survey_sent_value = patient_doc.get("SurveySent", 0)

#             # ✅ 3. Upsert into dashboards.pretest
#             dashboards_pretest = client["dashboards"]["pretest"]
#             # We'll match on patientId = mr_no
#             result = dashboards_pretest.update_one(
#                 {"patientId": mr_no},
#                 {"$set": {"SurveySent": survey_sent_value}},
#                 upsert=True
#             )
#             if result.upserted_id or result.modified_count:
#                 print(f"✅ Updated pretest doc for Mr_no {mr_no} with SurveySent={survey_sent_value}")
#             else:
#                 print(f"⚠️  No changes made in pretest for Mr_no {mr_no}")

#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # One link per patient is enough

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     print("👀 Watching new inserts in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": "insert"}}]
#         with collection.watch(pipeline) as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # initial scan of existing docs
#     watch_patient_data(client)       # remain alive & watch for new inserts

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()





# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests                     # for sending HTTP requests to Express route
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"   # adjust port/basePath if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Calls the Express route to send the survey link.
#     2. If the send is successful, then it reads the SurveySent field from 
#        the patient_data collection and upserts it into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")
            
#             # Retrieve the patient's SurveySent value from the patient_data collection
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#             if not patient_doc:
#                 print(f"⚠️ No patient_data document found for Mr_no {mr_no}.")
#                 return
#             survey_sent_value = patient_doc.get("SurveySent", 0)
  
#             # Upsert this value into the dashboards.pretest collection
#             dashboards_pretest = client["dashboards"]["pretest"]
#             result = dashboards_pretest.update_one(
#                 {"patientId": mr_no},
#                 {"$set": {"SurveySent": survey_sent_value}},
#                 upsert=True
#             )
#             if result.upserted_id or result.modified_count:
#                 print(f"✅ Updated dashboards.pretest for Mr_no {mr_no} with SurveySent={survey_sent_value}")
#             else:
#                 print(f"⚠️ No changes made in dashboards.pretest for Mr_no {mr_no}")
#         else:
#             print(f"⚠️ Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """Checks the appointment_tracker for any appointment within the next 24 hours."""
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     # Loop over every speciality's appointments
#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️ Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Only one link per patient
          
# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watches the patient_data collection for both insert and update events.
#     Using fullDocument: 'updateLookup' to retrieve the updated document.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)  # initial scan of existing documents
#     watch_patient_data(client)        # remain active & monitor for new changes

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()



# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests  # For sending HTTP requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"  # adjust port/basePath if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Express route that sends the survey link.
#     2. On successful send, read the SurveySent value from the
#        patient_data collection and upsert/update it into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")

#             # Retrieve the current SurveySent value from patient_data
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#             if not patient_doc:
#                 print(f"⚠️ No patient_data document found for Mr_no {mr_no}.")
#                 return
#             survey_sent_value = patient_doc.get("SurveySent", 0)

#             # Upsert this value into dashboards.pretest (matching on patientId)
#             dashboards_pretest = client["dashboards"]["pretest"]
#             result = dashboards_pretest.update_one(
#                 {"patientId": mr_no},
#                 {"$set": {"SurveySent": survey_sent_value}},
#                 upsert=True
#             )
#             if result.upserted_id or result.modified_count:
#                 print(f"✅ Updated dashboards.pretest for Mr_no {mr_no} with SurveySent={survey_sent_value}")
#             else:
#                 print(f"⚠️ No changes made in dashboards.pretest for Mr_no {mr_no}")
#         else:
#             print(f"⚠️ Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """
#     Check the appointment_tracker in the document for any appointment
#     within the next 24 hours. If found and the SurveySent value is 0,
#     trigger sending the survey link.
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     # NEW: Check if survey link is already sent for this Mr_no.
#     if document.get("SurveySent", 0) > 0:
#         print(f"Survey link already sent for Mr_no {mr_no}. Skipping.")
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️ Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Trigger once for that Mr_no

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watch the patient_data collection for both inserts and updates.
#     fullDocument is set to 'updateLookup' to ensure the updated document is returned.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)  # Process pre-existing documents
#     watch_patient_data(client)        # Remain active and monitor changes

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()










#This is new code with good handler


# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"  # adjust if needed
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def upsert_survey_sent(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Read the doc from Data_Entry_Incoming.patient_data (by Mr_no).
#     2. Get 'SurveySent' (defaults to 0 if missing).
#     3. Upsert that value into dashboards.pretest (matching on patientId).
#     """
#     patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#     dashboards_pretest = client["dashboards"]["pretest"]

#     patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#     if not patient_doc:
#         print(f"⚠️  No patient_data document found for Mr_no {mr_no}. Cannot upsert SurveySent.")
#         return

#     survey_sent_value = patient_doc.get("SurveySent", 0)
#     result = dashboards_pretest.update_one(
#         {"patientId": mr_no},
#         {"$set": {"SurveySent": survey_sent_value}},
#         upsert=True
#     )

#     if result.upserted_id or result.modified_count:
#         print(f"✅ Upserted SurveySent={survey_sent_value} into dashboards.pretest for Mr_no {mr_no}")
#     else:
#         print(f"⚠️  No changes made in dashboards.pretest for Mr_no {mr_no}")

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Express route to send the survey link.
#     2. If successful, then upsert the SurveySent value into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")
#             # After a successful send, ensure dashboards.pretest is up to date
#             upsert_survey_sent(mr_no, client)
#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """
#     Checks the appointment_tracker for any appointment in the next 24 hours.
#     - If SurveySent > 0 => skip sending, but still upsert SurveySent into dashboards.pretest.
#     - If SurveySent=0 and an appointment is within 24 hrs => call send_survey_link().
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     # If SurveySent is already > 0, we skip sending but still update dashboards
#     if document.get("SurveySent", 0) > 0:
#         print(f"Survey link already sent for Mr_no {mr_no}. Skipping send, but updating dashboards.")
#         upsert_survey_sent(mr_no, client)  # Make sure dashboards.pretest is in sync
#         return

#     # Otherwise, check if any appointment is within the next 24 hours
#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue

#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Only trigger once for this Mr_no

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watch for both inserts and updates in patient_data, returning the updated doc.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # handle old records
#     watch_patient_data(client)       # watch new/updates

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()







#This is the code where we are skipping the SurveySent value update when we are skipping the SurveyLink




# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"  # adjust if needed
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def upsert_survey_sent(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Read the doc from Data_Entry_Incoming.patient_data (by Mr_no).
#     2. Get 'SurveySent' (defaults to 0 if missing).
#     3. Upsert that value into dashboards.pretest (matching on patientId).
#     """
#     patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#     dashboards_pretest = client["dashboards"]["pretest"]

#     patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#     if not patient_doc:
#         print(f"⚠️  No patient_data document found for Mr_no {mr_no}. Cannot upsert SurveySent.")
#         return

#     survey_sent_value = patient_doc.get("SurveySent", 0)
#     result = dashboards_pretest.update_one(
#         {"patientId": mr_no},
#         {"$set": {"SurveySent": survey_sent_value}},
#         upsert=True
#     )

#     if result.upserted_id or result.modified_count:
#         print(f"✅ Upserted SurveySent={survey_sent_value} into dashboards.pretest for Mr_no {mr_no}")
#     else:
#         print(f"⚠️  No changes made in dashboards.pretest for Mr_no {mr_no}")

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Express route to send the survey link.
#     2. If successful, then upsert the SurveySent value into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")
#             # After a successful send, ensure dashboards.pretest is up to date
#             upsert_survey_sent(mr_no, client)
#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """
#     Checks the appointment_tracker for any appointment in the next 24 hours.
#     - If SurveySent > 0, we skip sending (without updating dashboards).
#     - If SurveySent == 0 and an appointment is within 24 hrs, call send_survey_link().
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     # NEW: If SurveySent is already > 0, skip sending the survey link.
#     if document.get("SurveySent", 0) > 0:
#         print(f"Survey link already sent for Mr_no {mr_no}. Skipping send.")
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue

#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Only trigger once for this Mr_no

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watch for both inserts and updates in patient_data, returning the updated doc.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # handle old records
#     watch_patient_data(client)         # watch new/updates

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()







# # -*- coding: utf-8 -*-
# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os
# import logging # Using logging module for better output control

# # ------------------------------------------------------------------
# # Setup Logging
# # ------------------------------------------------------------------
# logging.basicConfig(level=logging.INFO,
#                     format='%(asctime)s - %(levelname)s - %(message)s')

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0")
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"
# )
# # Define the format string for appointment times globally
# APPOINTMENT_TIME_FORMAT = "%m/%d/%Y, %I:%M %p"

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     """Creates and returns a MongoDB client instance."""
#     try:
#         client = MongoClient(uri, serverSelectionTimeoutMS=5000) # Add timeout
#         # The ismaster command is cheap and does not require auth.
#         client.admin.command('ismaster')
#         logging.info("✅ Successfully connected to MongoDB")
#         return client
#     except Exception as e:
#         logging.exception(f"❌ Error connecting to MongoDB: {e}") # Log full exception
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> bool:
#     """
#     1. Calls the Express route to send the survey link.
#     2. If successful (HTTP 2xx), increments surveySent in both collections.
#     3. Returns True if link sent and counters incremented successfully, False otherwise.
#     """
#     if not mr_no:
#         logging.warning("send_survey_link called with empty Mr_no. Skipping.")
#         return False

#     try:
#         logging.info(f"Attempting to send survey link for Mr_no {mr_no} to {SEND_LINK_ENDPOINT}...")
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=15) # Slightly longer timeout

#         if resp.ok: # Checks for status codes 200-299
#             logging.info(f"✅📨 Survey link API call successful for Mr_no {mr_no} (Status: {resp.status_code})")

#             # --- Start Increment Logic ---
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             dashboards_pretest_col = client["dashboards"]["pretest"]
#             success_patient = False
#             success_pretest = False

#             # Increment in Data_Entry_Incoming.patient_data
#             try:
#                 update_result_patient = patient_data_col.update_one(
#                     {"Mr_no": mr_no},
#                     {"$inc": {"surveySent": 1}}
#                 )
#                 if update_result_patient.matched_count > 0: # Check if doc was found
#                      if update_result_patient.modified_count > 0:
#                           logging.info(f"✅ Incremented surveySent in patient_data for Mr_no {mr_no}")
#                           success_patient = True
#                      else:
#                           # Found but not modified - could indicate concurrent update or issue
#                            logging.warning(f"⚠️ Found patient_data for Mr_no {mr_no} but surveySent not incremented.")
#                 else:
#                     logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} to increment surveySent.")
#             except Exception as e:
#                 logging.exception(f"❌ Error incrementing surveySent in patient_data for {mr_no}: {e}")


#             # Increment in dashboards.pretest (using upsert=True)
#             try:
#                 update_result_pretest = dashboards_pretest_col.update_one(
#                     {"patientId": mr_no},
#                     {"$inc": {"surveySent": 1}},
#                     upsert=True
#                 )
#                 if update_result_pretest.modified_count or update_result_pretest.upserted_id:
#                      logging.info(f"✅ Incremented/Set surveySent in dashboards.pretest for Mr_no {mr_no}")
#                      success_pretest = True
#                 else:
#                     # Less likely with upsert unless race condition prevented the inc on existing doc
#                     logging.warning(f"⚠️ Failed to modify/upsert surveySent in dashboards.pretest for Mr_no {mr_no} (Matched: {update_result_pretest.matched_count})")
#             except Exception as e:
#                  logging.exception(f"❌ Error incrementing/upserting surveySent in dashboards.pretest for {mr_no}: {e}")
#             # --- End Increment Logic ---

#             return success_patient and success_pretest # Return True only if both increments likely succeeded

#         else:
#             # Log detailed error from response if possible
#             error_detail = resp.text[:500] # Limit error message length
#             logging.error(f"⚠️ Failed to send survey link for Mr_no {mr_no}. Status: {resp.status_code}, Response: {error_detail}")
#             return False

#     except requests.Timeout:
#          logging.error(f"❌ Timeout error while sending link for Mr_no {mr_no}")
#          return False
#     except requests.RequestException as err:
#         logging.error(f"❌ HTTP Request error while sending link for Mr_no {mr_no}: {err}")
#         return False
#     except Exception as e:
#         logging.exception(f"❌ Unexpected error during send_survey_link for Mr_no {mr_no}: {e}")
#         return False

# # ------------------------------------------------------------------
# def check_and_send_if_needed(document: dict, client: MongoClient):
#     """
#     Checks if any appointment in the document is within the next 24 hours.
#     If found, calls send_survey_link(). This function IGNORES surveySent count.
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no:
#         logging.warning("Document missing Mr_no in check_and_send_if_needed. Skipping.")
#         return
#     if not tracker:
#         logging.debug(f"No appointment_tracker found for Mr_no {mr_no}. Skipping check.")
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)
#     found_appointment_soon = False
#     appointment_details = ""

#     for speciality, appointments in tracker.items():
#         if not isinstance(appointments, list):
#             logging.warning(f"Expected list for appointments in speciality '{speciality}' for Mr_no {mr_no}, got {type(appointments)}. Skipping speciality.")
#             continue

#         for idx, appt in enumerate(appointments): # Use enumerate if index needed for logging
#             if not isinstance(appt, dict):
#                 logging.warning(f"Expected dict for appointment entry {idx} in speciality '{speciality}' for Mr_no {mr_no}, got {type(appt)}. Skipping entry.")
#                 continue

#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue # Skip entries without time

#             try:
#                 appt_time = datetime.strptime(appt_time_str, APPOINTMENT_TIME_FORMAT)
#             except ValueError:
#                 logging.warning(f"Bad date format '{appt_time_str}' in appointment_time ({speciality}[{idx}]) for Mr_no {mr_no}. Skipping entry.")
#                 continue

#             # Check if the appointment is in the future but within the next 24 hours
#             if now < appt_time <= tomorrow:
#                 logging.info(f"📢 Appointment within 24h found for Mr_no {mr_no} (Speciality: {speciality}, Time: {appt_time_str})")
#                 found_appointment_soon = True
#                 appointment_details = f"Speciality: {speciality}, Time: {appt_time_str}"
#                 break # Exit inner loop once a valid appointment is found

#         if found_appointment_soon:
#             break # Exit outer loop as well

#     if found_appointment_soon:
#         logging.info(f"   -> Triggering survey link send for Mr_no {mr_no} due to upcoming appointment: {appointment_details}")
#         send_survey_link(mr_no, client)
#     else:
#         logging.debug(f"No upcoming appointments found within 24h for Mr_no {mr_no} in this check.")


# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     """
#     Scans existing patient records ONCE at startup and checks for appointments
#     within the next 24 hours, triggering send_survey_link if found,
#     regardless of surveySent value.
#     """
#     logging.info(f"📂 Scanning existing patient records at startup...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     count = 0
#     sent_count = 0
#     try:
#         # Consider adding projection if documents are large and only tracker/Mr_no needed
#         cursor = collection.find({}, {"Mr_no": 1, "appointment_tracker": 1})
#         for document in cursor:
#             # Check if appointment is soon, send link if needed
#             # NOTE: This check is now done by check_and_send_if_needed called inside the loop
#             check_and_send_if_needed(document, client) # Reusing the logic
#             count += 1
#             if count % 1000 == 0: # Log progress for large collections
#                 logging.info(f"  ...scanned {count} existing records...")

#         logging.info(f"✅ Finished scanning {count} existing records.")
#     except Exception as e:
#         logging.exception(f"❌ Error during initial scan of existing records: {e}")
#     finally:
#         if 'cursor' in locals() and cursor and hasattr(cursor, 'close'):
#             cursor.close()

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watches for inserts and specific updates (to appointment_time)
#     in the patient_data collection and triggers checks.
#     """
#     logging.info(f"👀 Watching patient_data collection for inserts and appointment_time updates...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]

#     try:
#         # Watch for inserts and updates, get the full document after update
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 operation_type = change.get("operationType")
#                 full_doc = change.get("fullDocument")
#                 doc_id = change.get("documentKey", {}).get("_id")
#                 mr_no = full_doc.get("Mr_no", "N/A") if full_doc else "N/A (no fullDoc)"

#                 logging.debug(f"⚡ Change detected (Type: {operation_type}, ID: {doc_id}, Mr_no: {mr_no})")

#                 if not full_doc:
#                      logging.warning(f"⚠️ Change detected (Type: {operation_type}, ID: {doc_id}), but full document not retrieved. Cannot process.")
#                      continue # Skip if we don't have the document data

#                 if operation_type == "insert":
#                     logging.info(f"Processing INSERT for Mr_no: {mr_no} (ID: {doc_id})")
#                     check_and_send_if_needed(full_doc, client)

#                 elif operation_type == "update":
#                     update_desc = change.get("updateDescription")
#                     if not update_desc:
#                         logging.warning(f"Update event for Mr_no: {mr_no} (ID: {doc_id}) missing 'updateDescription'. Skipping detailed check.")
#                         continue

#                     updated_fields = update_desc.get("updatedFields", {})
#                     appointment_time_updated = False
#                     updated_field_list = [] # For logging

#                     for key in updated_fields.keys():
#                         # Check if the key path looks like an appointment_time within the tracker
#                         # Example key: "appointment_tracker.Cardiology.0.appointment_time"
#                         parts = key.split('.')
#                         if len(parts) >= 3 and parts[0] == "appointment_tracker" and parts[-1] == "appointment_time":
#                              # Basic check: key starts with tracker and ends with time
#                              # More robust check could involve checking if parts[2] is an integer index
#                             try:
#                                 # Check if the middle part(s) could represent array index(es)
#                                 # This is a heuristic, might need adjustment based on exact structure
#                                 is_index_part = all(p.isdigit() for p in parts[2:-1])
#                                 if parts[1] and is_index_part: # Check speciality exists and index part is valid
#                                      appointment_time_updated = True
#                                      updated_field_list.append(key)
#                                      # Don't break here, log all updated time fields
#                             except Exception:
#                                  # Handle potential errors if key format is unexpected
#                                  logging.debug(f"Could not parse update key '{key}' fully for index check.")
#                                  pass # Continue checking other keys


#                     if appointment_time_updated:
#                         logging.info(f"Processing UPDATE for Mr_no: {mr_no} (ID: {doc_id}) - Detected update to appointment_time fields: {updated_field_list}")
#                         check_and_send_if_needed(full_doc, client)
#                     else:
#                         logging.debug(f"Update for Mr_no: {mr_no} (ID: {doc_id}) did not include changes to 'appointment_time' fields. Skipping send check.")

#     except Exception as e: # Catching PyMongoError specifically might be better
#         logging.exception(f"❌ Change stream error: {e}")
#         # Consider adding retry logic or specific error handling here
#     logging.info("🛑 Watch stream stopped.")

# # ------------------------------------------------------------------
# def main():
#     """Main execution function."""
#     logging.info("🚀 Script starting up...")
#     try:
#         client = create_mongo_client(MONGO_URI)
#         check_existing_records(client)   # Scan existing records once at start
#         watch_patient_data(client)       # Watch for relevant inserts/updates
#     except Exception as e:
#         # Error during client creation or initial connection handled in create_mongo_client
#         # This catches errors during scan or watch setup/execution
#         logging.critical(f"❌ Critical error preventing script execution: {e}", exc_info=True)
#     finally:
#         logging.info("🏁 Script finished or encountered a critical error.")
#         # Clean up client connection if necessary, although usually not needed for long-running watchers
#         # if 'client' in locals() and client:
#         #    client.close()
#         #    logging.info("MongoDB connection closed.")

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()





# # -*- coding: utf-8 -*-
# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os
# import logging # Using logging module for better output control

# # ------------------------------------------------------------------
# # Setup Logging
# # ------------------------------------------------------------------
# logging.basicConfig(level=logging.INFO,
#                     format='%(asctime)s - %(levelname)s - %(message)s')

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0")
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"
# )
# # Define the format string for appointment times globally
# APPOINTMENT_TIME_FORMAT = "%m/%d/%Y, %I:%M %p"
# DEFAULT_SURVEY_STATUS = "Not Completed" # Define default status

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     """Creates and returns a MongoDB client instance."""
#     try:
#         client = MongoClient(uri, serverSelectionTimeoutMS=5000) # Add timeout
#         # The ismaster command is cheap and does not require auth.
#         client.admin.command('ismaster')
#         logging.info("✅ Successfully connected to MongoDB")
#         return client
#     except Exception as e:
#         logging.exception(f"❌ Error connecting to MongoDB: {e}") # Log full exception
#         raise

# # ------------------------------------------------------------------
# # Updated function signature to accept triggering_appt_status
# def send_survey_link(mr_no: str, client: MongoClient, triggering_appt_status: str) -> bool:
#     """
#     1. Calls the Express route to send the survey link.
#     2. If successful (HTTP 2xx), increments surveySent in both collections.
#     3. If triggering appt status is 'Not Completed', sets top-level surveyStatus to 'Not Completed'.
#     4. Returns True if link sent and counters incremented successfully, False otherwise.
#        (Note: Return value does NOT depend on the success of the surveyStatus update)
#     """
#     if not mr_no:
#         logging.warning("send_survey_link called with empty Mr_no. Skipping.")
#         return False

#     try:
#         logging.info(f"Attempting to send survey link for Mr_no {mr_no} to {SEND_LINK_ENDPOINT}...")
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=15) # Slightly longer timeout

#         if resp.ok: # Checks for status codes 200-299
#             logging.info(f"✅📨 Survey link API call successful for Mr_no {mr_no} (Status: {resp.status_code})")

#             # --- Start Increment Logic ---
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             dashboards_pretest_col = client["dashboards"]["pretest"]
#             success_patient = False
#             success_pretest = False

#             # Increment in Data_Entry_Incoming.patient_data
#             try:
#                 update_result_patient = patient_data_col.update_one(
#                     {"Mr_no": mr_no},
#                     {"$inc": {"surveySent": 1}}
#                 )
#                 if update_result_patient.matched_count > 0: # Check if doc was found
#                      if update_result_patient.modified_count > 0:
#                           logging.info(f"✅ Incremented surveySent in patient_data for Mr_no {mr_no}")
#                           success_patient = True
#                      else:
#                            logging.warning(f"⚠️ Found patient_data for Mr_no {mr_no} but surveySent not incremented.")
#                 else:
#                     logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} to increment surveySent.")
#             except Exception as e:
#                 logging.exception(f"❌ Error incrementing surveySent in patient_data for {mr_no}: {e}")


#             # Increment in dashboards.pretest (using upsert=True)
#             try:
#                 update_result_pretest = dashboards_pretest_col.update_one(
#                     {"patientId": mr_no},
#                     {"$inc": {"surveySent": 1}},
#                     upsert=True
#                 )
#                 if update_result_pretest.modified_count or update_result_pretest.upserted_id:
#                      logging.info(f"✅ Incremented/Set surveySent in dashboards.pretest for Mr_no {mr_no}")
#                      success_pretest = True
#                 else:
#                     logging.warning(f"⚠️ Failed to modify/upsert surveySent in dashboards.pretest for Mr_no {mr_no} (Matched: {update_result_pretest.matched_count})")
#             except Exception as e:
#                  logging.exception(f"❌ Error incrementing/upserting surveySent in dashboards.pretest for {mr_no}: {e}")
#             # --- End Increment Logic ---

#             # --- Start Top-Level Survey Status Update Logic ---
#             if success_patient: # Only attempt status update if patient doc was likely found/updated for surveySent
#                 if triggering_appt_status == "Not Completed":
#                     logging.info(f"Triggering appointment status for Mr_no {mr_no} is 'Not Completed'. Attempting to set top-level status.")
#                     try:
#                         status_update_result = patient_data_col.update_one(
#                             {"Mr_no": mr_no},
#                             {"$set": {"surveyStatus": "Not Completed"}}
#                         )
#                         if status_update_result.matched_count > 0:
#                             if status_update_result.modified_count > 0:
#                                 logging.info(f"✅ Set top-level surveyStatus to 'Not Completed' for Mr_no {mr_no}")
#                             else:
#                                 # This might happen if the status was already "Not Completed"
#                                 logging.info(f"ℹ️ Top-level surveyStatus for Mr_no {mr_no} was already 'Not Completed'.")
#                         else:
#                             # Should not happen if success_patient was True, but log just in case
#                             logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} again to update surveyStatus.")
#                     except Exception as e:
#                         logging.exception(f"❌ Error setting top-level surveyStatus for Mr_no {mr_no}: {e}")
#                 else:
#                     logging.info(f"Triggering appointment status for Mr_no {mr_no} is '{triggering_appt_status}'. Skipping top-level surveyStatus update.")
#             else:
#                  logging.warning(f"⚠️ Skipping top-level surveyStatus update for Mr_no {mr_no} because initial surveySent increment in patient_data might have failed.")
#             # --- End Top-Level Survey Status Update Logic ---


#             return success_patient and success_pretest # Return True only if both increments likely succeeded

#         else:
#             # Log detailed error from response if possible
#             error_detail = resp.text[:500] # Limit error message length
#             logging.error(f"⚠️ Failed to send survey link for Mr_no {mr_no}. Status: {resp.status_code}, Response: {error_detail}")
#             return False

#     except requests.Timeout:
#          logging.error(f"❌ Timeout error while sending link for Mr_no {mr_no}")
#          return False
#     except requests.RequestException as err:
#         logging.error(f"❌ HTTP Request error while sending link for Mr_no {mr_no}: {err}")
#         return False
#     except Exception as e:
#         logging.exception(f"❌ Unexpected error during send_survey_link for Mr_no {mr_no}: {e}")
#         return False

# # ------------------------------------------------------------------
# def check_and_send_if_needed(document: dict, client: MongoClient):
#     """
#     Checks if any appointment in the document is within the next 24 hours.
#     If found, determines its surveyStatus and calls send_survey_link().
#     This function IGNORES the top-level surveySent count but uses appointment-level surveyStatus.
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no:
#         logging.warning("Document missing Mr_no in check_and_send_if_needed. Skipping.")
#         return
#     if not tracker:
#         logging.debug(f"No appointment_tracker found for Mr_no {mr_no}. Skipping check.")
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)
#     found_appointment_soon = False
#     appointment_details = ""
#     triggering_appt_status = DEFAULT_SURVEY_STATUS # Default if not found in appt

#     for speciality, appointments in tracker.items():
#         if not isinstance(appointments, list):
#             logging.warning(f"Expected list for appointments in speciality '{speciality}' for Mr_no {mr_no}, got {type(appointments)}. Skipping speciality.")
#             continue

#         for idx, appt in enumerate(appointments): # Use enumerate if index needed for logging
#             if not isinstance(appt, dict):
#                 logging.warning(f"Expected dict for appointment entry {idx} in speciality '{speciality}' for Mr_no {mr_no}, got {type(appt)}. Skipping entry.")
#                 continue

#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue # Skip entries without time

#             try:
#                 appt_time = datetime.strptime(appt_time_str, APPOINTMENT_TIME_FORMAT)
#             except ValueError:
#                 logging.warning(f"Bad date format '{appt_time_str}' in appointment_time ({speciality}[{idx}]) for Mr_no {mr_no}. Skipping entry.")
#                 continue

#             # Check if the appointment is in the future but within the next 24 hours
#             if now < appt_time <= tomorrow:
#                 logging.info(f"📢 Appointment within 24h found for Mr_no {mr_no} (Speciality: {speciality}, Time: {appt_time_str})")
#                 found_appointment_soon = True
#                 appointment_details = f"Speciality: {speciality}, Time: {appt_time_str}"
#                 # Get the surveyStatus for this specific appointment
#                 triggering_appt_status = appt.get("surveyStatus", DEFAULT_SURVEY_STATUS)
#                 logging.info(f"   -> Status of this appointment: '{triggering_appt_status}'")
#                 break # Exit inner loop once a valid appointment is found

#         if found_appointment_soon:
#             break # Exit outer loop as well

#     if found_appointment_soon:
#         logging.info(f"   -> Triggering survey link send for Mr_no {mr_no} due to upcoming appointment: {appointment_details}")
#         # Pass the specific appointment's status to the send function
#         send_survey_link(mr_no, client, triggering_appt_status)
#     else:
#         logging.debug(f"No upcoming appointments found within 24h for Mr_no {mr_no} in this check.")


# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     """
#     Scans existing patient records ONCE at startup and checks for appointments
#     within the next 24 hours, triggering send_survey_link if found,
#     regardless of surveySent value. Passes triggering appointment status.
#     """
#     logging.info(f"📂 Scanning existing patient records at startup...")
#     # Fetch necessary fields including the tracker for status check
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     count = 0
#     try:
#         # Ensure appointment_tracker is projected
#         cursor = collection.find({}, {"Mr_no": 1, "appointment_tracker": 1})
#         for document in cursor:
#             # This function now handles getting the status and passing it
#             check_and_send_if_needed(document, client)
#             count += 1
#             if count % 1000 == 0: # Log progress for large collections
#                 logging.info(f"  ...scanned {count} existing records...")

#         logging.info(f"✅ Finished scanning {count} existing records.")
#     except Exception as e:
#         logging.exception(f"❌ Error during initial scan of existing records: {e}")
#     finally:
#         if 'cursor' in locals() and cursor and hasattr(cursor, 'close'):
#             cursor.close() # Ensure cursor is closed

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watches for inserts and specific updates (to appointment_time)
#     in the patient_data collection and triggers checks.
#     """
#     logging.info(f"👀 Watching patient_data collection for inserts and appointment_time updates...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]

#     try:
#         # Watch for inserts and updates, get the full document after update
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         # Need full document to check appointment details including status
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 operation_type = change.get("operationType")
#                 full_doc = change.get("fullDocument")
#                 doc_id = change.get("documentKey", {}).get("_id")
#                 mr_no = full_doc.get("Mr_no", "N/A") if full_doc else "N/A (no fullDoc)"

#                 logging.debug(f"⚡ Change detected (Type: {operation_type}, ID: {doc_id}, Mr_no: {mr_no})")

#                 if not full_doc:
#                      logging.warning(f"⚠️ Change detected (Type: {operation_type}, ID: {doc_id}), but full document not retrieved. Cannot process.")
#                      continue # Skip if we don't have the document data

#                 # Logic for insert and update remains the same: check_and_send_if_needed will handle it
#                 if operation_type == "insert":
#                     logging.info(f"Processing INSERT for Mr_no: {mr_no} (ID: {doc_id})")
#                     check_and_send_if_needed(full_doc, client)

#                 elif operation_type == "update":
#                     update_desc = change.get("updateDescription")
#                     if not update_desc:
#                         logging.warning(f"Update event for Mr_no: {mr_no} (ID: {doc_id}) missing 'updateDescription'. Skipping detailed check.")
#                         # Maybe still check? If any appointment is now within 24h?
#                         # Let's check anyway, as other fields might have changed
#                         # that don't affect appointments, but we still need to check times.
#                         # Check if *any* appointment is within 24h after *any* update
#                         logging.info(f"Processing UPDATE for Mr_no: {mr_no} (ID: {doc_id}) - updateDescription missing, checking appointments anyway.")
#                         check_and_send_if_needed(full_doc, client)
#                         continue

#                     updated_fields = update_desc.get("updatedFields", {})
#                     removed_fields = update_desc.get("removedFields", [])
#                     appointment_related_update = False
#                     updated_field_list = [] # For logging

#                     # Check if any updated field is related to appointment_tracker
#                     for key in updated_fields.keys():
#                         if key.startswith("appointment_tracker"):
#                             appointment_related_update = True
#                             updated_field_list.append(key)
#                             # Don't break, log all relevant fields

#                     # Check if any removed field is related to appointment_tracker
#                     for key in removed_fields:
#                          if key.startswith("appointment_tracker"):
#                              appointment_related_update = True
#                              updated_field_list.append(f"removed: {key}")
#                              # Don't break

#                     # Trigger check if appointment_tracker was modified OR
#                     # if an insert happened (covered above) OR
#                     # if it was any other update (maybe a status change we don't track explicitly)
#                     # Safer to just run the check on any update to the document.
#                     # The original logic focused only on appointment_time changes,
#                     # but checking on *any* update is safer if other fields might influence eligibility.
#                     # Let's stick to the user's original intent slightly modified: check if appt time *or* status updated?
#                     # The current code only checks if appt time updated explicitly.
#                     # Reverting to a simpler approach: check on *any* update or insert.

#                     logging.info(f"Processing UPDATE for Mr_no: {mr_no} (ID: {doc_id}) - Fields changed potentially include: {list(updated_fields.keys())}, Removed: {removed_fields}. Running check.")
#                     check_and_send_if_needed(full_doc, client) # Run check regardless of which field changed in update


#     except Exception as e: # Catching PyMongoError specifically might be better
#         logging.exception(f"❌ Change stream error: {e}")
#         # Consider adding retry logic or specific error handling here
#     logging.info("🛑 Watch stream stopped.")

# # ------------------------------------------------------------------
# def main():
#     """Main execution function."""
#     logging.info("🚀 Script starting up...")
#     try:
#         client = create_mongo_client(MONGO_URI)
#         check_existing_records(client)   # Scan existing records once at start
#         watch_patient_data(client)       # Watch for relevant inserts/updates
#     except Exception as e:
#         # Error during client creation or initial connection handled in create_mongo_client
#         # This catches errors during scan or watch setup/execution
#         logging.critical(f"❌ Critical error preventing script execution: {e}", exc_info=True)
#     finally:
#         logging.info("🏁 Script finished or encountered a critical error.")
#         # Clean up client connection if necessary, although usually not needed for long-running watchers
#         # if 'client' in locals() and client:
#         #    client.close()
#         #    logging.info("MongoDB connection closed.")

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()






# # -*- coding: utf-8 -*-
# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os
# import logging # Using logging module for better output control

# # ------------------------------------------------------------------
# # Setup Logging
# # ------------------------------------------------------------------
# logging.basicConfig(level=logging.INFO,
#                     format='%(asctime)s - %(levelname)s - %(message)s')

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0")
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"
# )
# # Define the format string for appointment times globally
# APPOINTMENT_TIME_FORMAT = "%m/%d/%Y, %I:%M %p"
# DEFAULT_SURVEY_STATUS = "Not Completed" # Define default status
# # Flag to mark appointments for which a link has been sent
# APPOINTMENT_SENT_FLAG_FIELD = "surveyLinkSentForThisAppt"

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     """Creates and returns a MongoDB client instance."""
#     try:
#         client = MongoClient(uri, serverSelectionTimeoutMS=5000) # Add timeout
#         # The ismaster command is cheap and does not require auth.
#         client.admin.command('ismaster')
#         logging.info("✅ Successfully connected to MongoDB")
#         return client
#     except Exception as e:
#         logging.exception(f"❌ Error connecting to MongoDB: {e}") # Log full exception
#         raise

# # ------------------------------------------------------------------
# # Updated function signature to accept speciality and index
# def send_survey_link(mr_no: str, client: MongoClient, triggering_appt_status: str, speciality: str, appt_index: int) -> bool:
#     """
#     1. Calls the Express route to send the survey link.
#     2. If successful (HTTP 2xx):
#         a. Increments surveySent in both collections.
#         b. If triggering appt status is 'Not Completed', sets top-level surveyStatus.
#         c. Sets a flag on the specific appointment in patient_data to prevent resending.
#     3. Returns True if link sent and counters incremented successfully, False otherwise.
#     """
#     if not mr_no:
#         logging.warning("send_survey_link called with empty Mr_no. Skipping.")
#         return False

#     try:
#         logging.info(f"Attempting to send survey link for Mr_no {mr_no} (Appt: {speciality}[{appt_index}]) to {SEND_LINK_ENDPOINT}...")
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=15)

#         if resp.ok:
#             logging.info(f"✅📨 Survey link API call successful for Mr_no {mr_no} (Status: {resp.status_code})")

#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             dashboards_pretest_col = client["dashboards"]["pretest"]
#             success_patient = False
#             success_pretest = False

#             # --- Start Increment Logic ---
#             try:
#                 # Combine increments and status/flag updates into one patient_data update if possible?
#                 # For simplicity and clarity, keeping separate for now.
#                 update_result_patient = patient_data_col.update_one(
#                     {"Mr_no": mr_no},
#                     {"$inc": {"surveySent": 1}}
#                 )
#                 if update_result_patient.matched_count > 0:
#                     if update_result_patient.modified_count > 0:
#                         logging.info(f"✅ Incremented surveySent in patient_data for Mr_no {mr_no}")
#                         success_patient = True
#                     else:
#                         logging.warning(f"⚠️ Found patient_data for Mr_no {mr_no} but surveySent not incremented (already incremented?).")
#                         success_patient = True # Treat as success if found, even if not modified by $inc
#                 else:
#                     logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} to increment surveySent.")
#             except Exception as e:
#                 logging.exception(f"❌ Error incrementing surveySent in patient_data for {mr_no}: {e}")

#             try:
#                 update_result_pretest = dashboards_pretest_col.update_one(
#                     {"patientId": mr_no},
#                     {"$inc": {"surveySent": 1}},
#                     upsert=True
#                 )
#                 if update_result_pretest.modified_count or update_result_pretest.upserted_id:
#                     logging.info(f"✅ Incremented/Set surveySent in dashboards.pretest for Mr_no {mr_no}")
#                     success_pretest = True
#                 else:
#                      logging.warning(f"⚠️ Failed to modify/upsert surveySent in dashboards.pretest for Mr_no {mr_no} (Matched: {update_result_pretest.matched_count})")
#             except Exception as e:
#                 logging.exception(f"❌ Error incrementing/upserting surveySent in dashboards.pretest for {mr_no}: {e}")
#             # --- End Increment Logic ---

#             # --- Start Combined Status and Flag Update Logic ---
#             if success_patient: # Proceed only if patient doc likely exists
#                 update_payload = {}
#                 log_messages = []

#                 # 1. Prepare top-level status update if needed
#                 if triggering_appt_status == "Not Completed":
#                     update_payload["surveyStatus"] = "Not Completed"
#                     log_messages.append("set top-level surveyStatus to 'Not Completed'")

#                 # 2. Prepare appointment-specific flag update
#                 # Construct field path dynamically using the index
#                 field_path = f"appointment_tracker.{speciality}.{appt_index}.{APPOINTMENT_SENT_FLAG_FIELD}"
#                 update_payload[field_path] = True
#                 log_messages.append(f"set flag {APPOINTMENT_SENT_FLAG_FIELD}=True for appointment {speciality}[{appt_index}]")

#                 if update_payload:
#                     logging.info(f"Attempting updates for Mr_no {mr_no}: {', '.join(log_messages)}")
#                     try:
#                         combined_update_result = patient_data_col.update_one(
#                             {"Mr_no": mr_no},
#                             {"$set": update_payload}
#                         )
#                         if combined_update_result.matched_count > 0:
#                             if combined_update_result.modified_count > 0:
#                                 logging.info(f"✅ Successfully applied updates ({', '.join(log_messages)}) for Mr_no {mr_no}")
#                             else:
#                                 logging.info(f"ℹ️ Document found for Mr_no {mr_no}, but no fields were modified by $set (likely already set). Updates attempted: {', '.join(log_messages)}")
#                         else:
#                              # Should not happen if success_patient was true
#                              logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} again to apply updates: {', '.join(log_messages)}.")
#                     except Exception as e:
#                         logging.exception(f"❌ Error applying combined updates ({', '.join(log_messages)}) for Mr_no {mr_no}: {e}")
#                 else:
#                      logging.debug(f"No status or flag updates needed for Mr_no {mr_no} in this call.")

#             else:
#                  logging.warning(f"⚠️ Skipping top-level status update and appointment flagging for Mr_no {mr_no} because initial surveySent increment in patient_data might have failed.")
#             # --- End Combined Status and Flag Update Logic ---

#             # Return depends only on initial increments succeeding for now
#             return success_patient and success_pretest

#         else:
#             error_detail = resp.text[:500]
#             logging.error(f"⚠️ Failed to send survey link for Mr_no {mr_no}. Status: {resp.status_code}, Response: {error_detail}")
#             return False

#     except requests.Timeout:
#          logging.error(f"❌ Timeout error while sending link for Mr_no {mr_no}")
#          return False
#     except requests.RequestException as err:
#         logging.error(f"❌ HTTP Request error while sending link for Mr_no {mr_no}: {err}")
#         return False
#     except Exception as e:
#         logging.exception(f"❌ Unexpected error during send_survey_link for Mr_no {mr_no}: {e}")
#         return False

# # ------------------------------------------------------------------
# def check_and_send_if_needed(document: dict, client: MongoClient):
#     """
#     Checks if any appointment is within 24 hours AND hasn't had a link sent yet.
#     If found, determines its surveyStatus and calls send_survey_link(), passing
#     appointment details (speciality, index) needed to mark it as sent.
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no:
#         logging.warning("Document missing Mr_no in check_and_send_if_needed. Skipping.")
#         return
#     if not tracker:
#         logging.debug(f"No appointment_tracker found for Mr_no {mr_no}. Skipping check.")
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)
#     found_appointment_to_send = False
#     appointment_details = ""
#     triggering_appt_status = DEFAULT_SURVEY_STATUS
#     triggering_speciality = None
#     triggering_appt_index = -1


#     for speciality, appointments in tracker.items():
#         if not isinstance(appointments, list):
#             logging.warning(f"Expected list for appointments in speciality '{speciality}' for Mr_no {mr_no}, got {type(appointments)}. Skipping speciality.")
#             continue

#         for idx, appt in enumerate(appointments):
#             if not isinstance(appt, dict):
#                 logging.warning(f"Expected dict for appointment entry {idx} in speciality '{speciality}' for Mr_no {mr_no}, got {type(appt)}. Skipping entry.")
#                 continue

#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue # Skip entries without time

#             try:
#                 appt_time = datetime.strptime(appt_time_str, APPOINTMENT_TIME_FORMAT)
#             except ValueError:
#                 logging.warning(f"Bad date format '{appt_time_str}' in appointment_time ({speciality}[{idx}]) for Mr_no {mr_no}. Skipping entry.")
#                 continue

#             # Check if the appointment is in the future but within the next 24 hours
#             if now < appt_time <= tomorrow:
#                 # *** NEW CHECK ***: See if link already sent for this specific appointment
#                 if appt.get(APPOINTMENT_SENT_FLAG_FIELD):
#                     logging.debug(f"Appointment within 24h found for Mr_no {mr_no} ({speciality}[{idx}] @ {appt_time_str}), but link already sent ({APPOINTMENT_SENT_FLAG_FIELD}=True). Skipping.")
#                     continue # Check next appointment

#                 # If we reach here, appt is within 24h AND link not sent yet
#                 logging.info(f"📢 Eligible appointment found for Mr_no {mr_no} (Speciality: {speciality}, Index: {idx}, Time: {appt_time_str}). Link not sent yet.")
#                 found_appointment_to_send = True
#                 appointment_details = f"Speciality: {speciality}, Index: {idx}, Time: {appt_time_str}"
#                 triggering_appt_status = appt.get("surveyStatus", DEFAULT_SURVEY_STATUS)
#                 triggering_speciality = speciality
#                 triggering_appt_index = idx
#                 logging.info(f"   -> Status of this appointment: '{triggering_appt_status}'")
#                 break # Exit inner loop once a valid, unsent appointment is found

#         if found_appointment_to_send:
#             break # Exit outer loop as well

#     if found_appointment_to_send:
#         logging.info(f"   -> Triggering survey link send for Mr_no {mr_no} due to upcoming appointment: {appointment_details}")
#         # Pass the specific appointment's details to the send function
#         send_survey_link(mr_no, client, triggering_appt_status, triggering_speciality, triggering_appt_index)
#     else:
#         logging.debug(f"No upcoming appointments needing a survey link found within 24h for Mr_no {mr_no} in this check.")


# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     """
#     Scans existing records at startup, checking for appointments within 24h
#     that haven't had a link sent, and triggers send_survey_link if found.
#     """
#     logging.info(f"📂 Scanning existing patient records at startup...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     count = 0
#     try:
#         # Project necessary fields including the tracker and the sent flag within it
#         cursor = collection.find({}, {"Mr_no": 1, "appointment_tracker": 1}) # Ensure tracker is fetched
#         for document in cursor:
#             # check_and_send_if_needed now handles checking the flag
#             check_and_send_if_needed(document, client)
#             count += 1
#             if count % 1000 == 0:
#                 logging.info(f"  ...scanned {count} existing records...")

#         logging.info(f"✅ Finished scanning {count} existing records.")
#     except Exception as e:
#         logging.exception(f"❌ Error during initial scan of existing records: {e}")
#     finally:
#         if 'cursor' in locals() and cursor and hasattr(cursor, 'close'):
#             cursor.close()

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watches for inserts/updates and triggers checks for eligible appointments.
#     """
#     logging.info(f"👀 Watching patient_data collection for inserts and updates...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]

#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 operation_type = change.get("operationType")
#                 full_doc = change.get("fullDocument")
#                 doc_id = change.get("documentKey", {}).get("_id")
#                 mr_no = full_doc.get("Mr_no", "N/A") if full_doc else "N/A (no fullDoc)"

#                 logging.debug(f"⚡ Change detected (Type: {operation_type}, ID: {doc_id}, Mr_no: {mr_no})")

#                 if not full_doc:
#                      logging.warning(f"⚠️ Change detected (Type: {operation_type}, ID: {doc_id}), but full document not retrieved. Cannot process.")
#                      continue

#                 # Always run the check on insert or update.
#                 # check_and_send_if_needed will determine if action is needed based on time and flag.
#                 logging.info(f"Processing {operation_type} for Mr_no: {mr_no} (ID: {doc_id}). Running check...")
#                 check_and_send_if_needed(full_doc, client)

#     except Exception as e:
#         logging.exception(f"❌ Change stream error: {e}")
#     logging.info("🛑 Watch stream stopped.")

# # ------------------------------------------------------------------
# def main():
#     """Main execution function."""
#     logging.info("🚀 Script starting up...")
#     try:
#         client = create_mongo_client(MONGO_URI)
#         check_existing_records(client)   # Scan existing records once at start
#         watch_patient_data(client)       # Watch for relevant inserts/updates
#     except Exception as e:
#         logging.critical(f"❌ Critical error preventing script execution: {e}", exc_info=True)
#     finally:
#         logging.info("🏁 Script finished or encountered a critical error.")

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()







# -*- coding: utf-8 -*-
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone # Added timezone
import requests
import os
import logging
from bson import ObjectId # Import ObjectId to extract creation time

# ------------------------------------------------------------------
# Setup Logging
# ------------------------------------------------------------------
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0")
SEND_LINK_ENDPOINT = os.getenv(
    "SURVEY_LINK_URL",
    "http://localhost:3051/staff/send-survey-link"
)
# Define the format string for appointment times globally
APPOINTMENT_TIME_FORMAT = "%m/%d/%Y, %I:%M %p"
DEFAULT_SURVEY_STATUS = "Not Completed" # Define default status
# Flag to mark appointments for which a link has been sent
APPOINTMENT_SENT_FLAG_FIELD = "surveyLinkSentForThisAppt"
# Define a threshold for how "new" a record must be to skip the first check
RECENTLY_CREATED_THRESHOLD = timedelta(minutes=5) # Skip check if record created within last 5 minutes

# ------------------------------------------------------------------
def create_mongo_client(uri: str) -> MongoClient:
    """Creates and returns a MongoDB client instance."""
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000) # Add timeout
        client.admin.command('ismaster')
        logging.info("✅ Successfully connected to MongoDB")
        return client
    except Exception as e:
        logging.exception(f"❌ Error connecting to MongoDB: {e}") # Log full exception
        raise

# ------------------------------------------------------------------
def send_survey_link(mr_no: str, client: MongoClient, triggering_appt_status: str, speciality: str, appt_index: int) -> bool:
    """
    1. Calls the Express route to send the survey link.
    2. If successful (HTTP 2xx):
        a. Increments surveySent in both collections.
        b. If triggering appt status is 'Not Completed', sets top-level surveyStatus.
        c. Sets a flag on the specific appointment in patient_data to prevent resending.
    3. Returns True if link sent and counters incremented successfully, False otherwise.
    """
    if not mr_no:
        logging.warning("send_survey_link called with empty Mr_no. Skipping.")
        return False

    try:
        logging.info(f"Attempting to send survey link for Mr_no {mr_no} (Appt: {speciality}[{appt_index}]) to {SEND_LINK_ENDPOINT}...")
        resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=15)

        if resp.ok:
            logging.info(f"✅📨 Survey link API call successful for Mr_no {mr_no} (Status: {resp.status_code})")

            patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
            dashboards_pretest_col = client["dashboards"]["pretest"]
            success_patient = False
            success_pretest = False

            # --- Start Increment Logic ---
            try:
                update_result_patient = patient_data_col.update_one(
                    {"Mr_no": mr_no},
                    {"$inc": {"surveySent": 1}}
                )
                if update_result_patient.matched_count > 0:
                    if update_result_patient.modified_count > 0:
                        logging.info(f"✅ Incremented surveySent in patient_data for Mr_no {mr_no}")
                        success_patient = True
                    else:
                        # This case might happen if another process incremented it between the API call and this update
                        logging.warning(f"⚠️ Found patient_data for Mr_no {mr_no} but surveySent not incremented (already incremented?).")
                        success_patient = True # Still consider patient update part successful if found
                else:
                    logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} to increment surveySent.")
            except Exception as e:
                logging.exception(f"❌ Error incrementing surveySent in patient_data for {mr_no}: {e}")

            try:
                update_result_pretest = dashboards_pretest_col.update_one(
                    {"patientId": mr_no},
                    {"$inc": {"surveySent": 1}},
                    upsert=True # Use upsert to handle cases where the dashboard doc might not exist yet
                )
                # Check modified_count OR upserted_id to confirm success
                if update_result_pretest.modified_count > 0 or update_result_pretest.upserted_id:
                    logging.info(f"✅ Incremented/Set surveySent in dashboards.pretest for Mr_no {mr_no}")
                    success_pretest = True
                # Address the case where the document matched but wasn't modified (value already correct?)
                elif update_result_pretest.matched_count > 0 and update_result_pretest.modified_count == 0:
                     logging.warning(f"⚠️ Found dashboards.pretest for Mr_no {mr_no} but surveySent not incremented (already correct value?).")
                     success_pretest = True # Treat as success if found, even if not modified
                else: # Catch cases where match fails and upsert somehow doesn't happen
                     logging.warning(f"⚠️ Failed to modify or upsert surveySent in dashboards.pretest for Mr_no {mr_no} (Matched: {update_result_pretest.matched_count}, UpsertedId: {update_result_pretest.upserted_id})")

            except Exception as e:
                logging.exception(f"❌ Error incrementing/upserting surveySent in dashboards.pretest for {mr_no}: {e}")
            # --- End Increment Logic ---

            # --- Start Combined Status and Flag Update Logic ---
            # Proceed only if the patient doc exists (success_patient is True)
            # and *at least one* increment succeeded (or was already correct) to avoid partial updates if API succeeded but DB failed badly
            if success_patient and success_pretest:
                update_payload = {}
                log_messages = []

                # 1. Prepare top-level status update only if the triggering appointment was 'Not Completed'
                if triggering_appt_status == DEFAULT_SURVEY_STATUS:
                    update_payload["surveyStatus"] = DEFAULT_SURVEY_STATUS # Set to Not Completed
                    log_messages.append(f"set top-level surveyStatus to '{DEFAULT_SURVEY_STATUS}'")

                # 2. Prepare appointment-specific flag update
                field_path = f"appointment_tracker.{speciality}.{appt_index}.{APPOINTMENT_SENT_FLAG_FIELD}"
                update_payload[field_path] = True
                log_messages.append(f"set flag {APPOINTMENT_SENT_FLAG_FIELD}=True for appointment {speciality}[{appt_index}]")

                if update_payload:
                    logging.info(f"Attempting updates for Mr_no {mr_no}: {', '.join(log_messages)}")
                    try:
                        combined_update_result = patient_data_col.update_one(
                            {"Mr_no": mr_no},
                            {"$set": update_payload}
                        )
                        if combined_update_result.matched_count > 0:
                            if combined_update_result.modified_count > 0:
                                logging.info(f"✅ Successfully applied updates ({', '.join(log_messages)}) for Mr_no {mr_no}")
                            else:
                                # This means the document was found, but the fields already had the values we tried to set.
                                logging.info(f"ℹ️ Document found for Mr_no {mr_no}, but no fields were modified by $set (likely already set). Updates attempted: {', '.join(log_messages)}")
                        else:
                             # Should not happen if success_patient was true, indicates a race condition or error
                             logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} again to apply updates: {', '.join(log_messages)}.")
                             # If this fails, the increments might have happened but the flag/status not set. Potential for resend later.
                             return False # Indicate failure if we couldn't set the flag

                    except Exception as e:
                        logging.exception(f"❌ Error applying combined updates ({', '.join(log_messages)}) for Mr_no {mr_no}: {e}")
                        return False # Indicate failure
                else:
                     # Should not happen given we always set the flag
                     logging.debug(f"No status or flag updates needed for Mr_no {mr_no} in this call.")

            else:
                 logging.warning(f"⚠️ Skipping status/flag updates for Mr_no {mr_no} because initial surveySent increments did not fully succeed (Patient success: {success_patient}, Pretest success: {success_pretest}). API call was successful.")
                 # Even if API was ok, we return False because DB state is inconsistent / flag not set
                 return False
            # --- End Combined Status and Flag Update Logic ---

            # Return True only if all steps (API call, increments, flag/status set) were successful
            return True # If we reached here, assume success

        else:
            # Handle API call failure
            error_detail = resp.text[:500] # Limit error detail length
            logging.error(f"⚠️ Failed to send survey link for Mr_no {mr_no}. Status: {resp.status_code}, Response: {error_detail}")
            return False

    except requests.Timeout:
         logging.error(f"❌ Timeout error while sending link for Mr_no {mr_no}")
         return False
    except requests.RequestException as err:
        logging.error(f"❌ HTTP Request error while sending link for Mr_no {mr_no}: {err}")
        return False
    except Exception as e:
        # Catch any other unexpected errors during the process
        logging.exception(f"❌ Unexpected error during send_survey_link for Mr_no {mr_no}: {e}")
        return False

# ------------------------------------------------------------------
def check_and_send_if_needed(document: dict, client: MongoClient):
    """
    Checks if any appointment is within 24 hours AND hasn't had a link sent yet.
    If the document was created very recently (based on _id), skips the check.
    If found, determines its surveyStatus and calls send_survey_link(), passing
    appointment details (speciality, index) needed to mark it as sent.
    """
    mr_no = document.get("Mr_no")
    doc_id = document.get("_id") # Get the document ID

    # --- NEW: Check document creation time ---
    if isinstance(doc_id, ObjectId):
        try:
            created_at = doc_id.generation_time # This is timezone-aware (UTC)
            now_utc = datetime.now(timezone.utc) # Get current time in UTC for comparison
            # Check if the document was created within the defined threshold
            if now_utc - created_at < RECENTLY_CREATED_THRESHOLD:
                logging.info(f"ℹ️ Document for Mr_no {mr_no} (ID: {doc_id}) was created recently ({created_at}). Skipping appointment check for this event to avoid sending link immediately after insert.")
                return # Skip the rest of the check for very new documents
        except Exception as e:
            logging.warning(f"⚠️ Could not determine creation time from ObjectId for Mr_no {mr_no} (ID: {doc_id}): {e}. Proceeding with check.")
    # --- End of New Check ---

    tracker = document.get("appointment_tracker", {})

    if not mr_no:
        logging.warning(f"Document missing Mr_no (ID: {doc_id}) in check_and_send_if_needed. Skipping.")
        return
    if not tracker:
        logging.debug(f"No appointment_tracker found for Mr_no {mr_no} (ID: {doc_id}). Skipping check.")
        return

    now_local = datetime.now() # Use local time for appointment comparison as format likely local
    tomorrow_local = now_local + timedelta(days=1)
    found_appointment_to_send = False
    appointment_details = ""
    triggering_appt_status = DEFAULT_SURVEY_STATUS
    triggering_speciality = None
    triggering_appt_index = -1

    for speciality, appointments in tracker.items():
        if not isinstance(appointments, list):
            logging.warning(f"Expected list for appointments in speciality '{speciality}' for Mr_no {mr_no}, got {type(appointments)}. Skipping speciality.")
            continue

        for idx, appt in enumerate(appointments):
            if not isinstance(appt, dict):
                logging.warning(f"Expected dict for appointment entry {idx} in speciality '{speciality}' for Mr_no {mr_no}, got {type(appt)}. Skipping entry.")
                continue

            appt_time_str = appt.get("appointment_time")
            if not appt_time_str:
                # logging.debug(f"Skipping appointment {speciality}[{idx}] for Mr_no {mr_no} due to missing 'appointment_time'.")
                continue # Skip entries without time

            try:
                # Assuming APPOINTMENT_TIME_FORMAT represents local time
                appt_time_local = datetime.strptime(appt_time_str, APPOINTMENT_TIME_FORMAT)
            except ValueError:
                logging.warning(f"Bad date format '{appt_time_str}' in appointment_time ({speciality}[{idx}]) for Mr_no {mr_no}. Skipping entry.")
                continue

            # Check if the appointment is in the future but within the next 24 hours (using local time)
            if now_local < appt_time_local <= tomorrow_local:
                # Check if link already sent for this specific appointment using the flag
                if appt.get(APPOINTMENT_SENT_FLAG_FIELD):
                    logging.debug(f"Appointment within 24h found for Mr_no {mr_no} ({speciality}[{idx}] @ {appt_time_str}), but link already sent ({APPOINTMENT_SENT_FLAG_FIELD}=True). Skipping.")
                    continue # Check next appointment

                # If we reach here, appt is within 24h AND link not sent yet for this specific appt
                logging.info(f"📢 Eligible appointment found for Mr_no {mr_no} (Speciality: {speciality}, Index: {idx}, Time: {appt_time_str}). Link not sent yet.")
                found_appointment_to_send = True
                appointment_details = f"Speciality: {speciality}, Index: {idx}, Time: {appt_time_str}"
                # Get the status of this specific appointment, default if not present
                triggering_appt_status = appt.get("surveyStatus", DEFAULT_SURVEY_STATUS)
                triggering_speciality = speciality
                triggering_appt_index = idx
                logging.info(f"   -> Status of this appointment: '{triggering_appt_status}'")
                break # Exit inner loop (appointments) once a valid, unsent appointment is found

        if found_appointment_to_send:
            break # Exit outer loop (specialities) as well

    if found_appointment_to_send:
        logging.info(f"   -> Triggering survey link send for Mr_no {mr_no} due to upcoming appointment: {appointment_details}")
        # Pass the specific appointment's details and its status to the send function
        send_survey_link(mr_no, client, triggering_appt_status, triggering_speciality, triggering_appt_index)
    else:
        # This log now correctly means no eligible *and* unsent *and* not-too-new appointments were found
        logging.debug(f"No upcoming appointments needing a survey link found within 24h for Mr_no {mr_no} in this check (or document too recent).")


# ------------------------------------------------------------------
def check_existing_records(client: MongoClient):
    """
    Scans existing records at startup, checking for appointments within 24h
    that haven't had a link sent, and triggers send_survey_link if found.
    This scan IGNORES the "recently created" check, ensuring links are eventually sent
    even if skipped by the watcher initially.
    """
    logging.info(f"📂 Scanning existing patient records at startup...")
    collection = client["Data_Entry_Incoming"]["patient_data"]
    count = 0
    try:
        # Project necessary fields including the tracker and the sent flag within it
        # Fetch _id as well, although we won't use its timestamp in this specific function
        cursor = collection.find({}, {"Mr_no": 1, "appointment_tracker": 1, "_id": 1})
        for document in cursor:
            # Call a slightly modified check or directly implement the logic here
            # to bypass the "recently created" check specifically for the startup scan.
            # For simplicity, we'll replicate the core logic without the time check.

            mr_no = document.get("Mr_no")
            tracker = document.get("appointment_tracker", {})
            doc_id = document.get("_id") # For logging clarity

            if not mr_no:
                logging.warning(f"Document missing Mr_no (ID: {doc_id}) during initial scan. Skipping.")
                continue
            if not tracker:
                # logging.debug(f"No appointment_tracker found for Mr_no {mr_no} (ID: {doc_id}) during initial scan.")
                continue

            now_local = datetime.now() # Use local time for appointment comparison
            tomorrow_local = now_local + timedelta(days=1)
            found_appointment_to_send = False
            appointment_details = ""
            triggering_appt_status = DEFAULT_SURVEY_STATUS
            triggering_speciality = None
            triggering_appt_index = -1

            for speciality, appointments in tracker.items():
                 if not isinstance(appointments, list): continue # Basic validation
                 for idx, appt in enumerate(appointments):
                     if not isinstance(appt, dict): continue # Basic validation
                     appt_time_str = appt.get("appointment_time")
                     if not appt_time_str: continue

                     try:
                         appt_time_local = datetime.strptime(appt_time_str, APPOINTMENT_TIME_FORMAT)
                     except ValueError:
                         logging.warning(f"[Initial Scan] Bad date format '{appt_time_str}' for Mr_no {mr_no}. Skipping entry.")
                         continue

                     if now_local < appt_time_local <= tomorrow_local:
                         if appt.get(APPOINTMENT_SENT_FLAG_FIELD):
                             # logging.debug(f"[Initial Scan] Appointment for {mr_no} ({speciality}[{idx}]) already processed.")
                             continue

                         logging.info(f"[Initial Scan] 📢 Eligible appointment found for Mr_no {mr_no} (Speciality: {speciality}, Index: {idx}, Time: {appt_time_str}).")
                         found_appointment_to_send = True
                         appointment_details = f"Speciality: {speciality}, Index: {idx}, Time: {appt_time_str}"
                         triggering_appt_status = appt.get("surveyStatus", DEFAULT_SURVEY_STATUS)
                         triggering_speciality = speciality
                         triggering_appt_index = idx
                         logging.info(f"[Initial Scan]    -> Status of this appointment: '{triggering_appt_status}'")
                         break # Inner loop
                 if found_appointment_to_send: break # Outer loop

            if found_appointment_to_send:
                 logging.info(f"[Initial Scan]    -> Triggering survey link send for Mr_no {mr_no} due to upcoming appointment: {appointment_details}")
                 send_survey_link(mr_no, client, triggering_appt_status, triggering_speciality, triggering_appt_index)

            count += 1
            if count % 1000 == 0:
                logging.info(f"  ...scanned {count} existing records...")

        logging.info(f"✅ Finished scanning {count} existing records.")
    except Exception as e:
        logging.exception(f"❌ Error during initial scan of existing records: {e}")
    finally:
        # Ensure cursor is closed if it was opened
        if 'cursor' in locals() and cursor and hasattr(cursor, 'close'):
             try:
                 cursor.close()
                 # logging.debug("Initial scan cursor closed.")
             except Exception as e:
                 logging.warning(f"⚠️ Error closing initial scan cursor: {e}")


# ------------------------------------------------------------------
def watch_patient_data(client: MongoClient):
    """
    Watches for inserts/updates. Triggers checks *only for updates*,
    and the check includes logic to skip processing for very recently created documents.
    """
    logging.info(f"👀 Watching patient_data collection for inserts and updates...")
    collection = client["Data_Entry_Incoming"]["patient_data"]

    try:
        pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
        with collection.watch(pipeline, full_document="updateLookup") as stream:
            for change in stream:
                operation_type = change.get("operationType")
                full_doc = change.get("fullDocument")
                doc_id = change.get("documentKey", {}).get("_id")
                mr_no = full_doc.get("Mr_no", "N/A") if full_doc else f"N/A (change type: {operation_type})"

                logging.debug(f"⚡ Change detected (Type: {operation_type}, ID: {doc_id}, Mr_no: {mr_no})")

                if not full_doc:
                     logging.warning(f"⚠️ Change detected (Type: {operation_type}, ID: {doc_id}, Mr_no: {mr_no}), but full document not retrieved. Cannot process.")
                     continue

                # Only run the check if the operation was an UPDATE.
                if operation_type == "update":
                    logging.info(f"Processing UPDATE for Mr_no: {mr_no} (ID: {doc_id}). Running check...")
                    # check_and_send_if_needed now includes the recently created check
                    check_and_send_if_needed(full_doc, client)
                elif operation_type == "insert":
                    logging.info(f"Processing INSERT for Mr_no: {mr_no} (ID: {doc_id}). Skipping survey link check for new record trigger.")
                    # No action needed here based on the requirement
                else:
                     logging.warning(f"⚠️ Unexpected operation type '{operation_type}' detected for Mr_no: {mr_no} (ID: {doc_id}). Skipping.")

    except Exception as e:
        logging.exception(f"❌ Change stream error: {e}")
    logging.info("🛑 Watch stream stopped.")

# ------------------------------------------------------------------
def main():
    """Main execution function."""
    logging.info("🚀 Script starting up...")
    try:
        client = create_mongo_client(MONGO_URI)
        # Scan existing records on startup (bypasses the "recently created" check)
        check_existing_records(client)
         # Watch for updates (check includes "recently created" logic)
        watch_patient_data(client)
    except Exception as e:
        logging.critical(f"❌ Critical error preventing script execution: {e}", exc_info=True)
    finally:
        logging.info("🏁 Script finished or encountered a critical error.")

# ------------------------------------------------------------------
if __name__ == "__main__":
    main()