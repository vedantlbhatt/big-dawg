# SignalLayer React Frontend

Replace the Streamlit UI with this React app. Same layout: market discovery, sidebar selection, Analyze Market, three metric cards, price chart, Intelligence Chat.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Without backend

The app runs with **mock data** if `VITE_API_URL` is not set: mock markets, mock analysis on "Analyze Market", and a placeholder chat message. Use this to build and style the UI.

## With backend

1. Expose a small API that the Python logic can back (e.g. FastAPI/Flask):
   - `GET /api/markets` → list of markets (event_title, question, slug, volume, conditionId)
   - `POST /api/analyze` body `{ "target": "<conditionId or slug>" }` → analysis result (integrity_res, info_res, conf_res, price_series, market_name, trades_count)
   - `POST /api/chat` body `{ integrity_res, info_res, conf_res, message, history }` → `{ "response": "..." }`

2. Create `.env` in `frontend/`:
   ```
   VITE_API_URL=http://localhost:8000
   ```

3. Run the backend and then `npm run dev`. The app will call the API for markets, analyze, and chat.

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or your backend.
