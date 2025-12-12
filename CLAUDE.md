# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xracing dashboard is a KPI analytics dashboard for the xracing racing application. It displays real-time metrics about users, recordings, tracks, events, and social engagement from a PostgreSQL database.

## Commands

```bash
# Install dependencies
npm install

# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server runs on port 3000 by default (configurable via `PORT` environment variable).

## Architecture

**Backend** (`src/`):
- `server.js` - Express server exposing REST API endpoints under `/api/*`
- `db.js` - PostgreSQL connection pool using `pg` library
- `queries.js` - SQL queries for all dashboard metrics (user stats, recordings, tracks, social metrics, etc.)

**Frontend** (`public/`):
- `index.html` - Single-page dashboard using Tailwind CSS and Chart.js (loaded via CDN)
- `app.js` - Client-side JavaScript that fetches API data and renders charts/tables

**Data Flow**: Frontend fetches from `/api/*` endpoints → Express routes call query functions → queries.js executes SQL against PostgreSQL → results rendered as charts (Chart.js) and tables.

## Environment Variables

Required in `.env`:
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` - PostgreSQL connection
- `APP_ENV` - Environment (`DEV`, `QA`, `PROD`). SSL enabled for QA/PROD.

## Database Schema Context

The dashboard queries these main tables:
- `users` / `user_stats` - User accounts and aggregated statistics
- `recordings` / `laps` - Racing session data
- `tracks` / `track_stats` - Track information and statistics
- `events` - Track day events
- `likes`, `comments`, `user_relationships` - Social features
- `media` - Uploaded images/videos

Recording status values: `0` = LIVE, other values = completed states.

## Main app
The main app is located in /Users/tiago/Documents/personal/xracing/backend/
