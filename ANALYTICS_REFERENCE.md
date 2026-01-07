# xracing Analytics Reference

This document describes the analytics implementation in the main xracing app, useful for building and tuning the analytics dashboard.

## Overview

- **Library**: Firebase Analytics (v2.4.0) via GitLive Kotlin Multiplatform
- **Production Bundle ID**: `com.filipecarvalho.xracing8`
- **GA4 Property ID**: 474857535
- **Environment Behavior**: Only PROD logs to Firebase; DEV/QA log to console only

---

## Events

### App Lifecycle

| Event | ID | Parameters |
|-------|-----|------------|
| App Launch | `APP_LAUNCH` | - |
| App Foreground | `APP_FOREGROUND` | - |
| App Background | `APP_BACKGROUND` | - |
| App Close | `APP_CLOSE` | - |

### Authentication

| Event | ID | Parameters |
|-------|-----|------------|
| Login | `LOGIN` | `method` ("email", "google", "apple") |
| Sign Up | `SIGN_UP` | `method` ("email", "google", "apple") |

### Recording Lifecycle

| Event | ID | Key Parameters |
|-------|-----|----------------|
| Recording Start Attempt | `RECORDING_START_ATTEMPT` | `screen_name`, `has_track`, `has_enriched_metadata`, `track_type` |
| Recording Started | `RECORDING_STARTED` | Same as above |
| Recording Start Failed | `RECORDING_START_FAILED` | `failure_stage`, `error_type`, `error_message` |
| Recording Completed | `RECORDING_COMPLETED` | `recording_id`, `duration_seconds`, `data_points_count`, `lap_count`, `has_fastest_lap`, `is_crash_recovery`, `has_track` |
| Recording Stop Failed | `RECORDING_STOP_FAILED` | `recording_id`, `failure_stage`, `error_type`, `error_message` |
| Recording Deleted | `RECORDING_DELETED` | - |
| Recording Resumed | `RECORDING_RESUMED` | Recovery params |
| Recording Resume Failed | `RECORDING_RESUME_FAILED` | Error details |
| Recording Recovery Discarded | `RECORDING_RECOVERY_DISCARDED` | - |
| Recording Recovery Saved | `RECORDING_RECOVERY_SAVED` | - |

### Recording Technical Events

| Event | ID | Purpose |
|-------|-----|---------|
| Metadata Enrichment Completed | `METADATA_ENRICHMENT_COMPLETED` | Location/weather enrichment success |
| Metadata Enrichment Failed | `METADATA_ENRICHMENT_FAILED` | Enrichment error |
| Location Buffer Overflow | `RECORDING_LOCATION_BUFFER_OVERFLOW` | Memory issue detected |
| Max Entries Reached | `RECORDING_MAX_ENTRIES_REACHED` | 65536 GPS points limit |
| Realtime Update Failed | `RECORDING_REALTIME_UPDATE_FAILED` | Firebase sync failure |
| Media Upload Completed | `RECORDING_MEDIA_UPLOAD_COMPLETED` | `media_type`, `upload_stage` |
| Media Upload Failed | `RECORDING_MEDIA_UPLOAD_FAILED` | `media_type`, `error_type` |
| Recording Poll Completed | `RECORDING_POLL_COMPLETED` | Status polling success |
| Recording Poll Failed | `RECORDING_POLL_FAILED` | Status polling error |

### Android Service Events (Android Only)

| Event | ID | Key Parameters |
|-------|-----|----------------|
| Service Destroyed | `RECORDING_SERVICE_DESTROYED` | `termination_reason`, `service_uptime_seconds`, `location_updates_count`, `device_manufacturer`, `device_model`, `was_normal_stop` |
| Service Task Removed | `RECORDING_SERVICE_TASK_REMOVED` | Same as above |
| Service Low Memory | `RECORDING_SERVICE_LOW_MEMORY` | Same as above |

### UI Interaction Events

| Event | ID | Parameters |
|-------|-----|------------|
| List Refresh | `LIST_REFRESH` | `screen_name` |
| Item Click | `ITEM_CLICK` | `screen_name`, `item_type`, `item_id` |
| Map Interaction | `MAP_INTERACTION` | `screen_name`, `interaction_type` |
| Button Click | `BUTTON_CLICK` | `screen_name`, `action_type` |
| Tab Click | `TAB_CLICK` | `screen_name`, `action_type` |

### User Search Events

| Event | ID | Parameters |
|-------|-----|------------|
| User Search Query | `USER_SEARCH_QUERY` | `search_query`, `search_results_count` |
| User Search Result Click | `USER_SEARCH_RESULT_CLICK` | `item_type`, `item_id`, `user_id` |
| User Search Follow Toggle | `USER_SEARCH_FOLLOW_TOGGLE` | `follow_action`, `user_id` |

