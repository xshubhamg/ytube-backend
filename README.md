# Ytube — Backend

Express + MongoDB backend for a YouTube-style clone: auth with JWT cookies, video publishing via Cloudinary, comments, likes, tweets, playlists, and subscriptions.

## Tech stack

- Node.js (ES modules), Express 5
- MongoDB + Mongoose (+ `mongoose-aggregate-paginate-v2`)
- JWT (`jsonwebtoken`), `bcrypt`, `cookie-parser`, `cors`
- Uploads: `multer` (local `./public/temp`) → Cloudinary
- Dev: `nodemon` + `dotenv`

## Project structure

```
src/
  app.js               # express setup, routers, global error handler
  index.js             # dotenv + connectDB + listen
  constants.js         # DB_NAME
  db/index.js          # mongoose.connect(`${MONGODB_URI}/${DB_NAME}`)
  models/              # user, video, comment, like, tweet, playlist, subscription
  controllers/         # user, video, comment, like, tweet, playlist, subscription
  routes/              # user, video, comment, like, tweet, playlist, subscription
  middlewares/         # verifyJWT, multer upload
  utils/               # asyncHandler, ApiError, ApiResponse, cloudinary
public/temp/           # multer staging (gitkept)
```

Conventions: every controller uses `asyncHandler` + `ApiError`/`ApiResponse`; protected routes use `verifyJWT`; file routes use `upload.fields/single`.

## Setup

```bash
npm install
cp .env.example .env   # fill real values
npm run dev            # nodemon -r dotenv/config src/index.js
```

Server: `http://localhost:8000` (`PORT` or 8000). Health of boot: `MongoDB connected !!` + `Server is running at port …`.

## Env variables

See `.env.example`. Notes:

- `MONGODB_URI` — base connection string **without** DB name; code appends `/ytube` (`src/constants.js`, `src/db/index.js`).
- Cloudinary key is `CLOUDINARY_API_SECRET_KEY` (dashboard calls it API Secret).
- `ACCESS_TOKEN_EXPIRY=1d`, `REFRESH_TOKEN_EXPIRY=10d` are `jsonwebtoken` duration strings.

## API overview

Base: `/api/v1`. Auth = `accessToken`/`refreshToken` httpOnly cookies or `Authorization: Bearer <accessToken>`. Errors are always JSON `{ success:false, message, errors }`.

### Users `/users`

| Method | Path | Auth | Body / Files |
|---|---|---|---|
| POST | `/register` | no | `fullname, username, email, password` + `avatar` (req), `coverImage` (opt) multipart |
| POST | `/login` | no | `username` or `email` + `password` |
| POST | `/logout` | yes | — |
| POST | `/refreshToken` | cookie/body | `refreshToken` cookie or body |
| POST | `/change-password` | yes | `currentPassword, newPassword` |
| GET | `/current-user` | yes | — |
| PATCH | `/update-details` | yes | `fullname, email` |
| PATCH | `/update-avatar` | yes | `avatar` single file |
| PATCH | `/update-cover-image` | yes | `coverImage` single file |
| GET | `/channel/:username` | yes | channel profile + sub counts + `isSubscribed` |
| GET | `/history` | yes | watch history with owner lookup |

### Videos `/videos`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/?page&limit&query&sortBy&sortType&userId` | no | `query` matches title/desc; `sortBy ∈ createdAt,views,duration,title` (default `createdAt`); `limit` capped at 50 |
| POST | `/` | yes | `title, description` + `videoFile` + `thumbnail` multipart |
| GET | `/:videoId` | yes | unpublished → `404` unless owner; `views++` + history `$addToSet` |
| PATCH | `/:videoId` | yes, owner | `title?, description?` + `thumbnail?` single file |
| DELETE | `/:videoId` | yes, owner | DB doc only (no Cloudinary/orphan cascade) |
| PATCH | `/toggle/publish/:videoId` | yes, owner | flips `isPublished` |

### Comments `/comments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/:videoId?page&limit` | no | `404` if video missing; `limit` capped at 50 |
| POST | `/:videoId` | yes | `content` required |
| PATCH/DELETE | `/c/:commentId` | yes, owner | edit `content` / delete |

### Likes `/likes` (all auth)

- `POST /toggle/v/:videoId`, `POST /toggle/c/:commentId`, `POST /toggle/t/:tweetId` → `{ isLiked }`
- `GET /videos` → liked videos with owner lookup

### Tweets `/tweets`

- `POST /` (auth, `content`) · `GET /user/:userId` (public feed, newest first)
- `PATCH /:tweetId`, `DELETE /:tweetId` (auth, owner)

### Playlists `/playlists`

- `POST /` (auth, `name, description`)
- `GET /user/:userId` (summaries) · `GET /:playlistId` (videos + owners)
- `PATCH /:playlistId`, `DELETE /:playlistId` (auth, owner)
- `PATCH /add/:videoId/:playlistId` (`$addToSet`), `PATCH /remove/:videoId/:playlistId` (`$pull`) (auth, owner)

### Subscriptions `/subscriptions`

- `POST /toggle/c/:channelId` (auth; self-sub blocked) → `{ isSubscribed }`
- `GET /channel/:channelId` (public subscriber list)
- `GET /subscribed/:subscriberId` (public channel list)

## Known limitations

- `DELETE /videos/:id` does not cascade (likes, comments, playlist refs, history, Cloudinary assets remain).
- Like/subscription toggles rely on unique indexes; concurrent duplicate creates resolve idempotently to liked/subscribed.
