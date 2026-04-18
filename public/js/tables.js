// Tables page specific JavaScript

// Update top tracks table
async function updateTopTracks() {
  const data = await fetchData('top-tracks');
  if (!data) return;

  const tbody = document.getElementById('topTracksTable');
  tbody.innerHTML = data.map((track, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">${track.name || 'Unnamed'}</span>
        <span class="ml-2 text-xs px-2 py-0.5 rounded ${track.type === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">
          ${track.type === 0 ? 'Open' : 'Closed'}
        </span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${track.location_city ? `${track.location_city}, ` : ''}${track.location_country || '-'}
      </td>
      <td class="py-3 px-2 text-right text-white">${formatNumber(parseInt(track.recordings_count))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(track.unique_drivers_count))}</td>
    </tr>
  `).join('');
}

// Update top drivers table
async function updateTopDrivers() {
  const data = await fetchData('top-drivers');
  if (!data) return;

  const tbody = document.getElementById('topDriversTable');
  tbody.innerHTML = data.map((driver, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">
          ${driver.username || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Anonymous'}
        </span>
      </td>
      <td class="py-3 px-2 text-right text-white">${formatNumber(parseInt(driver.total_recordings))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(driver.tracks_raced))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(driver.follower_count))}</td>
    </tr>
  `).join('');
}

// Update top viewed recordings table
async function updateTopViewedRecordings() {
  const data = await fetchData('top-viewed-recordings');
  if (!data) return;

  const tbody = document.getElementById('topViewedRecordingsTable');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-racing-muted">No viewed recordings yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((rec, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">
          ${rec.driver_username || `${rec.driver_first_name || ''} ${rec.driver_last_name || ''}`.trim() || 'Anonymous'}
        </span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${rec.track_name || [rec.location_city, rec.location_country].filter(Boolean).join(', ') || '-'}
      </td>
      <td class="py-3 px-2 text-right text-cyan-400 font-medium">${formatNumber(parseInt(rec.total_views))}</td>
      <td class="py-3 px-2 text-right text-racing-muted text-sm">
        <span title="Likes">${formatNumber(parseInt(rec.like_count))}</span> /
        <span title="Comments">${formatNumber(parseInt(rec.comment_count))}</span>
      </td>
    </tr>
  `).join('');
}

// Update top viewed events table
async function updateTopViewedEvents() {
  const data = await fetchData('top-viewed-events');
  if (!data) return;

  const tbody = document.getElementById('topViewedEventsTable');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-racing-muted">No viewed events yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((event, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">${event.track_name || 'Unknown'}</span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${formatDate(event.created_at)}
      </td>
      <td class="py-3 px-2 text-right text-yellow-400 font-medium">${formatNumber(parseInt(event.total_views))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(event.driver_count))}</td>
    </tr>
  `).join('');
}

// Update top live viewed events table
async function updateTopLiveViewedEvents() {
  const data = await fetchData('top-live-viewed-events');
  if (!data) return;

  const tbody = document.getElementById('topLiveViewedEventsTable');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-racing-muted">No live viewed events yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((event, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">${event.track_name || 'Unknown'}</span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${formatDate(event.created_at)}
      </td>
      <td class="py-3 px-2 text-right text-red-400 font-medium">${formatNumber(parseInt(event.live_views))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(event.recording_count))}</td>
    </tr>
  `).join('');
}

// Update top live viewed recordings table (noTrack)
async function updateTopLiveViewedRecordings() {
  const data = await fetchData('top-live-viewed-recordings');
  if (!data) return;

  const tbody = document.getElementById('topLiveViewedRecordingsTable');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-racing-muted">No live viewed recordings yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((rec, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">
          ${rec.driver_username || `${rec.driver_first_name || ''} ${rec.driver_last_name || ''}`.trim() || 'Anonymous'}
        </span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${[rec.location_city, rec.location_country].filter(Boolean).join(', ') || '-'}
      </td>
      <td class="py-3 px-2 text-right text-red-400 font-medium">${formatNumber(parseInt(rec.live_views))}</td>
      <td class="py-3 px-2 text-right text-racing-muted text-sm">
        <span title="Likes">${formatNumber(parseInt(rec.like_count))}</span> /
        <span title="Comments">${formatNumber(parseInt(rec.comment_count))}</span>
      </td>
    </tr>
  `).join('');
}

