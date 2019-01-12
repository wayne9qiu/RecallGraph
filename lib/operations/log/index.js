'use strict';

const { db, aql } = require('@arangodb');
const { SERVICE_GRAPHS, TRANSIENT_EVENT_SUPERNODE } = require('../../helpers');
const {
  getScopeFilters, getLimitClause, getSortingClause, getGroupingClauseAndSortingField, getScopeFor, getSearchPattern,
  getScopeInitializers
} = require('./helpers');

module.exports = function log(path = '/',
  { since, until, skip = 0, limit = 0, sortingKey = null, groupingKey = null, countsOnly = false } = {}) {
  const scope = getScopeFor(path);
  const searchPattern = getSearchPattern(scope, path);

  const queryParts = getScopeInitializers(scope, searchPattern);
  queryParts.push(
    aql`
      for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
      outbound ${TRANSIENT_EVENT_SUPERNODE._id}
      graph ${SERVICE_GRAPHS.eventLog}
      filter is_same_collection('evstore_events', v)
    `
  );

  const scopeFilters = getScopeFilters(scope, searchPattern);
  scopeFilters.forEach(filter => queryParts.push(filter));

  if (since) {
    queryParts.push(aql`filter v.ctime >= ${since}`);
  }
  if (until) {
    queryParts.push(aql`filter v.ctime <= ${until}`);
  }

  const { sortingField, groupingClause } = getGroupingClauseAndSortingField(groupingKey, countsOnly);

  queryParts.push(groupingClause);
  queryParts.push(getSortingClause(sortingKey, sortingField));
  queryParts.push(getLimitClause(skip, limit));

  const query = aql.join(queryParts, '\n');
  console.log(query);

  return db._query(query).toArray();
};