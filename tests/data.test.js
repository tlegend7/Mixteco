import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateData, recordsAt, treatments } from '../src/modules/experiment.js'

const data = JSON.parse(readFileSync(new URL('../public/data/biometria.json', import.meta.url), 'utf8'))
test('40 observations form a complete ten-week experiment', () => {
  assert.equal(validateData(data), data)
  assert.equal(data.records.length, 40)
  assert.equal(data.weeks.length, 10)
  assert.deepEqual(data.records.filter(r => r.treatment === 'control').map(r => r.plants), [...Array(8).fill(8), 6, 5])
})
test('filtering preserves selected observations, zero counts and weekly decreases', () => {
  const ids = treatments.map(t => t.id)
  assert.equal(recordsAt(data.records, 1, ids).length, 4)
  assert.equal(recordsAt(data.records, 10, ['azul'])[0].height, 27.88)
  assert.equal(recordsAt(data.records, 1, ['rojo'])[0].flowers, 0)
  assert.equal(recordsAt(data.records, 7, ['azul'])[0].height, 17.38)
  assert.equal(recordsAt(data.records, 6, ['azul'])[0].height, 20)
  assert.deepEqual(recordsAt(data.records, 10, []), [])
  assert.equal(data.records.find(r => r.week === 10 && r.treatment === 'rojo').sourceRow, 49)
})
test('invalid, duplicate, missing and nonnumeric measurements are rejected', () => {
  const mutate = fn => { const copy = structuredClone(data); fn(copy); return copy }
  assert.throws(() => validateData(mutate(d => d.records.push(d.records[0]))))
  assert.throws(() => validateData(mutate(d => d.records.pop())))
  assert.throws(() => validateData(mutate(d => { d.records[0].height = null })))
  assert.throws(() => validateData(mutate(d => { d.records[0].treatment = 'amarillo' })))
  assert.throws(() => validateData(mutate(d => { d.records[0].date = '2026-08-21' })))
})
