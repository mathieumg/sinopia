var Rwlock = require('rwlock-plus')
var parse_interval = require('./config').parse_interval

function Locker(config, logger) {
  config = config || {}

  // don't hold a lock for longer than the amount of time we wait for the uplink

  this.rwlock = new Rwlock(parse_interval(config.timeout || '30s'))
  this.activeLock = null
  this.count = 0
  this.logger = logger || { warn: function() {} }

}

function handleErrors(origCb) {
  var that = this;
  return function(err) {
    if (err) {
      that.logger.warn(err.message)
    }
    origCb && origCb(err)
  }
}

Locker.prototype.readLock = function(key, origCb, cb) {
  return this.rwlock.readLock(key, handleErrors.call(this, origCb), cb)
}

Locker.prototype.writeLock = function(key, origCb, cb) {
  return this.rwlock.writeLock(key, handleErrors.call(this, origCb), cb)
}

module.exports = Locker
