# Quiz-Cap — AI-Driven Offline-First Digital Learning Platform

A full-stack web application for rural schools that allows students to access courses, take quizzes, and interact with an AI chatbot — even without internet connectivity. Results are synced automatically when the connection is restored.

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, React Router v6, Axios |
| Backend  | Spring Boot 3.2, Spring Security 6, Spring Data JPA |
| Database | MySQL 8 |
| Auth     | JWT (JJWT 0.12.5) + BCrypt |
| Offline  | IndexedDB (browser-native) |

---

## Project Structure

```
Quiz-Cap/
├── schema.sql          ← MySQL DDL + seed data
├── backend/            ← Spring Boot Maven project
│   ├── pom.xml
│   └── src/main/java/com/quizcap/
│       ├── config/     ← SecurityConfig, JwtAuthFilter
│       ├── controller/ ← Auth, Course, Quiz, Progress, Sync, Ai
│       ├── service/    ← Business logic
│       ├── repository/ ← JPA repositories
│       ├── model/      ← JPA entities
│       ├── dto/        ← Request/Response objects
│       ├── exception/  ← GlobalExceptionHandler
│       └── util/       ← JwtUtil
└── frontend/           ← React application
    ├── package.json
    └── src/
        ├── pages/      ← Login, Register, Dashboard, Courses, Quiz, Chatbot
        ├── components/ ← Navbar, OfflineBanner, ProtectedRoute
        ├── services/   ← Axios API calls
        └── utils/      ← IndexedDB wrapper, sync manager
```

---

## Prerequisites

- Java 17+
- Node.js 18+ and npm
- MySQL 8+
- Maven 3.8+

---

## Setup Instructions

### Step 1 — Database

1. Start your MySQL server.
2. Run the schema file:
   ```bash
   mysql -u root -p < schema.sql
   ```
   This creates the `quizcap_db` database, all tables, and seeds sample data.

3. Seed user passwords (both accounts below use password `Admin@123`):
   - **admin** (role: ADMIN)
   - **teacher1** (role: TEACHER)

   > To use a different password, generate a BCrypt hash and update the seed INSERT.

### Step 2 — Backend

1. Open `backend/src/main/resources/application.properties`.
2. Update the database password:
   ```properties
   spring.datasource.password=YOUR_MYSQL_PASSWORD
   ```
3. (Optional) Generate a secure JWT secret:
   ```bash
   openssl rand -base64 32
   ```
   Paste the output into `jwt.secret`.

4. Start the backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
   The API server starts on **http://localhost:8080**.

### Step 3 — Frontend

```bash
cd frontend
npm install
npm start
```

The React dev server starts on **http://localhost:3000** and proxies API calls to port 8080.

---

## API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ username, email, password }` | Create student account |
| POST | `/api/auth/login`    | `{ username, password }` | Login → returns JWT |

### Courses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/courses` | JWT | List all courses |
| GET | `/api/courses/{id}` | JWT | Course with lessons |

### Quizzes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/quizzes/lesson/{lessonId}` | JWT | Questions (no answers) |
| POST | `/api/quizzes/submit` | JWT | `{ lessonId, answers }` → score |

### Progress
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/progress/me` | JWT | Result history |
| GET | `/api/progress/me/summary` | JWT | Stats for Dashboard |

### Sync
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sync/results` | JWT | Upload offline results |

### Chatbot
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chatbot/ask` | Public | Ask a question |
| GET  | `/api/chatbot/faq` | Public | All FAQ entries (for cache) |

---

## Offline-First Architecture

### How it works

```
                    ┌────────────────────────────────────┐
                    │           React Frontend           │
                    │                                    │
   Online ──────────►  API Call via Axios                │
                    │       ↓ success                    │
   Offline ─────────►  Save to IndexedDB                 │
                    │   { synced: false }                │
                    └──────────────┬─────────────────────┘
                                   │ window 'online' event
                                   ▼
                    ┌────────────────────────────────────┐
                    │         syncManager.js             │
                    │  POST /api/sync/results            │
                    │  (idempotent upsert on server)     │
                    └────────────────────────────────────┘
```

### IndexedDB stores
| Store | Purpose |
|-------|---------|
| `pendingResults` | Quiz results awaiting sync (`synced: false`) |
| `courses` | Cached course/lesson data for offline reading |
| `faq` | FAQ entries for offline chatbot keyword matching |

### Chatbot modes
| Mode | Behaviour |
|------|-----------|
| Online | Sends request to `POST /api/chatbot/ask` |
| Offline | Matches keywords from IndexedDB `faq` store |

---

## Default Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | ADMIN |
| teacher1 | Admin@123 | TEACHER |

Register any new account via the Register page to get a STUDENT account.

---

## Testing the Offline Feature

1. Log in (ensures FAQ and courses are cached in IndexedDB).
2. Open **DevTools → Network → Offline** to simulate no connectivity.
3. Browse the Courses page — cached courses still appear.
4. Take a quiz — upon submit, answers are saved locally (score shows as `?`).
5. Open **DevTools → Application → IndexedDB → quizcap_offline → pendingResults** to verify the saved record.
6. Restore network in DevTools.
7. The sync fires automatically — check the console for `[SyncManager] Sync complete`.
8. Visit the Dashboard to see the result appear in your history.
