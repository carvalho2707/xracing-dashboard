const admin = require('firebase-admin');
const path = require('path');
const queries = require('./queries');

// Environment config
const databaseURL = process.env.FIREBASE_DATABASE_URL;
const rtdbPath = process.env.FIREBASE_RTDB_PATH || 'recordings_live';

let db = null;

function initFirebase() {
  if (db) return db;

  if (!databaseURL) {
    console.warn('Firebase database URL not configured');
    return null;
  }

  try {
    let credentials;

    // Support multiple credential formats (same pattern as bigquery.js)
    if (process.env.FIREBASE_CREDENTIALS_BASE64) {
      // Production: base64 encoded JSON
      const decoded = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf8');
      credentials = JSON.parse(decoded);
      console.log('Firebase: Using base64 credentials');
    } else if (process.env.FIREBASE_CREDENTIALS_JSON) {
      // Alternative: raw JSON string
      credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
      console.log('Firebase: Using JSON credentials');
    } else if (process.env.FIREBASE_CREDENTIALS_PATH) {
      // Development: file path
      credentials = require(path.resolve(process.env.FIREBASE_CREDENTIALS_PATH));
      console.log('Firebase: Using credentials file');
    } else {
      console.warn('Firebase credentials not configured');
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      databaseURL: databaseURL
    });

    db = admin.database();
    console.log('Firebase RTDB connected');
    return db;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    return null;
  }
}

// Get the base path for recordings
function getBasePath() {
  return rtdbPath;
}

// Status constants (matching RecordingLiveStatus from Kotlin)
const LIVE_STATUS = '0';
const UPLOADING_STATUS = '1';
const ENDED_STATUS = '2';

/**
 * Get all live track recordings with viewer counts
 * Returns: Array of track summaries with recordings
 */
async function getLiveTrackRecordings() {
  const database = initFirebase();
  if (!database) return [];

  try {
    const tracksRef = database.ref(`${getBasePath()}/tracks`);
    const snapshot = await tracksRef.once('value');

    if (!snapshot.exists()) return [];

    const tracks = [];

    snapshot.forEach((trackSnapshot) => {
      const trackId = trackSnapshot.key;
      const trackData = trackSnapshot.val();

      if (!trackData) return;

      const recordings = [];
      let liveCount = 0;

      // Iterate through recordings in this track
      Object.entries(trackData).forEach(([key, value]) => {
        // Skip non-recording fields
        if (key === 'eventId' || key === 'totalViewCount' || key === 'viewers') return;

        const metadata = value?.metadata;
        if (!metadata) return;

        const status = metadata.s;
        if (status === LIVE_STATUS) {
          liveCount++;
          recordings.push({
            recordingId: key,
            driverName: metadata.driverName || metadata.dn || 'Unknown',
            status: status,
            carName: metadata.carName || metadata.cn || null,
          });
        }
      });

      // Only include tracks with live recordings
      if (liveCount > 0) {
        // Count current viewers from presence
        const viewerCount = trackData.viewers ? Object.keys(trackData.viewers).length : 0;

        tracks.push({
          trackId: trackId,
          eventId: trackData.eventId || null,
          totalViewCount: trackData.totalViewCount || 0,
          currentViewers: viewerCount,
          liveRecordingsCount: liveCount,
          recordings: recordings
        });
      }
    });

    return tracks;
  } catch (error) {
    console.error('Error fetching live track recordings:', error);
    return [];
  }
}

/**
 * Get all live noTrack recordings with viewer counts
 * Returns: Array of recordings without track association
 */
async function getLiveNoTrackRecordings() {
  const database = initFirebase();
  if (!database) return [];

  try {
    const noTrackRef = database.ref(`${getBasePath()}/noTrack`);
    const snapshot = await noTrackRef.orderByChild('metadata/s').equalTo(LIVE_STATUS).once('value');

    if (!snapshot.exists()) return [];

    const recordings = [];

    snapshot.forEach((recordingSnapshot) => {
      const recordingId = recordingSnapshot.key;
      const data = recordingSnapshot.val();

      if (!data || !data.metadata) return;

      const metadata = data.metadata;
      const viewerCount = data.viewers ? Object.keys(data.viewers).length : 0;

      recordings.push({
        recordingId: recordingId,
        driverName: metadata.driverName || metadata.dn || 'Unknown',
        status: metadata.s,
        carName: metadata.carName || metadata.cn || null,
        locationCity: metadata.locationCity || metadata.lc || null,
        locationCountry: metadata.locationCountry || metadata.lco || null,
        totalViewCount: data.totalViewCount || 0,
        currentViewers: viewerCount,
        position: data.position ? {
          lat: data.position.lat || data.position.la,
          lng: data.position.lng || data.position.lo
        } : null
      });
    });

    return recordings;
  } catch (error) {
    console.error('Error fetching noTrack recordings:', error);
    return [];
  }
}

