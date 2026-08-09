# ClassIntel: Final Year CSE Project Defense & Viva Guide

Welcome to the **ClassIntel** Project Defense & Viva Guide. This document is designed specifically for Computer Science & Engineering (CSE) final year project presentations, technical vivas, and code review interviews.

It details the **system architecture**, **database schemas**, **mathematical NLP algorithms**, **search & retrieval engines**, and provides **25 direct answers to common viva questions**.

---

## 1. Project Abstract & Core Objectives

### Abstract
**ClassIntel** is a web-based **Automated Lecture Feedback & Academic Intelligence Platform**. In traditional educational institutions, student feedback is collected manually via paper forms or static surveys, which are time-consuming to aggregate and fail to provide actionable insights. ClassIntel digitizes the entire academic feedback lifecycle. It integrates:
1. **Real-Time Student Feedback & QR Code Access**: Rapid student submission for lectures.
2. **Lexicon-Based Natural Language Processing (NLP)**: Automated sentiment analysis & topic clustering without external third-party API costs or latency.
3. **Information Retrieval (IR) & Course Document Search**: In-memory sliding-window chunking and term-frequency vector search over uploaded lecture materials.
4. **Predictive Educational Analytics & At-Risk Student Forecasting**: Multi-factor weighted heuristic scoring to identify struggling students early.
5. **Interactive Learning & Assessment**: Quizzes, attendance management, assignments, and Web Speech API live lecture transcription.

---

## 2. System Architecture & Tech Stack

```
 ┌─────────────────────────────────────────────────────────┐
 │                   Frontend Layer                        │
 │  React 18 + TypeScript + Vite + Tailwind CSS            │
 │  TanStack Query (Data Fetching) + Wouter (Routing)      │
 └────────────────────────────┬────────────────────────────┘
                              │ REST APIs (JSON / JWT)
 ┌────────────────────────────▼────────────────────────────┐
 │                   Backend Layer                         │
 │  Node.js + Express Framework + TypeScript               │
 │  Custom NLP & IR Engine (intelligence.ts)               │
 └────────────────────────────┬────────────────────────────┘
                              │ Mongoose ODM
 ┌────────────────────────────▼────────────────────────────┐
 │                   Database Layer                        │
 │  MongoDB Database (Collections: Users, Feedbacks, Docs) │
 └─────────────────────────────────────────────────────────┘
```

### Technical Stack Rationale

| Component | Technology | Technical Justification |
| :--- | :--- | :--- |
| **Frontend** | React 18 & Vite | Fast virtual DOM rendering, modular component architecture, lightning-fast HMR build times. |
| **Language** | TypeScript | Strong static typing ensures contract adherence between backend APIs and frontend UI props. |
| **Styling** | Tailwind CSS & Shadcn UI | Utility-first responsive design, consistent design system, accessible UI primitives. |
| **Backend** | Node.js & Express.js | Event-driven, non-blocking asynchronous I/O ideal for high concurrency API requests. |
| **Database** | MongoDB & Mongoose | Flexible JSON-like document store; handles dynamic schema fields for feedback analytics. |
| **Auth** | JWT & Bcrypt.js | Stateless authentication via HTTP Bearer tokens; secure password hashing with salt rounds. |
| **Document Processing** | `pdf-parse` & Multer | Server-side stream buffer extraction of text from uploaded course materials. |

---

## 3. Database Schema Architecture

