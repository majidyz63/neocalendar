from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)
CORS(app)  # اجازه میده فرانت (Vercel) بتونه API رو صدا بزنه

# 🔑 بارگذاری Service Account از فایل JSON
# بهتره اسم فایل رو به جای هاردکد، با ENV بخونی
SERVICE_ACCOUNT_FILE = "service_lucky_471512.json"

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=["https://www.googleapis.com/auth/calendar"]
)


# 📌 Route: افزودن ایونت
@app.route("/api/add_event", methods=["POST"])
def add_event():
    data = request.json
    title = data.get("title")
    start = data.get("start")
    end = data.get("end")

    if not title or not start or not end:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        service = build("calendar", "v3", credentials=creds)
        event = {
            "summary": title,
            "start": {"dateTime": start, "timeZone": "UTC"},
            "end": {"dateTime": end, "timeZone": "UTC"},
        }
        created_event = service.events().insert(calendarId="primary", body=event).execute()
        return jsonify({"id": created_event["id"], "status": "created"})
    except Exception as e:
        import traceback
        print("🔥 Google Calendar API Error:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# 📌 Route: حذف ایونت
@app.route("/api/delete_event/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    try:
        service = build("calendar", "v3", credentials=creds)
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
