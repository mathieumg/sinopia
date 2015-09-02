var assert   = require('assert')
var Locker = require('../../lib/locker');

describe('Locker', function() {
  it('calls the original callback', function(done) {
    var locker = new Locker();

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

  it('read locks do not block other read locks', function(done) {
    var locker = new Locker();

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

  it('write locks block all locks', function(done) {
    var locker = new Locker();

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

  it('releases locks when a new lock is requested after timeout expires', function(done) {
    var locker = new Locker({
      timeout: '200ms'
    })

    function cb(err) {
      assert.ok(err && err.message.match(/Operation took longer/))
    }

    // this lock should be released after 200 ms
    locker.writeLock(1, cb, function() {})

    // this lock should be called when prior lock is released -- a timer will be created to release it
    locker.writeLock(1, null, function(unlock) {
      assert.ok(true, "pending lock was obtained after 1st failed")
      unlock()
    })

    // the final lock will be added only after the others have been released automatically
    setTimeout(function() {
      locker.writeLock(1, null, function(unlock) {
        assert.ok(true, 'lock was released');
        unlock()
        done()
      })
    }, 600)
  })

  it ('releases expired locks only when another lock is obtained', function(done) {
    var locker = new Locker({
      timeout: '200ms'
    })

    var released = false;

    function cb(err) {
      assert.ok(err && err.message.match(/Operation took longer/))
      released = true
    }

    locker.readLock(1, cb, function() {})

    setTimeout(function() {
      assert.ok(!released)
      locker.readLock(1, null, function(unlock) {
        assert.ok(released)
        unlock()
        done()
      })
    }, 400)
  })
});
