MentorBridge
============

MentorBridge is a comprehensive platform designed to facilitate meaningful connections between Students and Mentors. It provides a robust suite of tools including AI-powered profile generation, real-time chat, P2P video calls, ATS resume analysis, dynamic career roadmapping, and industry insights.

Table of Contents
-----------------
1. Features
2. Tech Stack
3. Prerequisites
4. Project Structure
5. Installation & Setup
6. Usage
7. Environment Variables

1. Features
-----------
- JWT-Based Authentication: Secure signup/login with distinct dashboards for Students and Mentors, isolated by roles.
- AI-Assisted Profile Generation: Users can auto-generate a professional bio, role, and skills using Google Gemini AI.
- Matching & Connection Management: Students can browse Mentors, check compatibility scores, and request connections. Mentors can accept/decline.
- Global Bi-Directional Chat: Instant messaging powered by Socket.io, featuring unread indicators and real-time WebSocket updates.
- Peer-to-Peer WebRTC Video Calls: Built-in global ringing and P2P video calling capabilities between connected users.
- Mentor Review System: Mentors can leave 1-5 star quantitative ratings and notes on students.
- Deep AI Resume Analysis: A simulated ATS parser powered by Gemini that evaluates resumes, scores them, and identifies missing keywords section by section.
- Automated AI Career Roadmapping: Request a learning path based on any domain and get a dynamically generated chronological roadmap (e.g., Data Science).
- Dynamic Industry Insights & Heatmaps: Visual representation of real-time job market trends and highly sought-after skills.

2. Tech Stack
-------------
Frontend Architecture:
- React 19 (Functional Components, Hooks)
- React Router DOM v7 (SPA Navigation)
- Vite (Build Tool & HMR, running over HTTPS via @vitejs/plugin-basic-ssl)
- Vanilla CSS 3 (Glassmorphism design, CSS Grid/Flexbox)

Backend Architecture:
- Node.js & Express.js (v4.21.2)
- SQLite via sql.js (WebAssembly-based, in-memory/file-system DB)
- Socket.io (Real-time WebSockets)
- Google Gemini AI (@google/generative-ai) for LLM prompts
- bcryptjs (Password Hashing)
- jsonwebtoken (Session Management)

3. Prerequisites
----------------
- Node.js (v18 or higher recommended)
- npm or yarn

4. Project Structure
--------------------
Hacksprint/
├── backend/
│   ├── routes/          # API Route Definitions (auth, messages, ai, connections, etc.)
│   ├── middleware/      # JWT authentication middleware
│   ├── db.js            # SQLite database schema and initialization
│   ├── seed.js          # Database seeding script
│   ├── server.js        # Entry point for the Express and Socket.io server
│   ├── mentorbridge.db  # SQLite database file
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/             # React components, pages, contexts, and assets
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── features.txt         # Detailed logic and data flows
├── requirement.txt      # Project dependencies
└── techstack.txt        # Architectural details

5. Installation & Setup
-----------------------
Follow these steps to get MentorBridge running on your local machine:

Step 1: Clone the repository or open the project folder.

Step 2: Setup the Backend
1. Open a terminal and navigate to the backend directory:
   cd backend
2. Install dependencies:
   npm install
3. Create a `.env` file in the `backend` folder and configure your environment variables (see section 7).
4. Start the backend server:
   npm start
   (The server will typically run on port 5000)

Step 3: Setup the Frontend
1. Open a new terminal and navigate to the frontend directory:
   cd frontend
2. Install dependencies:
   npm install
3. Start the Vite development server:
   npm run dev
   (The frontend runs securely over HTTPS locally to support WebRTC camera/microphone access)

6. Usage
--------
1. Access the frontend application via the URL provided by Vite (e.g., https://localhost:5173).
2. Register a new account as a "Student" or "Mentor".
3. Use the AI profile generator during onboarding to easily build your bio.
4. Students: Browse mentors and send connection requests from the dashboard.
5. Mentors: Log in to accept pending connection requests.
6. Once a connection is mutually accepted, utilize the real-time chat room and one-click video calling features.
7. Access dedicated utilities like the Resume AI analyzer or Career Roadmapping tools from the navigation.

7. Environment Variables
------------------------
To run the backend properly, you must configure a `.env` file in the `backend` directory with the necessary keys. 
For example:

JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_google_gemini_api_key

- JWT_SECRET: A secret string used to sign JSON Web Tokens.
- GEMINI_API_KEY: Obtained from Google AI Studio to power all AI generation features under the hood. 
You can use the `.env.example` in the root folder as a starting point.
