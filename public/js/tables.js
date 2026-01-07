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
    updateTopLiveViewedRecordings()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);
