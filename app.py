from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)

# فایل JSON کلید سرویس
SERVICE_ACCOUNT_FILE = "service_lucky_471512.json"
SCOPES = ["https://www.googleapis.com/auth/calendar"]

# اعتبارنامه
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
service = build("calendar", "v3", credentials=credentials)

@app.route("/api/add_event", methods=["POST"])
def add_event():
    data = request.json
    event = {
        "summary": data["title"],
        "start": {"dateTime": data["start"], "timeZone": "Europe/Brussels"},
        "end": {"dateTime": data["end"], "timeZone": "Europe/Brussels"},
    }
    event = service.events().insert(calendarId="primary", body=event).execute()
    return jsonify({"id": event["id"], "status": "created"})

@app.route("/api/list_events", methods=["GET"])
def list_events():
    events_result = service.events().list(
        calendarId="primary", maxResults=10, singleEvents=True,
        orderBy="startTime"
    ).execute()
    events = events_result.get("items", [])
    return jsonify(events)

@app.route("/api/delete_event/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    try:
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
