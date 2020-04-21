'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/init')
const { SERVICE_COLLECTIONS } = require('../../../../lib/helpers')
const {
  testUngroupedEvents, testGroupedEvents, logHandlerQueryWrapper, logHandlerBodyWrapper
} = require('../../../helpers/event/log')
const {
  getOriginKeys, getRandomGraphPathPattern, getSampleTestCollNames, getNodeBraceSampleIds
} = require('../../../helpers/event')
const { db, query, aql } = require('@arangodb')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Log Handlers - Path as query param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logHandlerQueryWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta.id, '/')[0] in ${sampleGraphCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logHandlerQueryWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta.id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('collection', path, logHandlerQueryWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta.id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testGroupedEvents('nodeGlob', path, logHandlerQueryWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds(100)
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta.id in ${sampleIds}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds(100)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta.id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('nodeBrace', path, logHandlerQueryWrapper, queryParts)
  })
})

describe('Log Handlers - Path as body param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logHandlerBodyWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta.id, '/')[0] in ${sampleGraphCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logHandlerBodyWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta.id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('collection', path, logHandlerBodyWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta.id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testGroupedEvents('nodeGlob', path, logHandlerBodyWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta.id in ${sampleIds}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta.id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('nodeBrace', path, logHandlerBodyWrapper, queryParts)
  })
})