// Update recent activity (recordings)
async function updateRecentActivity() {
  const data = await fetchData('recent-activity');
  if (!data) return;

  const container = document.getElementById('recentActivity');
  container.innerHTML = data.map(activity => {
    const badge = recordingStatusBadge(activity);
    const duration = formatRaceDuration(activity.total_duration);
    const distance = formatDistanceSmart(activity.total_distance);
    return `
    <div class="flex items-center justify-between p-3 rounded-lg bg-racing-dark/50 hover:bg-racing-border/30 transition-colors">
      <div class="flex items-center space-x-3 min-w-0">
        <div class="w-8 h-8 bg-racing-red/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-racing-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-white text-sm truncate">
            <span class="font-medium">${activity.username || 'Anonymous'}</span>
            <span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.class}">${badge.text}</span>
          </p>
          <p class="text-racing-muted text-xs truncate">${activity.track_name || [activity.location_city, activity.location_country].filter(Boolean).join(', ') || 'Unknown'}</p>
          <p class="text-racing-muted text-xs truncate font-mono">${duration} · ${distance}</p>
        </div>
      </div>
      <span class="text-racing-muted text-xs whitespace-nowrap ml-2">${formatDateTime(activity.created_at)}</span>
    </div>
  `;
  }).join('');
}

// Recording status badge — combines status + validation into a single label
function recordingStatusBadge(r) {
  const status = parseInt(r.status);
  const validation = parseInt(r.validation_status);
  // 0=LIVE, 1=UPLOADING, 2=ENDED, 3=DELETED, 4=SYNC_ERROR
  // validation: 0=PENDING, 1=VALID, 2=INVALID
  if (status === 0) return { text: 'LIVE', class: 'bg-blue-500/20 text-blue-400' };
  if (status === 1) return { text: 'UPLOADING', class: 'bg-yellow-500/20 text-yellow-400' };
  if (status === 4) return { text: 'SYNC ERROR', class: 'bg-red-500/20 text-red-400' };
  if (status === 3) return { text: 'DELETED', class: 'bg-racing-border/50 text-racing-muted' };
  if (status === 2) {
    if (validation === 2) {
      const err = r.validation_error ? ` · ${r.validation_error}` : '';
      return { text: `ERROR${err}`, class: 'bg-red-500/20 text-red-400' };
    }
    if (validation === 0) return { text: 'PENDING', class: 'bg-yellow-500/20 text-yellow-400' };
    return { text: 'SUCCESS', class: 'bg-green-500/20 text-green-400' };
  }
  return { text: 'UNKNOWN', class: 'bg-racing-border/50 text-racing-muted' };
}

// Update recent users
async function updateRecentUsers() {
  const data = await fetchData('recent-users');
  if (!data) return;

  const container = document.getElementById('recentUsers');
  container.innerHTML = data.map(user => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-racing-dark/50 hover:bg-racing-border/30 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-white text-sm font-medium truncate">
            ${user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'}
          </p>
          <p class="text-racing-muted text-xs truncate">${user.email || '-'}</p>
        </div>
      </div>
      <span class="text-racing-muted text-xs whitespace-nowrap ml-2">${formatDateTime(user.created_at)}</span>
    </div>
  `).join('');
}

// Update recent tracks
async function updateRecentTracks() {
  const data = await fetchData('recent-tracks');
  if (!data) return;

  const container = document.getElementById('recentTracks');
  container.innerHTML = data.map(track => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-racing-dark/50 hover:bg-racing-border/30 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-white text-sm font-medium truncate">${track.name || 'Unnamed track'}</p>
          <p class="text-racing-muted text-xs truncate">
            ${[track.location_city, track.location_country].filter(Boolean).join(', ') || 'Unknown'}
          </p>
        </div>
      </div>
      <span class="text-racing-muted text-xs whitespace-nowrap ml-2">${formatDateTime(track.created_at)}</span>
    </div>
  `).join('');
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateTopTracks(),
    updateTopDrivers(),
    updateTopViewedRecordings(),
    updateTopViewedEvents(),
    updateTopLiveViewedEvents(),
    updateTopLiveViewedRecordings(),
    updateRecentActivity(),
    updateRecentUsers(),
    updateRecentTracks()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);