Located in [`backend/shared/schema.ts`](file:///d:/ClassIntel/backend/shared/schema.ts), the database is structured into 9 core collections:

1. **`UserModel` (`users`)**:
   - `_id`, `name`, `email`, `password` (hashed with bcrypt), `role` (`student` | `teacher` | `admin`), `department`.
2. **`TeacherModel` (`teachers`)**:
   - `_id`, `name`, `subject`, `department`, `averageRating`, `totalFeedback`.
3. **`FeedbackModel` (`feedbacks`)**:
   - `_id`, `studentId`, `teacherId`, `rating` (1–5 stars), `comment`, `createdAt`.
4. **`CourseDocumentModel` (`course_documents`)**:
   - `_id`, `teacherId`, `title`, `subject`, `content` (full text), `chunks` (JSON array of 500-char windowed strings).
5. **`RagChatModel` (`rag_chats`)**:
   - `_id`, `userId`, `question`, `answer`, `sources` (JSON array of matched chunks), `subject`.
6. **`StudentRiskModel` (`student_risks`)**:
   - `_id`, `teacherId`, `studentName`, `riskLevel` (`low` \| `medium` \| `high`), `riskScore` (0–100), `attendance`, `marks`, `engagementScore`.
7. **`QuizModel` (`quizzes`)**:
   - `_id`, `title`, `subject`, `questions` (Array of `{ question, options, correctAnswerIndex }`), `durationMinutes`.
8. **`AttendanceModel` (`attendance`)**:
   - `_id`, `teacherId`, `subject`, `date`, `presentStudents` (array of student IDs).
9. **`ActionItemModel` (`action_items`)**:
   - `_id`, `teacherId`, `action`, `priority` (`low` \| `medium` \| `high`), `status` (`pending` \| `completed`).

---

## 4. Line-by-Line CSE Algorithm Walkthroughs

### Algorithm 1: Lexicon-Based Sentiment Analysis
**File**: [`backend/intelligence.ts`](file:///d:/ClassIntel/backend/intelligence.ts#L100-L185)

#### Core Logic:
1. **Preprocessing & Tokenization**: Converts input string to lowercase, strips punctuation/numbers using regex `/[^\w\s]/g`, and filters against a 125-word `STOPWORDS` Set.
2. **Lexicon Matching**: Scans tokens against `POSITIVE_EDU_WORDS` (weights $+0.15$ to $+0.40$) and `NEGATIVE_EDU_WORDS` (weights $-0.15$ to $-0.40$).
3. **Polarity Score Computation**:
   $$\text{DomainScore} = \sum w_{\text{pos}} + \sum w_{\text{neg}}$$
   $$\text{Polarity} = \max(-1.0, \min(1.0, \text{DomainScore}))$$
4. **Probability Normalization**:
   Maps polarity to class probabilities ($P_{\text{pos}}, P_{\text{neg}}, P_{\text{neu}}$) normalized to satisfy:
   $$\sum P_i = P_{\text{pos}} + P_{\text{neg}} + P_{\text{neu}} = 1.0$$

---

### Algorithm 2: Multi-Cluster Topic Extraction
**File**: [`backend/intelligence.ts`](file:///d:/ClassIntel/backend/intelligence.ts#L329-L379)

#### Core Logic:
Matches tokenized feedback text against 10 domain clusters: `pace`, `clarity`, `examples`, `engagement`, `content`, `assessment`, `communication`, `resources`, `support`, `organization`.

- **Match Score**: Multi-word match $= +2$, Single-word boundary match `\b word \b` $= +1$.
- **Confidence Score**:
  $$\text{Confidence} = \min\left(1.0, \frac{\text{MatchScore}}{3}\right)$$

---

### Algorithm 3: Sliding Window Chunking & Document IR Vector Search
**File**: [`backend/routes/academic-services.ts`](file:///d:/ClassIntel/backend/routes/academic-services.ts#L1070-L1185)

#### Core Logic:
1. **Document Chunking (Sliding Window)**:
   - Window size $W = 500$ characters.
   - Step overlap $O = 100$ characters.
   - For document length $L$, chunks are generated at step interval $S = W - O = 400$ chars.
2. **In-Memory Information Retrieval (IR) Vector Search**:
   - **Query Preprocessing**: Lowercases query, splits into words, removes search stopwords (`SEARCH_STOPWORDS`).
   - **Scoring**: For each indexed chunk, score increases by $+1$ for every query term found, plus $+0.5$ bonus if matched within the chunk header (first 80 chars).
   - **Relevance Percentage**:
     $$\text{RelevanceScore} = \text{Math.round}\left(\frac{\text{ChunkScore}}{\text{TotalQueryWords}} \times 100\right)$$
   - **Context Extraction**: Sorts chunks descending by score and returns top 5 relevant document snippets.

---

### Algorithm 4: At-Risk Student Multi-Factor Heuristic Model
**File**: [`backend/routes/academic-services.ts`](file:///d:/ClassIntel/backend/routes/academic-services.ts#L888-L925)

#### Core Logic:
Calculates a composite academic risk score based on three key performance metrics: Attendance ($A$), Quiz Marks ($M$), and Class Engagement ($E$):

$$\text{PerformanceIndex} = 0.35 \times A + 0.45 \times M + 0.20 \times E$$
$$\text{RiskScore} = \min(100, \max(0, \text{Math.round}(100 - \text{PerformanceIndex})))$$

#### Risk Level Classification:
$$\text{RiskLevel} = \begin{cases} \text{High Risk} & \text{if RiskScore} \ge 50 \\ \text{Medium Risk} & \text{if } 25 \le \text{RiskScore} < 50 \\ \text{Low Risk} & \text{if RiskScore} < 25 \end{cases}$$

---

## 5. Top 25 Viva & Interview Questions with Model Answers

### Q1: What is the main problem your project solves?
> **Model Answer**: ClassIntel replaces inefficient, manual paper-based feedback forms with a digital feedback system. It provides real-time sentiment analysis, automated topic identification, student risk prediction, and course material search for teachers and students.

### Q2: Why did you implement custom NLP logic instead of calling OpenAI / Claude API?
> **Model Answer**: We implemented custom rule-based NLP in Node.js for four reasons:
> 1. **Zero Financial Cost**: No third-party API fees per request.
> 2. **Low Latency**: Microsecond execution time directly on the server without network hops.
> 3. **Privacy**: Student data remains on institutional servers.
> 4. **Deterministic Behavior**: Results are reproducible and fully explainable without black-box AI hallucinatory risks.

### Q3: How do you handle password security in your application?
> **Model Answer**: Passwords are hashed before storing using `bcryptjs` with auto-generated salt rounds. During login, `bcrypt.compare()` verifies the candidate password against the stored hash. Plaintext passwords are never stored in the database.

### Q4: How is user authentication managed across requests?
> **Model Answer**: We use **JSON Web Tokens (JWT)**. Upon successful login, the server issues a signed JWT containing the user ID and role (`student`, `teacher`, `admin`). The client attaches this token in the `Authorization: Bearer <token>` header for protected API calls. The backend verifies the signature via Express middleware (`authenticateToken`).

### Q5: Explain the document search algorithm in your Course Notes module.
> **Model Answer**: Document search uses a sliding-window text chunking algorithm (500-character windows with 100-character overlap) when files are uploaded. When a user asks a question, the query is tokenized, stripped of stopwords, and matched against all document chunks using term frequency scoring with heading position boosts. The top matching chunks are retrieved and ranked by relevance percentage.

### Q6: How does the At-Risk Student Prediction model work?
> **Model Answer**: It uses a weighted composite scoring model:
> $$\text{Performance} = 0.35 \times \text{Attendance} + 0.45 \times \text{Marks} + 0.20 \times \text{Engagement}$$
> $\text{Risk Score} = 100 - \text{Performance}$. Scores $\ge 50$ trigger High Risk alerts, prompting targeted recommendations like extra tutoring or attendance check-ins.

### Q7: Why did you choose MongoDB over SQL databases like MySQL?
> **Model Answer**: MongoDB's document model allows flexible schema structures, perfect for feedback analysis data where keyword lists, topic arrays, and search sources vary in length. MongoDB's native JSON support also integrates seamlessly with Node.js and TypeScript.

### Q8: What ODM are you using, and what are its benefits?
> **Model Answer**: We use **Mongoose ODM**. Mongoose provides schema validation, middleware hooks, typed interfaces, and query helpers, preventing raw database corruption and simplifying CRUD operations.

### Q9: How do you prevent NoSQL injection attacks?
> **Model Answer**: We sanitize inputs using `Zod` validation schemas and explicitly type parameter objects. Mongoose query parameters are validated against defined schemas, ensuring raw operator objects like `{ $gt: "" }` cannot be injected through request bodies.

### Q10: How do you handle Cross-Origin Resource Sharing (CORS)?
> **Model Answer**: We configure Express `cors` middleware with authorized origin origins and allowed HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).

### Q11: Explain how real-time speech transcription works in your Lecture Generator.
> **Model Answer**: It uses the browser's native **HTML5 Web Speech API** (`webkitSpeechRecognition`). The frontend listens continuously, appends speech-to-text results to a transcript state buffer, and allows teachers to publish notes and flashcards directly.

### Q12: How do you parse PDF files on the backend?
> **Model Answer**: We use `multer` to accept file uploads into memory buffers, then pass the buffer to `pdf-parse` (`PDFParse`), which extracts raw text streams for chunk indexing.

### Q13: What is the purpose of React Query (TanStack Query) in your frontend?
> **Model Answer**: React Query manages server state caching, automatic re-fetching, loading/error states, and query invalidation (`invalidateQueries`), eliminating manual `useEffect` data fetching boilerplate.

### Q14: How does role-based access control (RBAC) work in your application?
> **Model Answer**: We created a custom Express middleware `requireRole(...roles)` that checks `req.user.role`. If the user's role does not match allowed roles (e.g., non-admin trying to access LMS import), it returns HTTP 403 Forbidden.

### Q15: How are teacher average ratings updated when feedback is submitted?
> **Model Answer**: Upon submitting a feedback entry, the backend calculates the updated average rating for that teacher:
> $$\text{AvgRating} = \frac{\sum \text{Ratings}}{\text{TotalFeedbacks}}$$
> and updates the `TeacherModel` document atomically.

### Q16: What is the role of `zod` in your backend?
> **Model Answer**: `Zod` validates incoming request payloads against expected schemas. If validation fails, `zod-validation-error` produces readable error messages and returns HTTP 400 Bad Request before processing data.

### Q17: How is the database connection resilience handled?
> **Model Answer**: In [`backend/db.ts`](file:///d:/ClassIntel/backend/db.ts), MongoDB connection logic attempts to connect to MongoDB Atlas. If Atlas fails or DNS resolution is unavailable, it automatically falls back to a local MongoDB instance (`mongodb://127.0.0.1:27017/lecture_feedback_system`), ensuring offline availability.

### Q18: Explain the difference between `useEffect` and React Query in your project.
> **Model Answer**: `useEffect` is for component side-effects (e.g. timers, web speech initialization). React Query handles server data fetching, automatic background refetching, and caching.

### Q19: How do QR code feedback links work for teachers?
> **Model Answer**: Each teacher profile has a unique QR code generated using their teacher ID URL route (`/qr-feedback/:teacherId`). Students scan the QR code to open the feedback form directly on their mobile device without logging in.

### Q20: How are toxic or inappropriate comments handled?
> **Model Answer**: In [`academic-services.ts`](file:///d:/ClassIntel/backend/routes/academic-services.ts#L73-L96), the `/ai/detect-toxic` endpoint matches comments against an `ABUSIVE_WORDS` array. If abusive language is detected, the comment is flagged for admin review.

### Q21: What is the time complexity of your sentiment analysis algorithm?
> **Model Answer**: Tokenization takes $O(N)$ where $N$ is text length. Lexicon matching takes $O(K)$ where $K$ is the number of words in the dictionary. Overall time complexity is $O(N + K)$, running in less than 1 millisecond per feedback comment.

### Q22: What is the difference between client-side routing and server-side routing here?
> **Model Answer**: Client-side routing is handled by `Wouter` in React, switching pages instantaneously without reloading HTML. Server-side routing is handled by Express (`router.get`, `router.post`) for REST API endpoints.

### Q23: How do student quizzes work?
> **Model Answer**: Teachers create quizzes with multiple-choice options and a timer. When students complete a quiz, the frontend posts selected options to `/api/quizzes/:id/submit`. The server computes the score, updates student performance stats, and returns detailed feedback.

### Q24: How would you scale ClassIntel for an entire university with 10,000+ users?
> **Model Answer**:
> 1. Add MongoDB database indexing on `teacherId`, `studentId`, and `createdAt`.
> 2. Implement Redis caching for teacher analytics and document search results.
> 3. Move document text extraction to background worker queues (BullMQ / RabbitMQ).
> 4. Containerize with Docker and scale backend Express instances behind an Nginx load balancer.

### Q25: What was the most challenging technical part of building ClassIntel?
> **Model Answer**: Designing the offline NLP and vector search engine in pure TypeScript without depending on heavy third-party AI APIs, while ensuring fast document chunking, high sentiment accuracy, and robust fallback handling for local/cloud database connections.

---

*ClassIntel CSE Final Year Project Defense & Viva Guide — Ready for Presentation!*
