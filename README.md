# The Watchers Network

A social networking web application.

## Features
- **User Authentication**: Secure signup, login, and password recovery.
- **Dynamic Feed**: Create posts with text, images, videos, and geographical locations. Filter posts by date, media type, and scope (All, Friends, Groups).
- **Groups Management**: Create and manage public/private groups, assign admins, and handle join requests.
- **Social Interaction**: Like and comment on posts, and share content directly to Facebook.
- **Interactive Map**: Discover posts based on geographical locations using a dedicated map view.
- **Real-Time TV News**: Integration with the TVMaze API to show daily airing TV shows.
- **Profile & Statistics**: View user profiles, personal posts, and visual statistics of user activity.
- **Dark Mode**: Built-in dark mode toggle for a better user experience.

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap Icons.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB with Mongoose ODM.
- **External APIs**: Facebook Graph API (Sharing), TVMaze API (News).

## Project Structure
```text
├── config/          # Database configuration (db.js)
├── controllers/     # Application logic (auth, groups, posts, map, news, validate inputs, interact with Models, and return clean JSON responses.)
├── middleware/      # Express middleware (e.g., authMiddleware)
├── models/          # Mongoose database schemas (User, Group, Post)
├── public/          # Static frontend assets (HTML, CSS, Client-side JS, Errors)
	* Views (`/public`): Pure HTML5 pages rendered dynamically on    the client side using Vanilla JS and Async `fetch()`.
├── routes/          # Express API routes. Map HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`) and URLs to their respective controller functions with authentication middleware guards.
├── services/        # External services integration (Facebook, News)
├── utils/           # Utility functions (cryptoUtils.js == encryption)
├── server.js        # Main application entry point!
└── package.json     # Project metadata and dependencies
```


## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nicole-klempert/web-applications-final-project.git
   cd web-applications-final-project-main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   - Copy `.env.example` to `.env`.
   - Fill in the required environment variables (e.g., MongoDB URI, Session Secret, API Keys).

4. **Run the application:**
   ```bash
   npm start
   ```
   *The server will start running on the designated port (http://localhost:3000).*

## Authors
Developed by Shahaf Abraham, Nicole Klempert & Lior Shif (2026).
