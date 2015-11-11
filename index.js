/**
 * Module Dependencies
 */

var superagent = require('superagent')
var find = require('array-find')
var fs = require('fs')

/**
 * Export `history`
 */

module.exports = history

/**
 * History
 *
 * @param {String} token
 * @param {String} channel
 * @param {Function} fn
 */

function history (token, channel, fn) {
  find_channel_id(token, channel, function(err, channel) {
    fetch(token, channel, null, function(err, messages) {
      if (err) throw err
      fn(null, messages)
    })
  })
}

/**
 * Find the channel id
 *
 * @param {String} token
 * @param {String} channel
 * @param {Function} fn
 */

function find_channel_id (token, channel, fn) {
  list_channels(token, function(err, channels) {
    if (err) return fn(err)
    var needle = find(channels, ch => ch.name === channel)
    if (needle) return fn(null, needle)

    list_groups(token, function(err, groups) {
      if (err) return fn(err)
      var needle = find(groups, gr => gr.name === channel)
      if (needle) return fn(null, needle)
      else return fn(new Error('could not find channel id'))
    })
  })
}

/**
 * List groups
 *
 * @param {String} token
 * @param {Function} fn
 */

function list_groups (token, fn) {
  superagent
    .get('https://slack.com/api/groups.list')
    .query({ token: token })
    .type('json')
    .end(function (err, res) {
      if (err) return fn(err)
      if (!res.ok) return fn(new Error(res.statusText))
      return fn(null, res.body.groups)
    })
}

/**
 * List channels
 *
 * @param {String} token
 * @param {Function} fn
 */

function list_channels (token, fn) {
  superagent
    .get('https://slack.com/api/channels.list')
    .query({ token: token })
    .type('json')
    .end(function (err, res) {
      if (err) return fn(err)
      if (!res.ok) return fn(new Error(res.statusText))
      return fn(null, res.body.channels)
    })
}

/**
 * Fetch and paginate
 *
 * @param {Object} query
 * @param {Date} earliest
 */

function fetch (token, channel, earliest, fn, out) {
  out = out || []

  superagent
    .get('https://slack.com/api/groups.history')
    .query({
      latest: earliest || Date.now(),
      channel: channel.id,
      token: token,
      count: 1000
    })
    .type('json')
    .end(function (err, res) {
      if (err) return fn(err)
      if (!res.ok) return fn (new Error(res.statusText))
      var messages = res.body.messages
      var earliest = messages[messages.length - 1].ts
      out = out.concat(messages)

      if (res.body.has_more) {
        fetch(token, channel, earliest, fn, out)
      } else {
        return fn(null, out)
      }
    })
}
