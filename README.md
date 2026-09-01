# 🎬 The Watchers Network - Web Applications Final Project

> **A Full-Stack Social Network for Pop-Culture, Movies & Series Fans**  
> Developed as a Final Project in Web Application Development Course.  
> **Authors:** Shahaf Abraham, Nicole Klempert & Lior Shif

---

## 📌 Project Overview
**The Watchers Network** is an interactive, full-stack social network built with **Node.js, Express, MongoDB, and Vanilla JavaScript (HTML5/CSS3)** following the **MVC (Model-View-Controller)** architecture.

The platform allows users to:
1. Register, log in, manage profiles, crop avatar pictures using **HTML5 Canvas**, and connect with friends.
2. Publish, like, edit, delete, and comment on multi-media posts (**Text, Images, Videos**) with attached geographical locations.
3. Create and join **Public and Private Groups** with an admin approval workflow.
4. Explore an interactive **Google Map** displaying community posts and coordinates.
5. Consume live real-time entertainment schedules via **TVMaze Web Service API**.
6. Auto-publish posts directly to **Facebook Page via Facebook Graph API**.
7. Analyze live aggregated platform statistics using **D3.js v7** dynamic charts.

---

## 🛠️ Architecture & Tech Stack

```
                     ┌────────────────────────────────────────────────────────┐
                     │                         CLIENT                         │
                     │  HTML5 + CSS3 (Bootstrap / Custom) + Vanilla JS (ES6)  │
                     │  D3.js Charts | Google Maps API | Canvas Avatar Crop   │
                     └───────────────────────────┬────────────────────────────┘
                                                 │ HTTP / REST / JSON (Fetch)
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │                     EXPRESS SERVER                     │
                     │              Node.js + Express (MVC Pattern)           │
                     │     Session Auth | Access Middleware | Error Handling  │
                     └──────┬────────────────────┬────────────────────┬───────┘
                            │                    │                    │
              Mongoose / DB │     TVMaze Service │       Facebook API │
                            ▼                    ▼                    ▼
                    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                    │   MongoDB    │     │ TVMaze REST  │     │   Facebook   │
                    │    Atlas     │     │ Web Service  │     │  Graph API   │
                    └──────────────┘     └──────────────┘     └──────────────┘
```

* **Server Runtime:** Node.js
* **Backend Framework:** Express.js (MVC Pattern, ES Modules)
* **Database:** MongoDB (via Mongoose ODM) with blind index encryption
* **Authentication:** Express Session + bcrypt password hashing + Role-based Middleware
* **Client / UI:** Semantic HTML5, CSS3 Variables & Responsive Design, Vanilla JavaScript (Async/Await Fetch API)
* **Visualizations:** D3.js v7
* **External APIs & Services:** Google Maps JavaScript & Geocoding API, TVMaze Web Service, Facebook Graph API

---

## 🗄️ Database Models (MongoDB / Mongoose)

The application implements **3 core models** (`models/`):

### 1. `User` (`models/userModel.js`)
* `username`: Encrypted username (blind index search hash).
* `password`: Securely hashed with `bcrypt`.
* `profilePicture`: Base64 / URL string.
* `city`, `birthDate`, `favoriteCategory`: Demographic profile fields.
* `friends`: Array of usernames (bidirectional friendship system).
* `friendRequests`: Incoming friend requests array.

### 2. `Group` (`models/groupModel.js`)
* `name`, `description`, `category`, `image`: Group metadata.
* `creator`: User ID reference of group founder.
* `admins`: Array of user IDs with administrative privileges.
* `members`: Array of user IDs.
* `isPublic`: Boolean flag (public vs. private group).
* `joinRequests`: Array of pending user IDs awaiting admin approval.

### 3. `Post` (`models/postModel.js`)
* `author`: Username of post author.
* `content`: Text body.
* `mediaUrl`, `mediaType` (`'image' | 'video'`), `postType` (`'text' | 'image' | 'video'`).
* `group`: ObjectId reference to `Group` (null for public feed).
* `location`: Object containing `{ name, address, latitude, longitude }`.
* `likes`: Count of likes + `likedBy` array of usernames.
* `comments`: Embedded subdocument array `{ author, text, authorProfilePic, createdAt }`.

---

## 📋 Course Requirements Implementation Cheat Sheet