/**
 * Get combined live summary stats with track names and recording details from PostgreSQL
 */
async function getLiveSummary() {
  const [trackRecordings, noTrackRecordings] = await Promise.all([
    getLiveTrackRecordings(),
    getLiveNoTrackRecordings()
  ]);

  // Collect all recording IDs for enrichment
  const allRecordingIds = [];
  trackRecordings.forEach(track => {
    track.recordings.forEach(rec => allRecordingIds.push(rec.recordingId));
  });
  noTrackRecordings.forEach(rec => allRecordingIds.push(rec.recordingId));

  // Enrich data from PostgreSQL
  try {
    // Get track names
    if (trackRecordings.length > 0) {
      const trackIds = trackRecordings.map(t => t.trackId);
      const trackMap = await queries.getTracksByIds(trackIds);
      trackRecordings.forEach(track => {
        const dbTrack = trackMap[track.trackId];
        if (dbTrack) {
          track.trackName = dbTrack.name;
          track.locationCity = dbTrack.locationCity;
          track.locationCountry = dbTrack.locationCountry;
        }
      });
    }

    // Get recording details
    if (allRecordingIds.length > 0) {
      const recordingMap = await queries.getRecordingsByIds(allRecordingIds);

      // Enrich track recordings
      trackRecordings.forEach(track => {
        track.recordings.forEach(rec => {
          const dbRec = recordingMap[rec.recordingId];
          if (dbRec) {
            rec.username = dbRec.username || `${dbRec.firstName || ''} ${dbRec.lastName || ''}`.trim();
            rec.startTime = dbRec.createdAt;
            rec.dbStatus = dbRec.status;
          }
        });
      });

      // Enrich noTrack recordings
      noTrackRecordings.forEach(rec => {
        const dbRec = recordingMap[rec.recordingId];
        if (dbRec) {
          rec.username = dbRec.username || `${dbRec.firstName || ''} ${dbRec.lastName || ''}`.trim();
          rec.startTime = dbRec.createdAt;
          rec.dbStatus = dbRec.status;
        }
      });
    }
  } catch (error) {
    console.error('Error enriching data from PostgreSQL:', error);
  }

  const trackLiveCount = trackRecordings.reduce((sum, t) => sum + t.liveRecordingsCount, 0);
  const trackViewers = trackRecordings.reduce((sum, t) => sum + t.currentViewers, 0);
  const trackTotalViews = trackRecordings.reduce((sum, t) => sum + (t.totalViewCount || 0), 0);
  const noTrackViewers = noTrackRecordings.reduce((sum, r) => sum + r.currentViewers, 0);
  const noTrackTotalViews = noTrackRecordings.reduce((sum, r) => sum + (r.totalViewCount || 0), 0);

  return {
    tracks: {
      activeTracksCount: trackRecordings.length,
      liveRecordingsCount: trackLiveCount,
      currentViewers: trackViewers,
      totalViews: trackTotalViews,
      data: trackRecordings
    },
    noTrack: {
      liveRecordingsCount: noTrackRecordings.length,
      currentViewers: noTrackViewers,
      totalViews: noTrackTotalViews,
      data: noTrackRecordings
    },
    totals: {
      liveRecordingsCount: trackLiveCount + noTrackRecordings.length,
      currentViewers: trackViewers + noTrackViewers,
      totalViews: trackTotalViews + noTrackTotalViews
    }
  };
}

module.exports = {
  initFirebase,
  getLiveTrackRecordings,
  getLiveNoTrackRecordings,
  getLiveSummary,
  LIVE_STATUS,
  UPLOADING_STATUS,
  ENDED_STATUS
};
