# AgriLink

AgriLink is a full-stack agri-commerce platform built to connect farmers and buyers directly while adding AI-powered market intelligence and lot-level traceability.

The project combines:

- A React + Vite frontend for farmers and buyers
- A Node.js + Express + MongoDB backend for authentication, listings, orders, sockets, and traceability
- A FastAPI-based ML service for price prediction, demand forecasting, export premium analysis, compliance checks, and export readiness

## What Problem It Solves

AgriLink is designed to reduce friction between producers and buyers by giving both sides better visibility and better tools:

- Farmers can create produce listings and access AI-assisted pricing signals
- Buyers can browse listings, place orders, and verify product trace history
- Each lot gets a traceability chain and QR-linked history
- Export-oriented intelligence helps estimate readiness, compliance, and potential premium

## Core Features

- Role-based authentication for `farmer` and `buyer`
- Farmer listing creation with quantity, grade, price, location, and APEDA status
- Buyer marketplace with filters and direct order placement
- Real-time socket notifications for new listings and order updates
- Hash-chain-based lot traceability with verification and repair endpoints
- QR code generation for traceable produce lots
- AI price prediction for supported crops
- Demand forecasting
- Export premium estimation
- Compliance checking
- Export readiness scoring
- Health endpoints for backend and ML service

## Project Structure

```text
Agri-Link/
|-- backend/        Express API + MongoDB + Socket.IO
|-- frontend/       React + Vite client
|-- ml-service/     FastAPI ML microservice
|-- .gitignore
`-- README.md
```

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Axios
- Framer Motion
- Socket.IO Client

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Cookie-based refresh token flow
- Socket.IO
- Multer

### ML Service

- Python
- FastAPI
- Uvicorn
- Pandas
- NumPy
- scikit-learn
- XGBoost

## How The System Works

1. The frontend talks to the backend API.
2. The backend manages users, listings, orders, traceability, QR generation, and sockets.
3. For AI-related features, the backend forwards requests to the ML service.
4. The ML service loads trained model files from `ml-service/models/` and returns predictions or analysis.
5. Trace events are stored as a hash chain so buyers can verify a lot's integrity.

## Prerequisites

Install these before running the project:

- Node.js 18+ recommended
- npm
- Python 3.10+ recommended
- MongoDB running locally or a MongoDB Atlas connection string

## Environment Variables

The backend expects a `.env` file inside the `backend/` directory.

Note: the backend appends the database name `Agri-Link` automatically, so `MONGODB_URI` should usually be the server URL only.

Create `backend/.env` with values like:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

The frontend can optionally use a `.env` file inside `frontend/`.

Create `frontend/.env` if you want to override the API URL:

```env
VITE_API_URL=http://localhost:5000
```

## Installation

Install dependencies for each service separately.

### 1. Install frontend dependencies

```powershell
cd frontend
npm install
```

### 2. Install backend dependencies

```powershell
cd backend
npm install
```

### 3. Install ML service dependencies

```powershell
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

If you already use a global Python environment, the virtual environment step is optional but recommended.

## How To Run The Project

Run the three services in separate terminals.

### Terminal 1: Start the ML service

```powershell
cd ml-service
.venv\Scripts\activate
python main.py
```

The ML service runs on:

```text
http://localhost:8000
```

### Terminal 2: Start the backend

```powershell
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### Terminal 3: Start the frontend

```powershell
cd frontend
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Recommended Startup Order

Start services in this order:

1. MongoDB
2. ML service
3. Backend
4. Frontend

This helps avoid startup errors when the backend tries to call the ML service or connect to MongoDB.

## Available Scripts

### Frontend

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

### Backend

```powershell
npm run dev
```

### ML Service

```powershell
python main.py
```

## Main Application Flows

### Farmer flow

- Register or log in as a farmer
- Create produce listings
- View own listings
- See order activity
- Use AI price and demand insights
- Generate QR-linked traceability for lots
- Check export readiness

### Buyer flow

- Register or log in as a buyer
- Browse available listings
- Filter by crop, grade, and city
- Place orders directly
- Track order history
- Verify lot traceability using lot ID / QR flow

## Important API Endpoints

### Backend health

- `GET /health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Listings

- `POST /api/listings`
- `GET /api/listings`
- `GET /api/listings/my`

### Orders

- `POST /api/orders`
- `GET /api/orders/my`
- `PATCH /api/orders/:id/status`

### Traceability

- `GET /api/trace/:lotId`
- `GET /api/trace/:lotId/verify`
- `POST /api/trace/:lotId/repair`

### ML routes exposed through backend

- `GET /api/ml/health`
- `GET /api/ml/predict-price`
- `GET /api/ml/demand-forecast`
- `GET /api/ml/export-premium`
- `GET /api/ml/compliance-check`
- `POST /api/ml/grade`
- `POST /api/ml/export-readiness`

## ML Service Endpoints

The FastAPI service directly exposes:

- `GET /health`
- `GET /predict-price`
- `GET /demand-forecast`
- `GET /export-premium`
- `GET /compliance-check`
- `POST /grade`
- `POST /export-readiness`

## Data And Model Notes

- Trained model files are stored in `ml-service/models/`
- Additional static data is stored in JSON files inside `ml-service/`
- The ML service checks for required model files at startup
- If model files are missing, the service may start with warnings but prediction features can fail

## Troubleshooting

### Backend does not start

Check:

- `backend/.env` exists
- `MONGODB_URI` is valid
- MongoDB is running
- JWT secrets are present

### Frontend cannot call API

Check:

- `VITE_API_URL` points to the backend
- `FRONTEND_URL` in backend `.env` matches the frontend URL
- Backend is running on port `5000`

### ML features fail

Check:

- ML service is running on port `8000`
- `ML_SERVICE_URL` in backend `.env` is correct
- Python dependencies are installed
- Model files exist in `ml-service/models/`

### CORS or auth issues

Check:

- `FRONTEND_URL` exactly matches the frontend origin
- Cookies are enabled in the browser
- Backend and frontend are both running

## Current Notes

- The backend currently uses a development script with `nodemon`
- The frontend already includes a local `frontend/README.md`, but this root README is the main project guide
- The ML grading route currently returns placeholder grading output according to the service code

## Future Improvements

- Add production deployment instructions
- Add Docker setup for all services
- Add sample `.env.example` files
- Add test instructions and CI pipeline details
- Add API documentation with request and response examples

## License

No license file is currently present in the repository. Add one if you want to define reuse terms explicitly.