### 1. MVC Separation (Requirement #20)
* **Models (`/models`):** Define Mongoose schemas, indexes, and database access logic.
* **Controllers (`/controllers`):** Business logic, validation, MongoDB queries, and response shaping.
* **Views (`/public`):** Pure HTML templates and decoupled client-side JavaScript controllers.
* **Routes (`/routes`):** Express routers mapping endpoints to controllers with middleware guards.

---

### 2. Full CRUD Operations on All 3 Models (Requirement #21 & #22)
| Model | **Create** | **Read / List** | **Update** | **Delete** | **Search** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Post** | `POST /posts` | `GET /posts` | `PUT /posts/:id` | `DELETE /posts/:id` | Text, author, group, date range, media type |
| **Group** | `POST /groups` | `GET /groups` | `PUT /groups/:id` | `DELETE /groups/:id` | Name, category, public/private |
| **User** | `POST /auth/signup` | `GET /users` | `PUT /users/profile` | `DELETE /users/profile` | Search users / friends list |

---

### 3. Multi-Parameter Search Queries (Requirement #23)
1. **Feed Posts Filter (`public/js/filters.js` & `controllers/postController.js`):**
   * Filter by **free-text keyword** (searches `content` & `author`).
   * Filter by **group name**.
   * Filter by **author name**.
   * Filter by **media type** (`all`, `text`, `image`, `video`).
   * Filter by **date range** (`dateStart` and `dateEnd`).
2. **Groups Filter (`public/js/groupsManager.js` & `controllers/groupController.js`):**
   * Filter by **group name**.
   * Filter by **category** (`Anime`, `Marvel`, `DC`, `Disney`, `Pixar`, `Series`, `Movies`, etc.).
   * Filter by **visibility** (`All`, `Public`, `Private`).

---

### 4. MongoDB `GroupBy` Aggregation Queries (Requirement #24)
1. **Friends by City (`controllers/statisticsController.js`):**
   * Uses `User.aggregate([ { $match }, { $group: { _id: "$city", count: { $sum: 1 } } } ])` to group friend residences.
2. **Group Members by City (`controllers/statisticsController.js`):**
   * Groups members of a specific group by city using MongoDB Aggregation Pipeline.
3. **Posts by Author & Posts by Media Type (`controllers/searchController.js`):**
   * Groups posts by author and media type (`$group: { _id: "$postTypeDetected", count: { $sum: 1 } }`).

---

### 5. Access Control, Authentication & Privacy (Requirements #25, #26, #27)
* **Auth Guard (`middleware/authMiddleware.js`):** `isAuthenticated` blocks unauthenticated requests.
* **Owner Protection:** `isPostOwner` verifies user ownership before allowing `PUT /posts/:id` or `DELETE /posts/:id`.
* **Group Admin Role:** Group creators/admins can edit group details, delete group posts, and approve/reject join requests for private groups (`/groups/:id/requests/:userId/approve`).
* **Feed Visibility:** `GET /posts` displays public posts, posts from friends, and posts from groups the current user is a member of.

---

### 6. HTML5 Features (Requirement #31)
* **`<video>`:** Plays user-uploaded video posts (`<video src="..." controls>`).
* **`<canvas>`:** Interactive avatar photo crop/zoom modal (`#crop-canvas`, 2D context image rendering).
* **Semantic Elements:** `<aside>`, `<footer>`, `<header>`, `<nav>`, `<section>` structured throughout every HTML view.

---

### 7. CSS3 Features (Requirement #32)
* **`text-shadow`:** Applied on main headings and hero titles (`components.css`).
* **`transition`:** Smooth dark-mode transitions, hover states, and modal transforms.
* **`multiple-columns`:** Multi-column layout structure on cards and content sections.
* **`@font-face`:** Custom typography font loading defined in `variables.css`.
* **`border-radius`:** Modern rounded cards, buttons, badges, and avatars.
* **Dark Mode Theme:** CSS custom properties (`--bg-color`, `--card-bg`, `--text-main`) toggled via `body.dark-mode`.

---

