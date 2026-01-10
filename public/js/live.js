// Live page specific JavaScript - RTDB-powered

// Copy recording ID to clipboard
async function copyRecordingId(recordingId, element) {
  try {
    await navigator.clipboard.writeText(recordingId);
    // Show feedback
    const originalText = element.textContent;
    element.textContent = 'Copied!';
    element.classList.add('text-green-400');
    setTimeout(() => {
      element.textContent = originalText;
      element.classList.remove('text-green-400');
    }, 1000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Status helpers
// RTDB status: 0=LIVE, 1=UPLOADING, 2=ENDED
// DB status: 0=LIVE, 1=UPLOADING, 2=ENDED, etc.
function getRTDBStatusName(status) {
  if (status === '0') return 'LIVE';
  if (status === '1') return 'UPLOADING';
  if (status === '2') return 'ENDED';
  return 'MIGRATED';
}

function getRTDBStatusColor(status) {
  if (status === '0') return 'bg-red-500';
  if (status === '1') return 'bg-yellow-500';
  if (status === '2') return 'bg-green-500';
  return 'bg-gray-500';
}

function getDBStatusName(status) {
  if (status === 0) return 'LIVE';
  if (status === 1) return 'UPLOADING';
  if (status === 2) return 'ENDED';
  if (status === 3) return 'FAILED';
  if (status === 4) return 'PROCESSED';
  return `${status}`;
}

function getDBStatusColor(status) {
  if (status === 0) return 'bg-red-500';
  if (status === 1) return 'bg-yellow-500';
  if (status === 2) return 'bg-green-500';
  if (status === 3) return 'bg-red-700';
  if (status === 4) return 'bg-blue-500';
  return 'bg-gray-500';
}

// Fetch RTDB live data and update the UI
async function updateRTDBLiveData() {
  const data = await fetchData('rtdb/live');
  console.log('[updateRTDBLiveData] API response:', data);
  console.log('[updateRTDBLiveData] noTrack data:', data?.noTrack);
  if (!data) {
    console.warn('No RTDB data available');
    return;
  }

  // Update summary stats - show both live and total
  const liveCount = data.totals?.liveRecordingsCount || 0;
  const totalCount = data.totals?.totalRecordingsCount || 0;
  document.getElementById('totalLiveCount').textContent = liveCount;
  document.getElementById('totalRecordingsCount').textContent = totalCount;
  document.getElementById('totalViews').textContent = data.totals?.totalViews || 0;
  document.getElementById('activeTracksCount').textContent = data.tracks?.activeTracksCount || 0;
  document.getElementById('noTrackCount').textContent = data.noTrack?.totalRecordingsCount || 0;
  document.getElementById('noTrackLiveCount').textContent = data.noTrack?.liveRecordingsCount || 0;

  // Update track section
  document.getElementById('trackTotalViews').textContent = data.tracks?.totalViews || 0;
  document.getElementById('trackViewerCount').textContent = data.tracks?.currentViewers || 0;
  const trackTotal = data.tracks?.totalRecordingsCount || 0;
  const trackLive = data.tracks?.liveRecordingsCount || 0;
  document.getElementById('trackRecordingsCount').textContent =
    `${trackTotal} recording${trackTotal !== 1 ? 's' : ''} (${trackLive} live)`;

  renderTrackRecordings(data.tracks?.data || []);

  // Update noTrack section
  document.getElementById('noTrackTotalViews').textContent = data.noTrack?.totalViews || 0;
  document.getElementById('noTrackViewerCount').textContent = data.noTrack?.currentViewers || 0;
  const noTrackTotal = data.noTrack?.totalRecordingsCount || 0;
  const noTrackLive = data.noTrack?.liveRecordingsCount || 0;
  document.getElementById('noTrackRecordingsCount').textContent =
    `${noTrackTotal} recording${noTrackTotal !== 1 ? 's' : ''} (${noTrackLive} live)`;

  renderNoTrackRecordings(data.noTrack?.data || []);
}

// Render track recordings grouped by track
function renderTrackRecordings(tracks) {
  const container = document.getElementById('trackRecordingsContainer');

  if (!tracks || tracks.length === 0) {
    container.innerHTML = `<div class="py-8 text-center text-racing-muted">No track day recordings today</div>`;
    return;
  }

  container.innerHTML = tracks.map(track => `
    <div class="mb-4 last:mb-0">
      <div class="flex items-center justify-between p-3 bg-racing-dark/50 rounded-t-lg border-b border-racing-border/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
          </div>
          <div>
            <p class="text-white font-medium">${track.trackName || track.trackId}</p>
            ${track.locationCity || track.locationCountry ?
              `<p class="text-xs text-racing-muted">${[track.locationCity, track.locationCountry].filter(Boolean).join(', ')}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-racing-muted text-sm" title="Total Views">
            ${track.totalViewCount || 0} views
          </span>
          <span class="text-cyan-400 text-sm" title="Current Viewers">
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            ${track.currentViewers} watching
          </span>
          <span class="text-xs px-2 py-1 rounded bg-racing-card text-racing-muted">
            ${track.totalRecordingsCount || track.recordings.length} total
          </span>
          ${track.liveRecordingsCount > 0 ? `
          <span class="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
            ${track.liveRecordingsCount} live
          </span>` : ''}
        </div>
      </div>
      <div class="bg-racing-dark/30 rounded-b-lg overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-racing-muted text-sm border-b border-racing-border/50">
              <th class="text-left py-2 px-3">Recording</th>
              <th class="text-left py-2 px-3">Driver</th>
              <th class="text-left py-2 px-3">Start Time</th>
              <th class="text-left py-2 px-3">RTDB</th>
              <th class="text-left py-2 px-3">DB</th>
            </tr>
          </thead>
          <tbody>
            ${track.recordings.map(rec => `
              <tr class="border-b border-racing-border/30 last:border-0 hover:bg-racing-border/20">
                <td class="py-2 px-3">
                  <span class="text-racing-muted text-xs font-mono cursor-pointer hover:text-white transition-colors"
                        onclick="copyRecordingId('${rec.recordingId}', this)"
                        title="Click to copy: ${rec.recordingId}">${rec.recordingId.substring(0, 8)}...</span>
                </td>
                <td class="py-2 px-3">
                  <span class="text-white text-sm">${rec.username || rec.driverName}</span>
                </td>
                <td class="py-2 px-3 text-racing-muted text-sm">${rec.startTime ? formatDateTime(rec.startTime) : '-'}</td>
                <td class="py-2 px-3">
                  <span class="px-2 py-1 rounded text-xs font-medium text-white ${getRTDBStatusColor(rec.status)}">${getRTDBStatusName(rec.status)}</span>
                </td>
                <td class="py-2 px-3">
                  <span class="px-2 py-1 rounded text-xs font-medium text-white ${getDBStatusColor(rec.dbStatus)}">${getDBStatusName(rec.dbStatus)}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}

// Render noTrack recordings table
function renderNoTrackRecordings(recordings) {
  console.log('[renderNoTrackRecordings] Received recordings:', recordings?.length, recordings);
  const tbody = document.getElementById('noTrackTable');

  if (!recordings || recordings.length === 0) {
    console.log('[renderNoTrackRecordings] No recordings to render');
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-racing-muted">No free driving recordings today</td></tr>';
    return;
  }
  console.log('[renderNoTrackRecordings] Rendering', recordings.length, 'recordings');

  tbody.innerHTML = recordings.map(rec => {
    return `
      <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
        <td class="py-3 px-2">
          <span class="text-racing-muted text-xs font-mono cursor-pointer hover:text-white transition-colors"
                onclick="copyRecordingId('${rec.recordingId}', this)"
                title="Click to copy: ${rec.recordingId}">${rec.recordingId.substring(0, 8)}...</span>
        </td>
        <td class="py-3 px-2">
          <span class="text-white font-medium">${rec.username || rec.driverName}</span>
        </td>
        <td class="py-3 px-2 text-racing-muted text-sm">${rec.startTime ? formatDateTime(rec.startTime) : '-'}</td>
        <td class="py-3 px-2">
          <span class="px-2 py-1 rounded text-xs font-medium text-white ${getRTDBStatusColor(rec.status)}">${getRTDBStatusName(rec.status)}</span>
        </td>
        <td class="py-3 px-2">
          <span class="px-2 py-1 rounded text-xs font-medium text-white ${getDBStatusColor(rec.dbStatus)}">${getDBStatusName(rec.dbStatus)}</span>
        </td>
        <td class="py-3 px-2 text-right">
          <span class="text-cyan-400 font-medium">${rec.currentViewers}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await updateRTDBLiveData();

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 30 seconds for live data
setInterval(refreshData, 30000);