### Other Events

| Event | ID | Parameters |
|-------|-----|------------|
| Tutorial Complete | `TUTORIAL_COMPLETE` | - |
| Explore | `EXPLORE` | - |
| Share | `SHARE` | `content_type` ("recording", "event", "track") |

---

## Screens (34 total)

All screen views are tracked with `screen_name` and `timestamp` parameters.

| Screen | ID |
|--------|-----|
| Splash | `splash` |
| Welcome | `welcome` |
| Login | `login` |
| Sign Up | `sign_up` |
| Complete Profile | `complete_profile` |
| Forgot Password | `forgot_password` |
| Recover Password | `recover_password` |
| Home Feed | `home_feed` |
| Leaderboard | `leaderboard` |
| Social Activity | `social_activity` |
| Profile | `profile` |
| Followers/Following | `followers_following` |
| User Search | `user_search` |
| All Recordings | `profile_all_recordings` |
| Recording Review | `recording_review` |
| Live Recording | `live_recording` |
| Track Live | `track_live` |
| Track Home | `track_home` |
| Recording | `recording` |
| Track Selector | `track_selector` |
| Track Creator | `track_creator` |
| Settings | `settings` |
| Notifications Settings | `notifications_settings` |
| Delete Account | `delete_account` |
| Onboarding | `onboarding` |
| Legal Documents | `legal` |
| Comments | `comments` |
| Event Details | `event_details` |
| Explore | `explore` |
| Car | `car` |

---

## Action Types (263 total)

Organized by feature area:

### Recording Actions
- `RECORDING_START`, `RECORDING_STOP`, `SELECT_TRACK`, `VIEW_RECORDING`
- `RECORDING_TYPE_LIVE`, `RECORDING_TYPE_OLD`, `RECORDING_TYPE_TRACK`

### Feed Actions (35+)
- `FEED_OPEN_RECORDING`, `FEED_OPEN_COMMENTS`, `FEED_LIKE`, `FEED_UNLIKE`
- `FEED_SHARE`, `FEED_SHARE_INSTAGRAM`, `FEED_SHARE_WHATSAPP`
- `FEED_SEND_COMMENT`, `FEED_LOAD_MORE`, `FEED_SCROLL_TO_TOP`

### Authentication Actions
- `LOGIN_SUBMIT`, `LOGIN_GOOGLE`, `LOGIN_APPLE`, `LOGIN_SUCCESS`, `LOGIN_ERROR`
- `LOGIN_GOOGLE_SUCCESS`, `LOGIN_GOOGLE_CANCELLED`, `LOGIN_APPLE_ERROR`
- `SIGN_UP_SUBMIT`, `SIGN_UP_GOOGLE`, `SIGN_UP_LEGAL_TOGGLE`

### Profile Actions
- `PROFILE_SETTINGS`, `PROFILE_FOLLOW_USER`, `PROFILE_UNFOLLOW_USER`
- `PROFILE_VIEW_MEDIA`, `PROFILE_DELETE_MEDIA`, `PROFILE_COPY_USERNAME`
- `PROFILE_SHARE`, `PROFILE_MEDIA_DOWNLOAD`, `PROFILE_MEDIA_SHARE`

### Track Actions
- `CREATE_TRACK`, `SELECT_CIRCUIT`, `SELECT_POINT_TO_POINT`
- `TRACK_STEP_1_COMPLETE`, `TRACK_STEP_2_COMPLETE`, `TRACK_CREATION_COMPLETE`
- `TRACK_LIVE_VIEW_DRIVER`, `TRACK_LIVE_FEED`, `TRACK_HOME_SELECT_TAB`

### Recording Review Actions (18+)
- `RECORDING_REVIEW_SELECT_LAP`, `RECORDING_REVIEW_DELETE`
- `RECORDING_REVIEW_SHARE`, `RECORDING_REVIEW_LIKE`, `RECORDING_REVIEW_UNLIKE`
- `RECORDING_REVIEW_OPEN_CAMERA`, `RECORDING_REVIEW_OPEN_GALLERY`
- `RECORDING_REVIEW_MEDIA_DOWNLOAD`, `RECORDING_REVIEW_MEDIA_SHARE`

### Settings & Account
- `SETTINGS_DELETE_ACCOUNT`, `SETTINGS_LOGOUT`, `SETTINGS_DELETE_MEDIA`
- `SETTINGS_DELETE_RECORDINGS`, `SETTINGS_DELETE_RECORDINGS_CONFIRM`
- `SETTINGS_TERMS_AND_CONDITIONS`, `SETTINGS_PRIVACY_POLICY`

