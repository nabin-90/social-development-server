# SocialDev – Backend API

SocialDev is a backend REST API for the Social Development Events Platform. It handles authentication, event management, event joining, and user-specific data using Express.js and MongoDB.

## 🌐 Live API

https://social-development-server-iota.vercel.app/

## 📂 Repository

[SocialDev Server – GitHub](https://github.com/nabin-90/social-development-server)

## ✨ Features

- User authentication with Better Auth.
- JWT-based API authentication.
- Create new events.
- Retrieve upcoming events.
- Retrieve event details.
- Update events created by authenticated users.
- Delete events created by authenticated users.
- Join events.
- Prevent duplicate event joining.
- Retrieve events joined by the authenticated user.
- Protected API routes.
- MongoDB database integration.

## 🛠️ Technologies Used

- Node.js
- Express.js
- MongoDB
- Better Auth
- JWT
- CORS
- Vercel

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/nabin-90/social-development-server.git
```

### 2. Navigate to the project directory

```bash
cd social-development-server
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root and configure the required variables:

```env
PORT=5000
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
BETTER_AUTH_SECRET=YOUR_SECRET_KEY
BETTER_AUTH_URL=YOUR_BACKEND_URL
```

Use your actual project configuration. Never commit `.env` files or expose secret values publicly.

### 5. Run the development server

```bash
npm run dev
```

The backend server will run locally on:

http://localhost:5000

## 🚀 Deployment

The backend is deployed on Vercel.

**Live API:** https://social-development-server-iota.vercel.app/

## 👨‍💻 Developer

**Mahmudun Nabin**

- GitHub: [nabin-90](https://github.com/nabin-90)

---

Built with ❤️ using Express.js and MongoDB.
