# from pymongo import MongoClient
# from datetime import datetime
# from typing import Dict, List


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


# def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[str, List[Dict]]:
#     try:
#         hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': hospital_code})
#         return hospital['hospital_name'], hospital['sites']
#     except Exception as e:
#         print(f"Error getting hospital information: {e}")
#         return None, None


# def find_site_name(sites: List[Dict], site_code: str) -> str:
#     try:
#         return next((site['site_name'] for site in sites if site['site_code'] == site_code), 'Unknown Site')
#     except Exception as e:
#         print(f"Error finding site name: {e}")
#         return 'Unknown Site'


# def get_patient_name(document: Dict) -> str:
#     try:
#         return f"{document['firstName']} {document['lastName']}"
#     except Exception as e:
#         print(f"Error getting patient name: {e}")
#         return "Unknown"


# def find_latest_record(records: List[Dict], date_field: str, date_format: str) -> Dict:
#     current_time = datetime.now()

#     def get_time_diff(record: Dict) -> float:
#         parsed_time = datetime.strptime(record[date_field], date_format)
#         return abs((parsed_time - current_time).total_seconds())

#     return min(records, key=get_time_diff)


# def create_dashboard_entry(
#     hospital_info: Dict[str, str],
#     doctor_info: Dict[str, str],
#     patient_info: Dict[str, str]
# ) -> Dict:
#     return {
#         **hospital_info,
#         **doctor_info,
#         **patient_info
#     }


# def main(Mr_no: str):
#     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///'
#     client = create_mongo_client(MONGO_URI)

#     document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
#     if not document:
#         print(f"No document found for {Mr_no}")
#         return

#     hospital_name, sites = get_hospital_info(client, document['hospital_code'])
#     site_name = find_site_name(sites, document['site_code'])

#     latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")

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

#     entry = create_dashboard_entry(hospital_info, doctor_info, patient_info)

#     collection = client['dashboards']['pretest']

#     duplicate_query = entry  # All 8 fields must match

#     existing_entry = collection.find_one(duplicate_query)
#     if existing_entry:
#         print(f"Skipped duplicate entry for patient {entry['patientId']}")
#     else:
#         collection.insert_one(entry)
#         print(f"Inserted new entry for patient {entry['patientId']}")


# if __name__ == "__main__":
#     main(Mr_no='300')




# from pymongo import MongoClient
# from datetime import datetime
# from typing import Dict, List
# import pprint


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


# def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[str, List[Dict]]:
#     try:
#         hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': hospital_code})
#         return hospital['hospital_name'], hospital['sites']
#     except Exception as e:
#         print(f"Error getting hospital information: {e}")
#         return None, None


# def find_site_name(sites: List[Dict], site_code: str) -> str:
#     try:
#         return next((site['site_name'] for site in sites if site['site_code'] == site_code), 'Unknown Site')
#     except Exception as e:
#         print(f"Error finding site name: {e}")
#         return 'Unknown Site'


# def get_patient_name(document: Dict) -> str:
#     try:
#         return f"{document['firstName']} {document['lastName']}"
#     except Exception as e:
#         print(f"Error getting patient name: {e}")
#         return "Unknown"


# def find_latest_record(records: List[Dict], date_field: str, date_format: str) -> Dict:
#     current_time = datetime.now()

#     def get_time_diff(record: Dict) -> float:
#         parsed_time = datetime.strptime(record[date_field], date_format)
#         return abs((parsed_time - current_time).total_seconds())

#     return min(records, key=get_time_diff)


# def create_dashboard_entry(
#     hospital_info: Dict[str, str],
#     doctor_info: Dict[str, str],
#     patient_info: Dict[str, str]
# ) -> Dict:
#     return {
#         **hospital_info,
#         **doctor_info,
#         **patient_info
#     }


# def main(Mr_no: str):
#     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0'
#     client = create_mongo_client(MONGO_URI)

#     document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
#     if not document:
#         print(f"No document found for {Mr_no}")
#         return

#     hospital_name, sites = get_hospital_info(client, document['hospital_code'])
#     site_name = find_site_name(sites, document['site_code'])

#     latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")

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

#     entry = create_dashboard_entry(hospital_info, doctor_info, patient_info)

#     collection = client['dashboards']['pretest']

#     duplicate_query = entry  # All 8 fields must match

#     existing_entry = collection.find_one(duplicate_query)
#     if existing_entry:
#         print(f"Skipped duplicate entry for patient {entry['patientId']}")
#     else:
#         collection.insert_one(entry)
#         print(f"Inserted new entry for patient {entry['patientId']}")


# # 🔁 Watch for new inserts and trigger main()
# def watch_new_patient_data():
#     MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0'
#     client = create_mongo_client(MONGO_URI)
#     db = client['Data_Entry_Incoming']
#     collection = db['patient_data']