### Leaderboard
- `LEADERBOARD_OPEN_TRACK`, `LEADERBOARD_OPEN_DRIVER`, `LEADERBOARD_SELECT_TAB`

### Social Activity
- `SOCIAL_ACTIVITY_PROFILE_CLICK`, `SOCIAL_ACTIVITY_RECORDING_CLICK`
- `SOCIAL_ACTIVITY_MARK_ALL_READ`, `SOCIAL_ACTIVITY_REFRESH`, `SOCIAL_ACTIVITY_LOAD_MORE`

### Event Details
- `EVENT_DETAILS_LIKE`, `EVENT_DETAILS_UNLIKE`, `EVENT_DETAILS_COMMENT`
- `EVENT_DETAILS_SHARE`, `EVENT_DETAILS_MEDIA_DOWNLOAD`, `EVENT_DETAILS_MEDIA_SHARE`

### Onboarding & Recovery
- `ONBOARDING_SKIPPED`, `ONBOARDING_COMPLETED`
- `RECOVERY_DIALOG_RESUME`, `RECOVERY_DIALOG_SAVE`

---

## Parameters (68 total)

### Core Parameters
| Parameter | Description |
|-----------|-------------|
| `screen_name` | Screen where event occurred |
| `item_type` | Type of item interacted with |
| `item_id` | ID of item |
| `action_type` | Specific action taken |
| `method` | Auth method: "email", "google", "apple" |
| `content_type` | Share content: "recording", "event", "track" |
| `timestamp` | Event timestamp (ms) |
| `track_type` | "circuit" or "point_to_point" |

### Recording Parameters
| Parameter | Description |
|-----------|-------------|
| `recording_id` | Unique recording ID |
| `has_track` | Boolean - track was selected |
| `has_enriched_metadata` | Boolean - metadata enriched |
| `failure_stage` | Where failure occurred |
| `error_type` | Exception class name |
| `error_message` | Error description (max 100 chars) |
| `duration_seconds` | Recording length |
| `data_points_count` | GPS data points count |
| `lap_count` | Laps detected |
| `has_fastest_lap` | Boolean - fastest lap achieved |
| `is_crash_recovery` | Boolean - session recovered |

### Search Parameters
| Parameter | Description |
|-----------|-------------|
| `search_query` | Search query string |
| `search_results_count` | Results returned |
| `user_id` | User ID |
| `follow_action` | "follow" or "unfollow" |

### Service Parameters (Android)
| Parameter | Description |
|-----------|-------------|
| `termination_reason` | Why service stopped |
| `service_uptime_seconds` | Service runtime |
| `location_updates_count` | GPS updates received |
| `device_manufacturer` | Phone manufacturer |
| `device_model` | Phone model |
| `android_version` | OS version |
| `was_normal_stop` | User-initiated vs killed |

---

## User Properties

Currently tracked:
- `userId` - Set on login, cleared on logout

Automatic (Firebase):
- Device model
- OS version
- App version
- Language
- Country

---

## Dashboard Integration Ideas

### High-Value Metrics to Display

1. **Recording Funnel**
   - Start attempts vs completed
   - Failure rate by stage
   - Avg duration, lap count

2. **Authentication**
   - Sign up by method (email/google/apple)
   - Login success rate

3. **Engagement**
   - Screen flow analysis
   - Most visited screens
   - Social actions (likes, comments, shares)

4. **Technical Health**
   - Recording failures by error type
   - Service termination reasons (Android)
   - Media upload success rate

5. **Feature Adoption**
   - Track creation completion rate
   - Search usage
   - Share activity by platform

### Useful GA4 Queries

```javascript
// Recording completion rate
events: RECORDING_START_ATTEMPT, RECORDING_COMPLETED

// Auth method breakdown
events: LOGIN, SIGN_UP
dimension: method

// Screen popularity
dimension: unifiedScreenName (maps to screen_name)

// Error tracking
events: RECORDING_START_FAILED, RECORDING_STOP_FAILED
dimension: error_type, failure_stage

// Social engagement
events: BUTTON_CLICK
filter: action_type contains "LIKE" or "COMMENT" or "SHARE"
```

---

## Source Files (Main App)

**Core Implementation**:
- `composeApp/.../core/analytics/AnalyticsHelper.kt` - Interface
- `composeApp/.../core/analytics/impl/FirebaseAnalyticsHelper.kt` - Firebase impl

**Model Classes**:
- `composeApp/.../core/analytics/model/AnalyticsEvent.kt` - 76 events
- `composeApp/.../core/analytics/model/AnalyticsParam.kt` - 68 parameters
- `composeApp/.../core/analytics/model/AnalyticsScreen.kt` - 34 screens
- `composeApp/.../core/analytics/model/AnalyticsActionType.kt` - 263 action types
