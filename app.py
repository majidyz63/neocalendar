from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os, json, traceback

app = Flask(__name__)

# ✅ فقط اجازه به Vercel + Local
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://127.0.0.1:5000",
            "http://localhost:5000",
            "https://neocalendar.vercel.app"
        ]
    }
})

# === Load Google Service Account ===
SCOPES = ["https://www.googleapis.com/auth/calendar"]

def get_calendar_service():
    try:
        # Service Account JSON از Environment (نه فایل)
        service_account_info = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=SCOPES
        )
        service = build("calendar", "v3", credentials=creds)
        return service
    except Exception as e:
        print("❌ Failed to load service account:", e)
        traceback.print_exc()
        raise

@app.route("/")
def home():
    return "✅ NeoCalendar Backend is running"

# === API: Add Event ===
@app.route("/api/add_event", methods=["POST"])
def add_event():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        start = data.get("start")
        end = data.get("end")
        title = data.get("title", "Untitled Event")

        if not start or not end:
            return jsonify({"error": "Missing start or end datetime"}), 400

        event = {
            "summary": title,
            "start": {"dateTime": start, "timeZone": "Europe/Brussels"},
            "end": {"dateTime": end, "timeZone": "Europe/Brussels"}
        }

        service = get_calendar_service()
        created = service.events().insert(calendarId="primary", body=event).execute()

        print("✅ Event created:", created)
        return jsonify({"id": created["id"], "htmlLink": created.get("htmlLink")})

    except Exception as e:
        print("🔥 Error in /api/add_event:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# === API: Delete Event ===
@app.route("/api/delete_event/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    try:
        service = get_calendar_service()
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        print(f"🗑️ Event {event_id} deleted from Google Calendar")
        return jsonify({"status": "deleted", "id": event_id})
    except Exception as e:
        print("🔥 Error in /api/delete_event:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
