<div align="center">
  <img src="https://raw.githubusercontent.com/Paritoshcodes/TeamPulse/main/client/public/favicon.ico" width="80" alt="TeamPulse Logo">
  <h1 align="center">TeamPulse</h1>
  <p align="center">
    <strong>A high-performance, real-time team collaboration and messaging platform.</strong>
  </p>
  
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#environment-variables">Environment Variables</a> •
    <a href="#architecture">Architecture</a>
  </p>
</div>

---

## 🌟 Features

- **Real-time Messaging**: Instant message delivery using WebSockets, with typing indicators and online presence tracking.
- **Workspaces & Channels**: Organize conversations logically by teams and topics.
- **Direct Messaging**: Private one-on-one communication.
- **Rich Media Support**: Upload and share images, PDFs, and other attachments directly in chat (stored securely in MongoDB).
- **Authentication**: Secure login with Email/Password (OTP verification) or Google OAuth.
- **Role-Based Access Control**: Granular permissions for Admins, Members, and Guests.
- **Modern UI/UX**: Built with React and Framer Motion for buttery-smooth animations, responsive layouts, and customizable themes (Blue, Dark, System).
- **Notification System**: In-app alerts, desktop notifications, and sounds for mentions and direct messages.

## 💻 Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Real-time**: Socket.io-client
- **Routing**: React Router v6
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Job Queue**: Bull & Redis (for background processing)
- **Authentication**: Passport.js & JWT
- **Email**: Resend

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Redis](https://redis.io/) (Required for background jobs & queues)

### 1. Clone the repository

```bash
git clone https://github.com/Paritoshcodes/TeamPulse.git
cd TeamPulse
```

### 2. Install dependencies

Install dependencies for the workspace (this will install both client and server dependencies):

```bash
npm install
```

### 3. Setup Environment Variables

Duplicate the provided `.env.example` file in the `server` directory and rename it to `.env`:

```bash
cp server/.env.example server/.env
```

*See the [Environment Variables](#environment-variables) section below for required configuration.*

### 4. Run the Development Servers

You can start both the frontend and backend servers concurrently using the provided script from the root directory:

```bash
npm run dev
```

- **Frontend** will be available at: `http://localhost:5173`
- **Backend API** will be running at: `http://localhost:5000`

---

## ⚙️ Environment Variables

Create a `.env` file in the `server/` directory with the following configuration:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/teampulse

# Redis (for Bull queues)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email / Resend (Required for OTP)
RESEND_API_KEY=re_your_api_key
```

> **Note:** The default sender is `TeamPulse <onboarding@resend.dev>` (Resend's sandbox). Sandbox emails can only be delivered to the email on your Resend account. To send to any address, [verify a custom domain](https://resend.com/docs/dashboard/domains/introduction) on Resend.

---

## 🏗 Architecture

TeamPulse is architected as a monolithic repository containing separated frontend and backend codebases. 

- **State Management**: The frontend relies on React Context for global state (Authentication, WebSockets, Theme) to avoid over-engineering.
- **WebSocket Integration**: Socket.io is heavily integrated to provide low-latency updates for messages, reactions, presence, and typing indicators.
- **File Storage**: Instead of relying on the local ephemeral filesystem, all media attachments and profile pictures are safely buffered and stored within MongoDB directly, ensuring seamless horizontal scaling.
- **Background Processing**: Redis and Bull are used to offload heavy tasks like email dispatching, reducing API response times.

---

<div align="center">
  <p>Built with ❤️ for modern teams.</p>
</div>