### 8. D3.js Dynamic Data Visualizations (Requirement #33.i)
* Implemented in **[`public/js/statisticsManager.js`](file:///c:/Users/nicol/OneDrive/Desktop/מכללה/web-applications-final-project/public/js/statisticsManager.js)** using **D3.js v7**.
* Dynamically fetches live data from MongoDB aggregation endpoints.
* Renders animated SVG bar charts with scalable axes, custom tick formatters, rotating labels, legends, and interactive hover tooltips.

---

### 9. External Web Service API (Requirement #33.ii)
* **Service:** TVMaze REST API (Entertainment / TV Shows Schedule).
* **Backend:** `services/newsService.js` makes HTTP GET requests to `https://api.tvmaze.com/schedule?country=US`.
* **Frontend:** `public/js/newsApi.js` fetches and displays today's top pop-culture broadcasts in real time with poster images, air times, and direct external links.

---

### 10. Interactive Google Maps & Location Management (Requirement #33.iii)
* **Service:** Google Maps JavaScript API & Geocoding API (`public/js/postLocation.js`, `public/js/mapManager.js`).
* **Post Location Attachment:** Users can search any location or click directly on the interactive map to pin coordinates to a post.
* **Map Page (`map.html`):** Loads all posts with coordinates from MongoDB and displays custom markers with info windows, links, and quick post previews.
* **Location Editing:** Fully supports editing or clearing post locations via the edit modal.

---

### 11. Social Media Integration - Facebook Graph API (Requirement #33.iv)
* **Service:** Facebook Graph API (`services/facebookService.js`).
* **Implementation:** When the user checks the **"Share to Facebook"** toggle during post creation, the server automatically publishes the post content to the designated Facebook Page via `POST https://graph.facebook.com/v19.0/{page_id}/feed`.

---

## 📂 Project Directory Structure

```
├── server.js                     # Express app initialization & server startup
├── package.json                  # Dependencies and NPM scripts
├── .env                          # Environment variables (Mongo URI, API Keys, Secrets)
│
├── models/                       # Mongoose Schemas (MVC: Models)
│   ├── userModel.js              # User account & friendship schema
│   ├── groupModel.js             # Group & membership schema
│   └── postModel.js              # Post, media, comments & location schema
│
├── controllers/                  # Business Logic (MVC: Controllers)
│   ├── authController.js         # Signup, login, logout, password reset
│   ├── userController.js         # Profile viewing, updates, friend requests
│   ├── postController.js         # Post CRUD, likes, comments, location filters
│   ├── groupController.js        # Group CRUD, membership, join requests
│   ├── statisticsController.js   # D3.js aggregation query endpoints
│   ├── searchController.js       # Advanced search & post stats aggregations
│   ├── mapController.js          # Google Maps config & coordinate retrieval
│   ├── newsController.js         # TVMaze entertainment schedule controller
│   └── facebookController.js     # Facebook page publishing controller
│
├── routes/                       # Express Route Handlers
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── postRoutes.js
│   ├── groupRouts.js
│   ├── statisticsRoutes.js
│   ├── searchRoutes.js
│   ├── mapRoutes.js
│   ├── newsRoutes.js
│   └── facebookRoutes.js
│
├── middleware/                   # Express Middlewares
│   ├── authMiddleware.js         # Session auth guards & role checks
│   └── errorMiddleware.js        # Global error & exception handler
│
├── services/                     # 3rd Party Integrations & Helpers
│   ├── newsService.js            # TVMaze Web Service integration
│   └── facebookService.js        # Facebook Graph API integration
│
├── utils/                        # Encryption & Token Utilities
│   └── cryptoUtils.js            # AES-256-GCM encryption & Blind Index hashing
│
└── public/                       # Client-Side Assets (MVC: Views)
    ├── feed.html                 # Main social feed view
    ├── profile.html              # User profile & posts view
    ├── groups.html               # Groups catalog & discovery view
    ├── group.html                # Single group view & member management
    ├── map.html                  # Interactive Google Maps posts view
    ├── statistics.html           # Live D3.js dynamic statistics view
    ├── login.html                # User login view
    ├── signup.html               # Registration view
    ├── forgot-password.html      # Password recovery view
    ├── css/                      # Modular CSS3 Stylesheets
    │   ├── variables.css         # Theme tokens, @font-face, dark mode vars
    │   ├── layout.css            # Responsive app grid & sidebar navigation
    │   ├── components.css        # Buttons, inputs, badges, cards
    │   ├── posts.css             # Post cards, comments, media, actions
    │   ├── modals.css            # Modals, crop tool, dialogs
    │   ├── avatars.css           # Dynamic avatar generators
    │   ├── feedStyle.css         # Feed-specific widgets & news card
    │   ├── groupStyle.css        # Single group layout & member lists
    │   ├── groupsStyle.css       # Groups discovery grid
    │   ├── profileStyle.css      # Profile header & tab controls
    │   ├── statistics.css        # D3 chart cards, tooltips, legends
    │   └── locationMap.css       # Map full-screen & picker styles
    └── js/                       # Client JavaScript Controllers
        ├── global.js             # Shared navigation, avatar crop, unified post actions
        ├── postsManager.js       # Feed loading, infinite scroll, modal composers
        ├── groupManager.js       # Group posts, member approvals, role management
        ├── groupsManager.js      # Group discovery & category filters
        ├── profileManager.js     # Profile editing, user posts, friendship status
        ├── profileGroupsManager.js # User's joined groups list
        ├── statisticsManager.js  # D3.js chart renderers & dynamic data fetching
        ├── mapManager.js         # Google Maps markers & post cards
        ├── postLocation.js       # Location picker component & Geocoder
        ├── newsApi.js            # Web Service TV schedule renderer
        ├── filters.js            # Multi-parameter search & feed filtering
        └── auth.js               # Login, signup, password reset validation
```

---

## 🚀 How to Run the Project Locally

### 1. Prerequisites
* **Node.js** (v18.x or higher)
* **NPM** (v9.x or higher)
* Active Internet Connection (for MongoDB Atlas, Google Maps & TVMaze APIs)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/nicole-klempert/web-applications-final-project.git

# Navigate into the project folder
cd web-applications-final-project

# Install all dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (or use the provided environment settings):
```env
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
SESSION_SECRET=<your-session-secret>
ENCRYPTION_KEY=<your-32-byte-hex-encryption-key>
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
FACEBOOK_PAGE_ACCESS_TOKEN=<your-facebook-page-token>
FACEBOOK_PAGE_ID=<your-facebook-page-id>
```

### 4. Start the Server
```bash
npm start
# or for development:
node server.js
```
Open your browser and navigate to: **`http://localhost:3000`**

---

## 💡 Quick Defense Q&A Cheat Sheet (שאלות ותשובות נפוצות להגנה)

### Q1: How does the application follow the MVC architecture?
> **Answer:**
> * **Models:** In `/models`, Mongoose schemas (`User`, `Group`, `Post`) define data structures and business validation.
> * **Views:** In `/public`, HTML5 files render the UI and receive dynamic updates via client-side JavaScript.
> * **Controllers:** In `/controllers`, functions handle requests, query the DB, validate inputs, and return JSON responses without mixing database logic into routes or views.

### Q2: Where is MongoDB `GroupBy` implemented?
> **Answer:**
> Inside `controllers/statisticsController.js` and `controllers/searchController.js` using `Model.aggregate()`. We use the `$group` pipeline stage to count users by city (`$city`), posts by author (`$author`), and posts by media type (`$postTypeDetected`).

### Q3: What Web Service did you integrate and how?
> **Answer:**
> We integrated the **TVMaze Web Service API**. Our backend (`services/newsService.js`) fetches the daily television schedule from `https://api.tvmaze.com/schedule?country=US`, processes the top shows, and the client (`public/js/newsApi.js`) dynamically renders them on the Feed page. It is a true REST API call (not an iframe).

### Q4: How does the Google Maps integration work?
> **Answer:**
> In `public/js/postLocation.js` and `mapManager.js`, we load the Google Maps JavaScript SDK. When creating/editing a post, users can search places via the Geocoding API or click the map to store `{ latitude, longitude, name, address }` in the post's MongoDB document. The dedicated `map.html` view queries all geotagged posts and displays interactive markers.

### Q5: How are private vs. public groups protected?
> **Answer:**
> In `controllers/groupController.js`, `getGroupById` checks whether the requesting user is a member of private groups. If not, `isPrivateContentHidden: true` is returned, withholding posts and member lists. Users must click "Request to Join", which stores them in `joinRequests` until an admin approves them (`approveRequest`).

### Q6: How does the avatar cropping feature work?
> **Answer:**
> In `public/js/global.js`, when a user selects a profile image, an HTML5 `<canvas id="crop-canvas">` is used with a 2D rendering context (`getContext('2d')`) allowing the user to drag and position the image before exporting the final cropped frame as a clean data URL.

---

## 🎓 Academic Integrity & Authorship
This project was written, designed, and developed entirely by the group members (**Shahaf Abraham, Nicole Klempert, and Lior Shif**) as part of the academic requirements for the Web Application Development course. All code, styles, and integrations are original implementations.