#     try:
#         print("🔍 Watching for new patient_data inserts...")
#         with collection.watch([{'$match': {'operationType': 'insert'}}]) as stream:
#             for change in stream:
#                 new_doc = change['fullDocument']
#                 mr_no = new_doc.get('Mr_no')
#                 if mr_no:
#                     print(f"\n📥 New document detected for Mr_no: {mr_no}")
#                     main(mr_no)
#                 else:
#                     print("⚠️ Inserted document missing 'Mr_no'")
#     except Exception as e:
#         print(f"❌ Error in change stream: {e}")


# if __name__ == "__main__":
#     watch_new_patient_data()





#This is new code where SurveySent is also added to the staging database





from pymongo import MongoClient
from datetime import datetime
from typing import Dict, List
import pprint


def create_mongo_client(connection_string: str) -> MongoClient:
    try:
        print("Connected to MongoDB")
        return MongoClient(connection_string)
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None


def get_document(client: MongoClient, db_name: str, collection_name: str, query: dict) -> dict:
    try:
        db = client[db_name]
        collection = db[collection_name]
        return collection.find_one(query)
    except Exception as e:
        print(f"Error getting document: {e}")
        return None


def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[str, List[Dict]]:
    try:
        hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': hospital_code})
        return hospital['hospital_name'], hospital['sites']
    except Exception as e:
        print(f"Error getting hospital information: {e}")
        return None, None


def find_site_name(sites: List[Dict], site_code: str) -> str:
    try:
        return next((site['site_name'] for site in sites if site['site_code'] == site_code), 'Unknown Site')
    except Exception as e:
        print(f"Error finding site name: {e}")
        return 'Unknown Site'


def get_patient_name(document: Dict) -> str:
    try:
        return f"{document['firstName']} {document['lastName']}"
    except Exception as e:
        print(f"Error getting patient name: {e}")
        return "Unknown"


# def find_latest_record(records: List[Dict], date_field: str, date_format: str) -> Dict:
#     current_time = datetime.now()

#     def get_time_diff(record: Dict) -> float:
#         parsed_time = datetime.strptime(record[date_field], date_format)
#         return abs((parsed_time - current_time).total_seconds())

#     return min(records, key=get_time_diff)

def find_latest_record(records: List[Dict], date_field: str, date_format: str = None) -> Dict:
    current_time = datetime.now()

    def get_time_diff(record: Dict) -> float:
        time_value = record[date_field]
        if isinstance(time_value, str):
            parsed_time = datetime.strptime(time_value, date_format)
        else:
            parsed_time = time_value  # already datetime
        return abs((parsed_time - current_time).total_seconds())

    return min(records, key=get_time_diff)



def create_dashboard_entry(
    hospital_info: Dict[str, str],
    doctor_info: Dict[str, str],
    patient_info: Dict[str, str]
) -> Dict:
    return {
        **hospital_info,
        **doctor_info,
        **patient_info
    }


def main(Mr_no: str):
    MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0'
    client = create_mongo_client(MONGO_URI)

    document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
    if not document:
        print(f"No document found for {Mr_no}")
        return

    hospital_name, sites = get_hospital_info(client, document['hospital_code'])
    site_name = find_site_name(sites, document['site_code'])

    latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")

    hospital_info = {
        'hospitalId': document['hospital_code'],
        'hospitalName': hospital_name,
        'siteId': document['site_code'],
        'siteName': site_name
    }

    doctor_info = {
        'doctorId': latest_speciality['doctor_ids'][0],
        'departmentName': document['speciality']
    }

    patient_info = {
        'patientId': document['Mr_no'],
        'patientName': get_patient_name(document)
    }

    entry = create_dashboard_entry(hospital_info, doctor_info, patient_info)
    
    # NEW: Add SurveySent from patient_data document (defaulting to 0 if not present)
    entry['surveySent'] = document.get("SurveySent", 0)

    collection = client['dashboards']['pretest']

    duplicate_query = entry  # All fields (including surveySent) must match

    existing_entry = collection.find_one(duplicate_query)
    if existing_entry:
        print(f"Skipped duplicate entry for patient {entry['patientId']}")
    else:
        collection.insert_one(entry)
        print(f"Inserted new entry for patient {entry['patientId']}")


# 🔁 Watch for new inserts and trigger main()
def watch_new_patient_data():
    MONGO_URI = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///?replicaSet=rs0'
    client = create_mongo_client(MONGO_URI)
    db = client['Data_Entry_Incoming']
    collection = db['patient_data']

    try:
        print("🔍 Watching for new patient_data inserts...")
        with collection.watch([{'$match': {'operationType': 'insert'}}]) as stream:
            for change in stream:
                new_doc = change['fullDocument']
                mr_no = new_doc.get('Mr_no')
                if mr_no:
                    print(f"\n📥 New document detected for Mr_no: {mr_no}")
                    main(mr_no)
                else:
                    print("⚠️ Inserted document missing 'Mr_no'")
    except Exception as e:
        print(f"❌ Error in change stream: {e}")


if __name__ == "__main__":
    watch_new_patient_data()
