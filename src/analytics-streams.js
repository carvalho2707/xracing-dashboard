// GA4 stream IDs. APP_ENV drives mobile app stream filtering; growth metrics
// include both the selected app streams and the configured production web stream.

const APP_STREAM_IDS_BY_ENV = {
  PROD: ['10194581860', '10194592868'],
  QA: ['10194598525', '10194573798', '10213837630'],
  DEV: ['10194591392', '10194522441', '10213854099'],
};
const DEFAULT_WEB_STREAM_IDS = ['14050038536'];

function parseStreamIds(value, fallback = []) {
  const raw = value == null || value === '' ? fallback : String(value).split(',');
  const parsed = raw.map(id => String(id).trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
}

function uniqueStreamIds(ids) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function getAppStreamEnv() {
  return (process.env.APP_ENV || 'PROD').toUpperCase();
}

function getAppStreamIds() {
  return APP_STREAM_IDS_BY_ENV[getAppStreamEnv()] || APP_STREAM_IDS_BY_ENV.PROD;
}

function getWebStreamIds() {
  return parseStreamIds(process.env.WEB_STREAM_IDS, DEFAULT_WEB_STREAM_IDS);
}

function getGrowthStreamIds() {
  return uniqueStreamIds([...getAppStreamIds(), ...getWebStreamIds()]);
}

module.exports = {
  APP_STREAM_IDS_BY_ENV,
  DEFAULT_WEB_STREAM_IDS,
  getAppStreamEnv,
  getAppStreamIds,
  getWebStreamIds,
  getGrowthStreamIds,
};
