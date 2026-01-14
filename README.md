# xracing Dashboard

A real-time KPI analytics dashboard for [xracing](https://xracing.app), a mobile and web racing application. Track user growth, recording activity, social engagement, and app analytics all in one place.

## Features

- **Home Dashboard** - Overview of key metrics: users, recordings, tracks, events, and social stats
- **Live Monitoring** - Real-time view of active recording sessions via Firebase Realtime Database
- **Analytics** - GA4 integration showing DAU/WAU/MAU, retention, traffic sources, and device breakdown
- **KPIs** - Product analytics with activation metrics, retention cohorts, and feature adoption
- **Screen Analysis** - BigQuery-powered analysis of user behavior by screen and action type
- **User Timeline** - Detailed event timeline for individual users
- **Web Analytics** - Marketing website traffic and engagement metrics
- **Tables** - Detailed data tables for users, tracks, recordings, and events

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL (main application data)
- Google Analytics 4 Data API
- Google BigQuery (detailed event analysis)
- Firebase Admin SDK (real-time data)

**Frontend:**
- Vanilla JavaScript
- Tailwind CSS
- Chart.js

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database with xracing schema
- Google Cloud project with GA4 and BigQuery access (optional)
- Firebase project (optional, for live monitoring)

### Installation

```bash
# Clone the repository
git clone https://github.com/carvalho2707/xracing-dashboard.git
cd xracing-dashboard

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following:

```env
# PostgreSQL Connection (required)
PGHOST=localhost
PGPORT=5432
PGDATABASE=xracing
PGUSER=your_user
PGPASSWORD=your_password

# Environment (DEV, QA, PROD) - enables SSL for QA/PROD
APP_ENV=DEV

# Google Analytics 4 (optional)
GA4_PROPERTY_ID=properties/123456789
GA4_CREDENTIALS_BASE64=<base64-encoded-service-account-json>
# Or use one of these alternatives:
# GA4_CREDENTIALS_JSON=<raw-json-string>
# GA4_CREDENTIALS_PATH=./path/to/credentials.json

# BigQuery (optional - uses same credentials as GA4)
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET=analytics_123456789

# Firebase (optional - for live monitoring)
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_CREDENTIALS_BASE64=<base64-encoded-service-account-json>
# Or use alternatives similar to GA4
```

### Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The dashboard will be available at `http://localhost:3000`

## API Endpoints

### Core Metrics
| Endpoint | Description |
|----------|-------------|
| `GET /api/overview` | Dashboard overview stats |
| `GET /api/user-growth` | User registration over time |
| `GET /api/recording-activity` | Recording sessions over time |
| `GET /api/social-metrics` | Likes, comments, follows |
| `GET /api/top-tracks` | Most popular tracks |
| `GET /api/top-drivers` | Most active drivers |

### Live Monitoring
| Endpoint | Description |
|----------|-------------|
| `GET /api/live` | Current live recordings (from PostgreSQL) |
| `GET /api/rtdb/live` | Real-time recordings (from Firebase) |

### GA4 Analytics
| Endpoint | Description |
|----------|-------------|
| `GET /api/ga4/overview` | GA4 overview metrics |
| `GET /api/ga4/daily-users` | DAU trend |
| `GET /api/ga4/retention` | User retention metrics |
| `GET /api/ga4/screens` | Top screens by views |

### Product Analytics
| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/activation` | Activation funnel metrics |
| `GET /api/analytics/retention` | D1/D7/D30 retention cohorts |
| `GET /api/analytics/active-users` | DAU/WAU/MAU stickiness |

## Database Schema

The dashboard queries these main tables from the xracing PostgreSQL database:

- `users` / `user_stats` - User accounts and statistics
- `recordings` / `laps` - Racing session data
- `tracks` / `track_stats` - Track information
- `events` - Track day events
- `likes`, `comments`, `user_relationships` - Social features
- `media` - Uploaded images/videos

## Project Structure

```
xracing-dashboard/
├── src/
│   ├── server.js      # Express server and API routes
│   ├── db.js          # PostgreSQL connection pool
│   ├── queries.js     # SQL queries for all metrics
│   ├── ga4.js         # Google Analytics 4 integration
│   ├── bigquery.js    # BigQuery for detailed analytics
│   └── firebase.js    # Firebase Realtime Database
├── public/
│   ├── index.html     # Home dashboard
│   ├── live.html      # Live monitoring
│   ├── analytics.html # GA4 analytics
│   ├── kpis.html      # Product KPIs
│   ├── tables.html    # Data tables
│   ├── js/            # Frontend JavaScript
│   └── css/           # Stylesheets
└── package.json
```

## License

ISC
