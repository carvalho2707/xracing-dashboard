// Live page specific JavaScript

// Update live recordings status
async function updateLiveRecordings() {
  const data = await fetchData('live');
  if (!data) return;

  document.getElementById('liveCount').textContent = parseInt(data.live_count) || 0;
  document.getElementById('uploadingCount').textContent = parseInt(data.uploading_count) || 0;
  document.getElementById('endedCount').textContent = parseInt(data.ended_count) || 0;
  document.getElementById('liveDrivers').textContent = parseInt(data.live_drivers) || 0;
  document.getElementById('liveTracks').textContent = parseInt(data.live_tracks) || 0;
}

// Update live monitoring table
async function updateLiveMonitoring() {
  const data = await fetchData('live-monitoring');
  if (!data) return;

  const tbody = document.getElementById('liveMonitoringTable');
  const activeCount = document.getElementById('activeCount');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-racing-muted">No active recordings</td></tr>';
    activeCount.textContent = '0 recordings';
    return;
  }

  activeCount.textContent = `${data.length} recording${data.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = data.map(rec => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2">
        <span class="text-white font-medium">
          ${rec.username || `${rec.first_name || ''} ${rec.last_name || ''}`.trim() || 'Anonymous'}
        </span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${rec.track_name || [rec.location_city, rec.location_country].filter(Boolean).join(', ') || '-'}
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm whitespace-nowrap">${formatDateTime(rec.start_time)}</td>
      <td class="py-3 px-2">
        <span class="px-2 py-1 rounded text-xs font-medium text-white ${STATUS_COLORS[rec.status] || 'bg-gray-500'}">
          ${STATUS_NAMES[rec.status] || 'UNKNOWN'}
        </span>
      </td>
    </tr>
  `).join('');
}

// Update recent activity (recordings)
async function updateRecentActivity() {
  const data = await fetchData('recent-activity');
  if (!data) return;

  const container = document.getElementById('recentActivity');
  container.innerHTML = data.map(activity => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-racing-dark/50 hover:bg-racing-border/30 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-racing-red/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-racing-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-white text-sm truncate">
            <span class="font-medium">${activity.username || 'Anonymous'}</span>
          </p>
          <p class="text-racing-muted text-xs truncate">${activity.track_name || [activity.location_city, activity.location_country].filter(Boolean).join(', ') || 'Unknown'}</p>
        </div>
      </div>
      <span class="text-racing-muted text-xs whitespace-nowrap ml-2">${timeAgo(activity.created_at)}</span>
    </div>
  `).join('');
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
      <span class="text-racing-muted text-xs whitespace-nowrap ml-2">${timeAgo(user.created_at)}</span>
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
      <span class="text-racing-muted text-xs whitespace-nowrap ml-2">${timeAgo(track.created_at)}</span>
    </div>
  `).join('');
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateLiveRecordings(),
    updateLiveMonitoring(),
    updateRecentActivity(),
    updateRecentUsers(),
    updateRecentTracks()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 30 seconds for live data
setInterval(refreshData, 30000);
