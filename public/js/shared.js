// Shared utilities and components for xracing dashboard

// Chart.js default config
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#8B949E';
  Chart.defaults.borderColor = 'rgba(48, 54, 61, 0.5)';
}

// ============================================
// Utility Functions
// ============================================

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
}

function formatDistance(meters) {
  if (meters >= 1000000) return (meters / 1000).toFixed(0).toLocaleString() + ' km';
  if (meters >= 1000) return (meters / 1000).toFixed(1) + ' km';
  return meters?.toFixed(0) + ' m';
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return days + ' days';
  if (hours > 0) return hours + ' hours';
  const minutes = Math.floor(ms / 60000);
  return minutes + ' min';
}

function formatMonth(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return formatDate(dateStr);
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format growth percentage with color class
function formatGrowth(percent) {
  if (percent === null || percent === undefined) return { text: 'N/A', class: 'text-racing-muted' };
  const value = parseFloat(percent);
  if (value > 0) return { text: `+${value}%`, class: 'text-green-400' };
  if (value < 0) return { text: `${value}%`, class: 'text-red-400' };
  return { text: '0%', class: 'text-racing-muted' };
}

// ============================================
// API Fetch Wrapper
// ============================================

async function fetchData(endpoint) {
  try {
    const response = await fetch(`/api/${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

// ============================================
// Status Constants
// ============================================

const STATUS_NAMES = {
  0: 'LIVE',
  1: 'UPLOADING',
  2: 'ENDED'
};

const STATUS_COLORS = {
  0: 'bg-red-500',
  1: 'bg-yellow-500',
  2: 'bg-green-500'
};

// ============================================
// Sidebar Navigation
// ============================================

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggle = document.getElementById('sidebarToggle');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
    });
  }

  // Set active nav item based on current page
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.sidebar-nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath ||
        (currentPath === '/' && href === '/') ||
        (currentPath.endsWith('index.html') && href === '/')) {
      link.classList.add('active');
    }
  });
}

// ============================================
// Sidebar HTML Template
// ============================================

function getSidebarHTML() {
  return `
    <!-- Mobile toggle button -->
    <button id="sidebarToggle" class="sidebar-toggle">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>

    <!-- Mobile overlay -->
    <div id="sidebarOverlay" class="sidebar-overlay"></div>

    <!-- Sidebar -->
    <aside id="sidebar" class="sidebar">
      <div class="sidebar-header">
        <a href="/">
          <img src="/logo_red.svg" alt="xracing" class="h-8 w-auto">
        </a>
      </div>

      <nav class="sidebar-nav">
        <a href="/">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span>Home</span>
        </a>
        <a href="/live.html">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"/>
          </svg>
          <span>Live</span>
        </a>
        <a href="/analytics.html">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span>Analytics</span>
        </a>
        <a href="/user-timeline.html">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>User Timeline</span>
        </a>
        <a href="/screen-analysis.html">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
          </svg>
          <span>Screen Analysis</span>
        </a>
        <a href="/kpis.html">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span>KPIs</span>
        </a>
        <a href="/tables.html">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span>Tables</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        xracing dashboard
      </div>
    </aside>
  `;
}

// ============================================
// Page Header HTML Template
// ============================================

function getPageHeaderHTML(title, showLiveIndicator = false) {
  const liveIndicatorHTML = showLiveIndicator ? `
    <div class="live-indicator">
      <span class="dot"></span>
      <span class="text-sm text-red-400 font-medium">
        <span id="headerLiveCount">-</span> Live
      </span>
    </div>
  ` : '';

  return `
    <header class="page-header">
      <div class="page-header-content">
        <div class="flex items-center gap-4">
          <h1 class="page-title">${title}</h1>
          ${liveIndicatorHTML}
        </div>
        <button onclick="typeof refreshData === 'function' && refreshData()" class="px-4 py-2 bg-racing-card hover:bg-racing-border text-sm rounded-lg transition-colors">
          Refresh
        </button>
      </div>
    </header>
  `;
}

// ============================================
// Initialize on DOM Ready
// ============================================

document.addEventListener('DOMContentLoaded', initSidebar);
