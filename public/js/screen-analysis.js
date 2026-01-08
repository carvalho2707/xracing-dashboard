// Screen Analysis page JavaScript

let screensData = [];
let currentUserId = null;
let currentUsername = null;
let excludeOwners = false;
let daysFilter = 30;

// Get color for action based on action label (action_type or eventName)
function getActionColor(actionLabel) {
  const label = actionLabel.toUpperCase();

  // Recording actions
  if (label.includes('RECORDING') || label.includes('LAP') || label.includes('SESSION')) return 'bg-racing-red';

  // Social actions
  if (label.includes('LIKE')) return 'bg-pink-500';
  if (label.includes('COMMENT')) return 'bg-blue-500';
  if (label.includes('SHARE')) return 'bg-green-500';
  if (label.includes('FOLLOW')) return 'bg-purple-500';

  // Navigation/UI actions
  if (label.includes('CLICK') || label.includes('TAP') || label.includes('PRESS')) return 'bg-yellow-500';
  if (label.includes('SCROLL') || label.includes('SWIPE')) return 'bg-orange-500';
  if (label.includes('SCREEN_VIEW') || label.includes('VIEW')) return 'bg-blue-400';

  // Auth actions
  if (label.includes('LOGIN') || label.includes('SIGN') || label.includes('AUTH')) return 'bg-green-600';

  // Settings/Profile actions
  if (label.includes('SETTING') || label.includes('PROFILE') || label.includes('EDIT')) return 'bg-cyan-500';

  // Search/Filter
  if (label.includes('SEARCH') || label.includes('FILTER')) return 'bg-indigo-500';

  return 'bg-racing-border';
}

