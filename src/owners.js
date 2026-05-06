// Firebase UIDs of internal/team accounts whose activity should be excluded
// from the dashboards. These IDs are used as both:
//   - recordings.driver_id / users.id in Postgres
//   - user_id in GA4 BigQuery export rows (when set)
const OWNER_USER_IDS = [
  'hZMCPNFAZddzS7bwqgzb91VOysx2',
  'ZT87DvPwt3NnWtIlJGmwXRINIvX2',
  'Kw1RU3ufAAcYlmGgMyWACbn6t6U2',
];

// Pre-built SQL list literal: 'id1','id2','id3'. Safe to inline because
// these are constants we control (no user input).
const OWNER_IDS_SQL_LIST = OWNER_USER_IDS.map((id) => `'${id}'`).join(', ');

// Postgres helper. Returns "AND <column> NOT IN ('id1', ...)" for direct
// inlining into a query that already has a WHERE clause.
function excludeOwnersSql(column) {
  return `AND ${column} NOT IN (${OWNER_IDS_SQL_LIST})`;
}

// Postgres helper that also tolerates NULL columns (for joins where the
// driver/user side may not exist).
function excludeOwnersSqlNullable(column) {
  return `AND (${column} IS NULL OR ${column} NOT IN (${OWNER_IDS_SQL_LIST}))`;
}

module.exports = {
  OWNER_USER_IDS,
  OWNER_IDS_SQL_LIST,
  excludeOwnersSql,
  excludeOwnersSqlNullable,
};