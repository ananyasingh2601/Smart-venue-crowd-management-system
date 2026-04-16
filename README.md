# StadiumPulse

StadiumPulse is a smart venue crowd management system focused on improving the live event experience for large sports venues. It combines a React frontend, a Fastify backend, live simulation data, and a chatbot that can use Google Gemini when configured.

## Chosen Vertical

The selected vertical is stadium and large-venue operations. The problem space is centered on helping attendees move through a venue with less friction by reducing uncertainty around crowding, food lines, restroom waits, exits, and emergency support.

## Approach And Logic

The solution is designed around real-time venue awareness. The backend simulates live stadium conditions and exposes them through REST and WebSocket endpoints. The frontend consumes that state to show crowd data, forecasts, alerts, and a chat interface that answers attendee questions in context.

The chatbot follows a layered approach:

1. It first tries to use Google Gemini for natural-language responses.
2. If the Gemini API key is missing or the request fails, it falls back to a local stadium-aware responder.
3. In both cases, the reply is grounded in current venue data such as wait times, densities, and quieter exits.

This gives the app a modern AI feel without making the experience dependent on an external service.

## How The Solution Works

The backend seeds a default live event and continuously updates state for each stadium section. That state includes density, food wait time, drink wait time, and bathroom wait time. REST endpoints expose snapshots, forecasts, SOS handling, and chat responses. WebSocket support streams live updates to the client.

The frontend is a single-page React app with pages for the venue map, crowd forecast, alerts, rewards, pitch view, and chat. The chat page submits a message to the backend, which either calls Gemini or generates a grounded fallback response from the current event state.

The overall flow is:

1. Live event state is generated in the backend.
2. The UI renders that state for the attendee.
3. The attendee asks the chatbot a question.
4. The backend combines the question with live venue context.
5. Gemini or the fallback responder returns a concise recommendation.

## Assumptions Made

- The venue is treated as a single live event with one active stadium model.
- Crowd and queue data are simulated, not pulled from real sensors.
- Google Gemini is optional and enabled through Vertex AI service-account auth in `backend/.env`.
- If Gemini is unavailable, the app should still work with the local fallback chatbot.
- REST API requests are expected to go to port 3001 and the Vite frontend to port 5173 during local development.
- The attendee experience is optimized for short, actionable answers rather than long-form conversation.

## Setup Notes

### Vertex AI Chatbot

The chatbot now prefers Google Vertex AI with service-account credentials. To enable it, set these values in `backend/.env`:

- `GOOGLE_CLOUD_PROJECT` or `FIREBASE_PROJECT_ID`
- `GOOGLE_CLOUD_LOCATION` such as `us-central1`
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to your service-account JSON file, or `FIREBASE_APPLICATION_CREDENTIALS` with the same path

The backend will use Vertex AI first and fall back to the built-in stadium responder if the credentials are missing or Vertex is unavailable.

### Firebase Alerts And Auth

Alerts now sync through Firebase Firestore and the frontend signs in anonymously through Firebase Auth when Firebase is configured. Add these values to your Vite environment before running the app:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

If Firebase is not configured, the UI falls back to the local demo alerts and the SOS flow still works against the backend memory store.

### What Changed

- Firebase Auth is used for anonymous session identity in the alerts flow.
- Firestore stores SOS alerts and chat transcripts from the backend.
- Vertex AI replaces the AI Studio API key flow for Gemini-style responses.
- Google Maps is already wired into the venue map screen for navigation.

## Go Live (Step By Step)

This app is now deployment-ready. You can publish it with:

- Backend on Render
- Frontend on Vercel

### 1. Push Code To GitHub

1. Create a GitHub repository.
2. Push this project to that repository.

### 2. Deploy Backend On Render

1. Open Render and click New Web Service.
2. Connect your GitHub repository.
3. Set Root Directory to `backend`.
4. Set Build Command to `npm install`.
5. Set Start Command to `npm start`.
6. Add environment variables from `backend/.env.example`.
7. For service-account auth, upload your JSON securely and set `GOOGLE_APPLICATION_CREDENTIALS` path according to your Render secret file setup, or map it through `FIREBASE_APPLICATION_CREDENTIALS`.
8. Deploy and copy your backend URL, for example `https://your-backend.onrender.com`.
9. Verify with `https://your-backend.onrender.com/api/v1/health`.

### 3. Deploy Frontend On Vercel

1. Open Vercel and click Add New Project.
2. Import the same GitHub repository.
3. Keep root as project root (not backend).
4. Framework preset should detect Vite.
5. Add environment variables from `.env.example`.
6. Set `VITE_API_BASE_URL` to your Render backend URL.
7. Deploy.

`vercel.json` is already included so React Router routes work on refresh.

### 4. Firebase Setup For Live Alerts

1. In Firebase Console, create a web app under your Firebase project.
2. Copy the Firebase web config values into Vercel environment variables.
3. In Firestore, create database (production or test mode as needed).
4. Ensure anonymous auth is enabled in Firebase Authentication.
5. Redeploy frontend after adding env vars.

### 5. Vertex AI Setup For Live Chat AI

1. In Google Cloud, enable Vertex AI API.
2. Create a service account with Vertex AI User role.
3. Generate a service-account key JSON.
4. Provide credentials securely to Render and set project/location env vars.
5. Redeploy backend.

### 6. Final End-To-End Check

1. Open frontend URL from Vercel.
2. Confirm map, forecast, and SOS actions work.
3. Open chat and verify responses.
4. Confirm backend logs show provider `gemini` when Vertex credentials are valid.
