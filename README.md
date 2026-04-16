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
- Google Gemini is optional and enabled through an API key in `backend/.env`.
- If Gemini is unavailable, the app should still work with the local fallback chatbot.
- REST API requests are expected to go to port 3001 and the Vite frontend to port 5173 during local development.
- The attendee experience is optimized for short, actionable answers rather than long-form conversation.

## Setup Notes

To enable Gemini, add a valid Google AI Studio key to `backend/.env` as `GOOGLE_GEMINI_API_KEY`. If that value is left empty, the chatbot will continue using the built-in fallback responder.
