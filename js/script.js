document.addEventListener("DOMContentLoaded", () => {
    // === Global Variables ===
    let quickRecorder, quickChunks = [], quickRecording = false;
    let accessToken = null;

    const calendarEl = document.getElementById('calendar');
    const monthYearEl = document.getElementById('monthYear');
    const modal = document.getElementById('eventModal');
    const eventListEl = document.getElementById('eventList');
    const addEventBtn = document.getElementById('addEventBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const alarmSound = document.getElementById('alarmSound');
    const stopAlarmBtn = document.getElementById('stopAlarm');
    const alarmControls = document.getElementById('alarmControls');

    let currentDate = new Date();
    let selectedDate = null;
    let events = JSON.parse(localStorage.getItem('events') || '[]');

    // === Google Login ===
    window.handleCredentialResponse = function () {
        google.accounts.oauth2.initTokenClient({
            client_id: "612704855594-32ghok7gs8hivenjb7dvpde0uu4hre73.apps.googleusercontent.com",
            scope: "https://www.googleapis.com/auth/calendar.events",
            callback: (tokenResponse) => {
                accessToken = tokenResponse.access_token;
                console.log("✅ Access Token:", accessToken);
                alert("Signed in with Google successfully!");
            }
        }).requestAccessToken();
    };

    // === Local Storage ===
    function saveEvents() {
        localStorage.setItem('events', JSON.stringify(events));
    }

    // === Google Calendar Sync ===
    async function saveEventToGoogle(ev) {
        if (!accessToken) {
            alert("⚠️ Please sign in with Google first.");
            return;
        }

        const startDate = new Date(ev.datetime);
        const endDate = new Date(startDate.getTime() + 60 * 60000);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const body = {
            summary: ev.title,
            start: { dateTime: startDate.toISOString(), timeZone },
            end: { dateTime: endDate.toISOString(), timeZone },
            reminders: {
                useDefault: false,
                overrides: [{ method: "popup", minutes: ev.reminder || 0 }]
            }
        };

        try {
            let resp, data;
            if (ev.gcalId) {
                resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.gcalId}`, {
                    method: "PATCH",
                    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
            } else {
                resp = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
            }
            if (!resp.ok) throw new Error(await resp.text());
            data = await resp.json();
            ev.gcalId = data.id;
            saveEvents();
            console.log("📅 Event synced with Google Calendar:", data);
            alert("✅ Event saved to Google Calendar!");
        } catch (err) {
            console.error("❌ Error saving to Google Calendar:", err);
            alert("❌ Failed to save event to Google Calendar.");
        }
    }

    // === Reminders ===
    function scheduleReminder(ev) {
        const eventTime = new Date(ev.datetime).getTime();
        const remindTime = eventTime - (ev.reminder * 60000);
        const now = Date.now();
        if (ev.reminder > 0 && remindTime > now) {
            const delay = remindTime - now;
            setTimeout(() => triggerReminder(ev), delay);
        }
    }

    function triggerReminder(ev) {
        if (Notification.permission === 'granted') {
            new Notification('Event Reminder', { body: `${ev.title} at ${new Date(ev.datetime).toLocaleString()}` });
        }
        alarmSound.play();
        alarmControls.style.display = 'block';
    }

    stopAlarmBtn.onclick = () => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
        alarmControls.style.display = 'none';
    };

    // === Calendar Render ===
    function toLocalDatetimeValue(date) {
        const pad = n => n.toString().padStart(2, '0');
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function renderCalendar() {
        calendarEl.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        monthYearEl.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(d => {
            const div = document.createElement('div');
            div.className = 'day-name';
            div.textContent = d;
            calendarEl.appendChild(div);
        });

        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'day';
            div.style.visibility = 'hidden';
            calendarEl.appendChild(div);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const div = document.createElement('div');
            div.className = 'day';
            div.textContent = d;
            const thisDate = new Date(year, month, d);
            if (thisDate.toDateString() === new Date().toDateString()) div.classList.add('today');
            const dayEvents = events.filter(e => new Date(e.datetime).toDateString() === thisDate.toDateString());
            if (dayEvents.length > 0) div.classList.add('has-event');
            div.onclick = () => openModal(thisDate);
            calendarEl.appendChild(div);
        }
    }

    function openModal(date) { selectedDate = date; modal.style.display = 'flex'; renderEvents(); }
    function closeModal() { modal.style.display = 'none'; }

    function renderEvents() {
        eventListEl.innerHTML = '';
        const dayEvents = events.filter(e => new Date(e.datetime).toDateString() === selectedDate.toDateString());
        if (dayEvents.length === 0) {
            eventListEl.innerHTML = '<p>No events.</p>';
        } else {
            dayEvents.forEach((ev) => {
                const div = document.createElement('div');
                div.className = 'event';
                div.innerHTML = `
                    <b>${ev.title}</b><br>
                    ${new Date(ev.datetime).toLocaleString()}<br>
                    Reminder: ${ev.reminder} min before<br>
                    <button class="btn-edit">✏️ Edit</button>
                    <button class="btn-delete">❌ Delete</button>
                    <button class="btn-add">📅 ${ev.gcalId ? "Update" : "Export"}</button>
                `;
                div.querySelector('.btn-edit').onclick = () => editEvent(ev);
                div.querySelector('.btn-delete').onclick = () => deleteEvent(ev);
                div.querySelector('.btn-add').onclick = () => saveEventToGoogle(ev);
                eventListEl.appendChild(div);
            });
        }
    }

    // === Add Event ===
    function addEvent() {
        const form = document.createElement('form');
        const defaultDateTime = new Date(selectedDate);
        form.innerHTML = `
            <h3>Add/Edit Event</h3>
            <label>Title<input type="text" name="title" required></label>
            <label>Date/Time<input type="datetime-local" name="datetime" value="${toLocalDatetimeValue(defaultDateTime)}"></label>
            <label>Reminder<select name="reminder">
                <option value="0">No reminder</option>
                <option value="5">5 min before</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
            </select></label>
            <button type="submit" class="btn-add">💾 Save</button>
            <button type="button" id="saveExportBtn" class="btn-add">💾 Save + 📅 Google Calendar</button>
        `;
        eventListEl.innerHTML = '';
        eventListEl.appendChild(form);

        form.onsubmit = (e) => {
            e.preventDefault();
            const newEvent = {
                id: Date.now(),
                title: form.querySelector('[name=title]').value,
                datetime: form.querySelector('[name=datetime]').value,
                reminder: parseInt(form.querySelector('[name=reminder]').value)
            };
            if (!newEvent.datetime) { alert("Please select a valid date & time"); return; }
            events.push(newEvent); saveEvents(); scheduleReminder(newEvent);
            renderEvents(); renderCalendar();
        };

        document.getElementById("saveExportBtn").onclick = () => {
            const newEvent = {
                id: Date.now(),
                title: form.querySelector('[name=title]').value,
                datetime: form.querySelector('[name=datetime]').value,
                reminder: parseInt(form.querySelector('[name=reminder]').value)
            };
            if (!newEvent.datetime) { alert("Please select a valid date & time"); return; }
            events.push(newEvent); saveEvents(); scheduleReminder(newEvent);
            renderEvents(); renderCalendar();
            saveEventToGoogle(newEvent);
        };
    }

    // === Edit Event ===
    function editEvent(ev) {
        const form = document.createElement('form');
        form.innerHTML = `
            <h3>Edit Event</h3>
            <label>Title<input type="text" name="title" value="${ev.title}" required></label>
            <label>Date/Time<input type="datetime-local" name="datetime" value="${toLocalDatetimeValue(new Date(ev.datetime))}"></label>
            <label>Reminder<select name="reminder">
                <option value="0">No reminder</option>
                <option value="5">5 min before</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
            </select></label>
            <button type="submit" class="btn-add">💾 Save</button>
            <button type="button" id="editExportBtn" class="btn-add">💾 Save + 📅 Google Calendar</button>
        `;
        form.querySelector('[name=reminder]').value = ev.reminder;
        eventListEl.innerHTML = ''; eventListEl.appendChild(form);

        form.onsubmit = (e) => {
            e.preventDefault();
            ev.title = form.querySelector('[name=title]').value;
            ev.datetime = form.querySelector('[name=datetime]').value;
            ev.reminder = parseInt(form.querySelector('[name=reminder]').value);
            saveEvents(); scheduleReminder(ev); renderEvents(); renderCalendar();
        };

        document.getElementById("editExportBtn").onclick = () => {
            ev.title = form.querySelector('[name=title]').value;
            ev.datetime = form.querySelector('[name=datetime]').value;
            ev.reminder = parseInt(form.querySelector('[name=reminder]').value);
            saveEvents(); scheduleReminder(ev); renderEvents(); renderCalendar();
            saveEventToGoogle(ev);
        };
    }

    // === Delete Event ===
    function deleteEvent(ev) {
        events = events.filter(e => e.id !== ev.id);
        saveEvents(); renderEvents(); renderCalendar();

        if (ev.gcalId && accessToken) {
            fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.gcalId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${accessToken}` }
            }).then(resp => {
                if (resp.status === 204) console.log(`🗑️ Event ${ev.gcalId} deleted from Google Calendar`);
            });
        }
    }

    // === All Events Modal ===
    const allEventsModal = document.getElementById('allEventsModal');
    const allEventsList = document.getElementById('allEventsList');
    const searchInput = document.getElementById('searchInput');

    document.getElementById('allEventsBtn').onclick = () => { renderAllEvents(); allEventsModal.style.display = 'flex'; };
    document.getElementById('closeAllEvents').onclick = () => { allEventsModal.style.display = 'none'; };

    function renderAllEvents(filter = "") {
        allEventsList.innerHTML = '';
        let list = [...events].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        if (filter) list = list.filter(ev => ev.title.toLowerCase().includes(filter.toLowerCase()));
        if (list.length === 0) { allEventsList.innerHTML = '<p>No events.</p>'; return; }
        list.forEach(ev => {
            const div = document.createElement('div');
            div.className = 'event';
            div.innerHTML = `<b>${ev.title}</b><br>
                ${new Date(ev.datetime).toLocaleString()}<br>
                Reminder: ${ev.reminder} min<br>
                <button class="btn-edit">✏️ Edit</button>
                <button class="btn-delete">❌ Delete</button>
                <button class="btn-add">📅 ${ev.gcalId ? "Update" : "Export"}</button>`;
            div.querySelector('.btn-edit').onclick = () => { selectedDate = new Date(ev.datetime); allEventsModal.style.display = 'none'; modal.style.display = 'flex'; editEvent(ev); };
            div.querySelector('.btn-delete').onclick = () => { deleteEvent(ev); renderAllEvents(filter); };
            div.querySelector('.btn-add').onclick = () => saveEventToGoogle(ev);
            allEventsList.appendChild(div);
        });
    }
    searchInput.oninput = () => renderAllEvents(searchInput.value);

    // === Voice Quick Add ===
    const quickBtn = document.getElementById("voiceQuickBtn");
    if (quickBtn) quickBtn.addEventListener("click", toggleQuickVoiceRecording);

    async function toggleQuickVoiceRecording() {
        if (!quickRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                quickRecorder = new MediaRecorder(stream);
                quickChunks = [];
                quickRecorder.ondataavailable = e => { if (e.data.size > 0) quickChunks.push(e.data); };
                quickRecorder.onstop = async () => {
                    const audioBlob = new Blob(quickChunks, { type: "audio/webm" });
                    await sendQuickVoiceEvent(audioBlob);
                };
                quickRecorder.start();
                quickRecording = true;
                quickBtn.textContent = "⏹ Stop Recording";
                quickBtn.classList.add("recording");
            } catch (err) {
                console.error("Mic error:", err);
                alert("Microphone not available.");
            }
        } else {
            if (quickRecorder && quickRecorder.state !== "inactive") quickRecorder.stop();
            quickRecording = false;
            quickBtn.textContent = "🎙️ Voice Quick Add";
            quickBtn.classList.remove("recording");
        }
    }

    async function sendQuickVoiceEvent(audioBlob) {
        try {
            quickBtn.disabled = true;
            quickBtn.textContent = "⏳ Processing...";
            const lang = document.getElementById("voiceLang").value;
            const formData = new FormData();
            formData.append("file", audioBlob, "quick_recording.webm");
            formData.append("lang", lang);
            const resp = await fetch("https://shared-deborah-neoprojects-65e1dc36.koyeb.app/api/voice_event", {

                method: "POST",
                body: formData
            });
            const data = await resp.json();
            if (!resp.ok || !data.datetime) throw new Error("Invalid response");
            if (data.reminder === undefined || data.reminder === null) data.reminder = 0;
            events.push(data); saveEvents(); scheduleReminder(data); renderEvents(); renderCalendar();
            alert("✅ Event added from quick voice!");
        } catch (err) {
            console.error("Voice quick error:", err);
            alert("❌ Error creating quick voice event.");
        } finally {
            quickBtn.disabled = false;
            quickBtn.textContent = "🎙️ Voice Quick Add";
            quickBtn.classList.remove("recording");
        }
    }

    // === Navigation ===
    addEventBtn.onclick = addEvent;
    closeModalBtn.onclick = closeModal;
    document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };

    // === Enable Notifications Button ===
    document.getElementById("enableNotiBtn").onclick = () => {
        if (Notification.permission !== 'granted') Notification.requestPermission();
        alert("🔔 Notifications enabled (if allowed).");
    };

    // === Init ===
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
    events.forEach(scheduleReminder);
    renderCalendar();
});
