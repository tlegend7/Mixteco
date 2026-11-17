import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, ref } from 'vue'
import { usePlayback } from '../src/modules/usePlayback.js'

function setup(t, reduced = false) {
  const listeners = new Set()
  const motion = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) }
  const previous = globalThis.window
  globalThis.window = { matchMedia: () => motion }
  t.mock.timers.enable({ apis: ['setInterval'] })
  const scope = effectScope()
  const week = ref(10), weeks = ref(Array.from({ length: 10 }, (_, i) => ({ week: i + 1 })))
  const playback = scope.run(() => usePlayback(week, weeks))
  t.after(() => { scope.stop(); globalThis.window = previous })
  return { week, playback, scope, motion, listeners }
}
test('play traverses only the ten observed weeks and stops at the last', t => {
  const { week, playback } = setup(t)
  playback.toggle()
  assert.equal(week.value, 1)
  for (let next = 2; next <= 10; next++) {
    t.mock.timers.tick(2000)
    assert.equal(week.value, next)
  }
  assert.equal(playback.playing.value, false)
  t.mock.timers.tick(20000)
  assert.equal(week.value, 10)
})
test('pause, manual selection, restart and scope disposal stop the timer', t => {
  const { week, playback, scope, listeners } = setup(t)
  playback.toggle()
  t.mock.timers.tick(2000)
  playback.toggle()
  t.mock.timers.tick(8000)
  assert.equal(week.value, 2)
  playback.toggle()
  t.mock.timers.tick(2000)
  assert.equal(week.value, 3)
  playback.selectWeek(7)
  assert.equal(playback.playing.value, false)
  t.mock.timers.tick(8000)
  assert.equal(week.value, 7)
  playback.restart()
  assert.equal(week.value, 1)
  playback.toggle()
  scope.stop()
  t.mock.timers.tick(8000)
  assert.equal(week.value, 1)
  assert.equal(listeners.size, 0)
})
test('reduced motion advances at a slower cadence and a preference change pauses', t => {
  const { week, playback, listeners } = setup(t, true)
  playback.toggle()
  t.mock.timers.tick(2000)
  assert.equal(week.value, 1)
  t.mock.timers.tick(1200)
  assert.equal(week.value, 2)
  listeners.forEach(listener => listener())
  t.mock.timers.tick(10000)
  assert.equal(week.value, 2)
  assert.equal(playback.playing.value, false)
})