// Format action label for display (convert snake_case to readable)
function formatActionLabel(label) {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Format screen name for display (e.g., "home_feed" → "Home Feed")
function formatScreenName(name) {
  if (!name || name === '(not set)') return name;
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Render a single screen card
function renderScreenCard(screen, maxEvents) {
  const topActionsHtml = screen.topActions.slice(0, 5).map(action => {
    const percentage = (action.count / screen.totalEvents * 100).toFixed(0);
    const label = action.actionLabel || action.eventName;
    const colorClass = getActionColor(label);
    const displayLabel = formatActionLabel(label);

    return `
      <div class="mb-2">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-racing-muted truncate max-w-[150px]" title="${label}">${displayLabel}</span>
          <span class="text-white font-medium">${formatNumber(action.count)}</span>
        </div>
        <div class="action-bar">
          <div class="action-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');

  const eventPercentage = (screen.totalEvents / maxEvents * 100).toFixed(0);

  return `
    <div class="screen-card rounded-xl p-5 cursor-pointer" onclick="openScreenDetail('${screen.screenName}')">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-white font-semibold">${formatScreenName(screen.screenName)}</h3>
          <p class="text-xs text-racing-muted">${screen.topActions.length} unique actions</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-blue-400">${formatNumber(screen.screenViews || 0)}</p>
          <p class="text-xs text-racing-muted">views</p>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between text-xs text-racing-muted mb-1">
          <span>Activity share</span>
          <span>${eventPercentage}%</span>
        </div>
        <div class="h-2 bg-racing-border/30 rounded-full overflow-hidden">
          <div class="h-full bg-racing-red rounded-full" style="width: ${eventPercentage}%"></div>
        </div>
      </div>

      <div class="border-t border-racing-border/30 pt-4">
        <p class="text-xs text-racing-muted mb-2">Top actions</p>
        ${topActionsHtml}
      </div>

      <div class="mt-4 text-center">
        <span class="text-xs text-racing-muted hover:text-racing-red transition-colors">
          Click for full breakdown
        </span>
      </div>
    </div>
  `;
}

// Load and render all screens
async function loadScreens() {
  let url = `ga4/screen-actions?days=${daysFilter}`;
  if (currentUserId) {
    url += `&userId=${encodeURIComponent(currentUserId)}`;
  }
  if (excludeOwners) {
    url += '&excludeOwners=true';
  }
  const data = await fetchData(url);
  if (!data || data.length === 0) {
    document.getElementById('screensGrid').innerHTML = `
      <div class="col-span-full text-center py-10 text-racing-muted">
        ${currentUserId ? 'No screen data found for this user' : 'No screen data available'}
      </div>
    `;
    document.getElementById('totalScreens').textContent = '0';
    document.getElementById('totalEventsCount').textContent = '0';
    document.getElementById('uniqueActions').textContent = '0';
    document.getElementById('avgEventsPerScreen').textContent = '0';
    return;
  }

  screensData = data;

  // Calculate stats
  const totalScreens = data.length;
  const totalEvents = data.reduce((sum, s) => sum + s.totalEvents, 0);
  const uniqueActions = new Set(data.flatMap(s => s.actions.map(a => a.actionLabel || a.eventName))).size;
  const avgEvents = Math.round(totalEvents / totalScreens);

  document.getElementById('totalScreens').textContent = totalScreens;
  document.getElementById('totalEventsCount').textContent = formatNumber(totalEvents);
  document.getElementById('uniqueActions').textContent = uniqueActions;
  document.getElementById('avgEventsPerScreen').textContent = formatNumber(avgEvents);

  // Render screen cards
  const maxEvents = Math.max(...data.map(s => s.totalEvents));
  const grid = document.getElementById('screensGrid');
  grid.innerHTML = data.map(screen => renderScreenCard(screen, maxEvents)).join('');
}

// Open screen detail modal
async function openScreenDetail(screenName) {
  const modal = document.getElementById('screenModal');
  const modalLoading = document.getElementById('modalLoading');
  const modalContent = document.getElementById('modalContent');

  modal.classList.remove('hidden');
  modalLoading.classList.remove('hidden');
  modalContent.classList.add('hidden');

  document.getElementById('modalScreenName').textContent = formatScreenName(screenName);

  try {
    let url = `ga4/screen-actions/${encodeURIComponent(screenName)}?days=${daysFilter}`;
    if (currentUserId) {
      url += `&userId=${encodeURIComponent(currentUserId)}`;
    }
    if (excludeOwners) {
      url += '&excludeOwners=true';
    }
    const data = await fetchData(url);

    if (!data) {
      closeModal();
      return;
    }

    document.getElementById('modalTotalEvents').textContent = formatNumber(data.totalEvents);
    document.getElementById('modalTotalUsers').textContent = formatNumber(data.totalUsers);
    document.getElementById('modalScreenViews').textContent = formatNumber(data.screenViews || 0);

    // Render all actions
    const maxCount = Math.max(...data.actions.map(a => a.count));
    const actionsHtml = data.actions.map(action => {
      const percentage = (action.count / maxCount * 100).toFixed(0);
      const label = action.actionLabel || action.eventName;
      const colorClass = getActionColor(label);
      const displayLabel = formatActionLabel(label);

      // Show event type badge if action_type is different from eventName
      const eventBadge = action.actionType && action.actionType !== '(not set)'
        ? `<span class="text-xs px-1.5 py-0.5 rounded bg-racing-border/50 text-racing-muted ml-2">${action.eventName}</span>`
        : '';

      return `
        <div class="bg-racing-dark/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <span class="text-sm text-white font-medium">${displayLabel}</span>
              ${eventBadge}
            </div>
            <div class="text-right">
              <span class="text-sm font-bold text-white">${formatNumber(action.count)}</span>
              <span class="text-xs text-racing-muted ml-2">${formatNumber(action.users)} users</span>
            </div>
          </div>
          <div class="action-bar">
            <div class="action-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('modalActions').innerHTML = actionsHtml;

    modalLoading.classList.add('hidden');
    modalContent.classList.remove('hidden');

  } catch (error) {
    console.error('Error loading screen details:', error);
    closeModal();
  }
}

// Close modal
function closeModal() {
  document.getElementById('screenModal').classList.add('hidden');
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Close modal on backdrop click
document.getElementById('screenModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'screenModal') {
    closeModal();
  }
});

// Handle days filter change
async function onDaysFilterChange() {
  daysFilter = parseInt(document.getElementById('daysFilter').value) || 30;
  await refreshData();
}

// Toggle exclude owners
async function toggleExcludeOwners() {
  excludeOwners = !excludeOwners;

  // Update toggle UI
  const toggle = document.getElementById('excludeOwnersToggle');
  const knob = document.getElementById('excludeOwnersKnob');

  if (excludeOwners) {
    toggle.classList.remove('bg-racing-border');
    toggle.classList.add('bg-racing-red');
    knob.classList.remove('bg-racing-muted');
    knob.classList.add('bg-white');
    knob.style.transform = 'translateX(20px)';
  } else {
    toggle.classList.remove('bg-racing-red');
    toggle.classList.add('bg-racing-border');
    knob.classList.remove('bg-white');
    knob.classList.add('bg-racing-muted');
    knob.style.transform = 'translateX(0)';
  }

  // Reload data with new setting
  await refreshData();
}

// User autocomplete instance
let userAutocomplete = null;

// Clear user filter
async function clearUserFilter() {
  currentUserId = null;
  currentUsername = null;
  if (userAutocomplete) {
    userAutocomplete.clear();
  }
  document.getElementById('clearUserBtn').classList.add('hidden');
  await refreshData();
}

// Refresh data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await loadScreens();

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize user autocomplete
  userAutocomplete = initUserAutocomplete('usernameFilter',
    // onSelect callback
    async (user) => {
      currentUserId = user.id;
      currentUsername = user.username;
      document.getElementById('clearUserBtn').classList.remove('hidden');
      await refreshData();
    },
    // onClear callback
    async () => {
      currentUserId = null;
      currentUsername = null;
      document.getElementById('clearUserBtn').classList.add('hidden');
      await refreshData();
    }
  );

  // Load initial data
  refreshData();
});

// Auto-refresh every 5 minutes (only if no filter active)
setInterval(() => {
  if (!currentUserId) {
    refreshData();
  }
}, 300000);
