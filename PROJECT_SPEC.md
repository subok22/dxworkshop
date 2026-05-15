# Technical Specification: DX TASK HUB

## 1. Project Overview
**DX TASK HUB** is a collaborative platform designed for Digital Transformation (DX) practitioners within an organization to propose, share, and rank DX initiatives. It uses AI to translate complex problem statements into concise project titles and fosters community engagement through a "Like" system.

## 2. Technical Stack
- **Frontend Framework**: React 18+ (TSX)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (`motion/react`)
- **Icons**: Lucide React
- **Backend Service**: Firebase (Firestore & Authentication)
- **AI Model**: Google Gemini 3 Flash (via `@google/genai`)

## 3. Core Features

### 3.1. Authentication
- **Multi-Login Strategy**: Supports both **Google OAuth** for full access and **Anonymous Login** for instant participation.
- **Auto-Guest Session**: If a user is not logged in, the app automatically initializes an anonymous Firebase session to allow viewing and basic interaction without friction.

### 3.2. DX Challenge Proposal (Bento Grid Form)
- **Interactive Form**: Users define:
  1. **AS-IS**: Current pain points and problem definitions.
  2. **TO-BE**: Ideal state and goals.
  3. **DX Solution**: Technological approach using AI/Data.
  4. **Resources**: Required tools/datasets.
- **AI-Powered Naming**: Uses a debounce effect to automatically (or manually) generate a creative "Challenge Name" using the Gemini API based on the form inputs.
- **CRUD Operations**:
  - **Create**: Authenticated (including anonymous) users can submit.
  - **Update**: Only the original author (matching `authorId`) can modify their own proposals.

### 3.3. Real-time Feed & Interaction
- **Live Sync**: Uses Firestore `onSnapshot` for real-time updates across all users.
- **Social Interaction**: "Like" system that updates a shared counter.
- **Identity Display**: Distinguishes between identified users (Google Display Name) and "Guest" users (Anonymized).

### 3.4. Dynamic Rankings
- **Top 3 Ranking**: A dedicated sidebar calculating the highest-voted challenges in real-time.
- **Visual Staging**: Staggered animations using Framer Motion to highlight rank transitions.

## 4. UI/UX Design (Bento Grid Theme)
- **Layout**: 12-column grid system.
  - **Lg: Col-5 (Form)**: High-density input area.
  - **Lg: Col-4 (Feed)**: Centered scrolling activity stream.
  - **Lg: Col-3 (Sidebar)**: Rankings and informational widgets.
- **Design Language**: 
  - **Colors**: Indigo (`#6366f1`) and Slate (`#0f172a`) palette.
  - **Shape**: Large rounded corners (`rounded-[2rem]`), heavy shadows, and subtle gradients.
  - **Typography**: `Inter` for general UI, `Space Grotesk` for display headings.

## 5. Backend Schema & Security

### 5.1. Firestore Schema (`tasks` collection)
| Field | Type | Description |
| :--- | :---- | :--- |
| `challengeName` | string | AI-generated or user-refined title |
| `problem` | string | The "AS-IS" state |
| `goal` | string | The "TO-BE" state |
| `solution` | string | Proposed technological solve |
| `requirements` | string | Needed resources |
| `authorId` | string | Firebase UID |
| `authorName` | string | Full name or "Anonymous" |
| `likes` | number | Vote count |
| `createdAt` | timestamp | Server-side timestamp |

### 5.2. Security Rules (Firestore)
- **Read**: Publicly readable.
- **Create**: Requires `isSignedIn()`.
- **Update**: Uses `affectedKeys()` logic to distinguish between:
  - **Liking**: Increment only, restricted field.
  - **Editing**: Full schema validation, restricted to `authorId == request.auth.uid`.

## 6. AI Integration Logic
- **Endpoint**: Server-side script via Gemini SDK.
- **Prompt Engineering**: Instructs the model to generate a "concise, creative DX title (~15 chars)" from the problem/solution flow.

## 7. Responsive Behavior
- **Desktop**: Full 3-column bento grid.
- **Tablet/Mobile**: Sequential columns with sticky navigation and overflow support for long feed items.
