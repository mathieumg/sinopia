var assert   = require('assert')
var lockerF = require('../../lib/utils').locker;

describe('Locker', function() {
  it('calls the original callback', function(done) {
    var locker = lockerF();

    var called = false;

    var cb = function() {
      called = true;
    }

    locker.writeLock('1', cb, function(unlock) {
      assert.ok(!called);
      unlock();
      assert.ok(called);
      done();
    });
  })
})

describe('Locker', function() {
  it('read locks do not block other read locks', function(done) {
    var locker = lockerF();

    var locks = 0;

    var cb = function() {
      locks++;
      if (locks === 2) {
        assert.ok(true, 'all locks released')
        done();
      }
    }

    var unlock = [];

    function cacheUnlock(arg) {
      unlock.push(arg)
    }

    locker.readLock('1', cb, cacheUnlock);
    locker.readLock('2', cb, cacheUnlock);

    unlock[0]();
    unlock[1]();
  })
})


describe('Locker', function() {
  it('write locks block all locks', function(done) {
    var locker = lockerF();

    var locks = 0;

    var cb = function() {
      locks++;
      if (locks === 3) {
        assert.ok(true, 'all locks released')
        done();
      }
    }

    var unlocks = [];

    function cacheUnlock(cb) {
      return function(arg) {
        unlocks.push(arg)
        cb && cb(arg);
      }
    }

    locker.writeLock('1', cb, cacheUnlock());
    locker.readLock('1', cb, cacheUnlock(function(unlock) {
      assert.equal(2, unlocks.length, 'read lock obtained only after write lock released')
      setImmediate(unlock);
    }));

    locker.writeLock('1', cb, cacheUnlock(function(unlock) {
      assert.equal(3, unlocks.length, 'write lock obtained only after read lock released')
      unlock();
    }));

    setImmediate(unlocks[0]);
  })
});
