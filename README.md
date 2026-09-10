# Hotel Rate Comparator

A clean, resilient hotel price comparison platform built with Node.js, Express, TypeScript, React, and Temporal. It queries multiple mock supplier APIs in parallel, normalizes their rate results, and determines the cheapest hotel offer.

---

## Features

- **Parallel Supplier Queries**: Queries Supplier A and Supplier B concurrently.
- **Resilient Comparison Engine**: Deterministic tie-breaking, single-supplier fallbacks, and handling of empty/errored supplier responses.
- **Scenario Simulation Dropdown**: Test 10 real-world supplier behaviors directly from the UI (normal operations, timeouts, transient 500 errors, partial outages, empty responses).
- **Dual Execution Engine**:
  - **Local Runner**: Lightweight execution without external infrastructure dependencies.
  - **Temporal Workflows**: Production-grade orchestration with retries, timeouts, and state persistence.
- **Comprehensive Test Suite**: Covers unit tests, reliability scenarios, and integration tests.

---

## Project Structure

```
hotel-price-comparator/
├── client/                # Frontend React + Vite application
│   ├── src/
│   │   ├── App.tsx        # Main UI component
│   │   ├── App.css        # Vanilla CSS styles
│   │   ├── api.ts         # Backend API client
│   │   └── types.ts       # Shared TypeScript types
│   └── package.json
│
├── server/                # Backend Express + Temporal server
│   ├── src/
│   │   ├── routes/        # Search & Mock Supplier API routes
│   │   ├── suppliers/     # Mock data generator & scenario definitions
│   │   ├── temporal/      # Workflows, activities, local runner, and comparison engine
│   │   ├── app.ts         # Express app configuration
│   │   └── index.ts       # Server entry point
│   ├── tests/             # Comprehensive unit & integration tests
│   └── package.json
│
├── EXPLANATION.md         # Detailed interview & architectural explanation
└── README.md              # Project documentation
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- npm (or pnpm/yarn)

### 2. Setup & Installation

Install dependencies for both server and client:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## Running the Application

### Option A: Running Development Mode (Recommended)

Start the Express backend server (Port 3001):
```bash
cd server
npm run dev
```

In a second terminal, start the React frontend client (Port 5173):
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### Option B: Running with Temporal (Optional)

If you have a local Temporal server running (`temporal server start-dev`):

1. Set environment variable when starting the server:
   ```bash
   cd server
   TEMPORAL_ADDRESS=localhost:7233 npm run dev
   ```

2. Start the Temporal Worker in a separate terminal:
   ```bash
   cd server
   npm run worker
   ```

---

## Running Tests

The backend includes tests covering comparison logic, activity retries/timeouts, and full integration scenarios.

Run all tests:
```bash
cd server
npm test
```

Run specific test files:
```bash
cd server
# Run unit tests for comparison logic (7 assignment scenarios)
npx tsx --test tests/comparison.test.ts

# Run reliability & advanced scenario tests (retries/timeouts)
npx tsx --test tests/suppliers.test.ts

# Run end-to-end integration tests
npx tsx --test tests/workflow.test.ts
```

