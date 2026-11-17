import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateData, recordsAt, treatments, metrics, format, formatSigned } from '../src/modules/experiment.js'

const data = JSON.parse(readFileSync(new URL('../public/data/biometria.json', import.meta.url), 'utf8'))
test('52 summaries cover thirteen weeks and preserve all 416 sample slots', () => {
  assert.equal(validateData(data), data)
  assert.equal(data.records.length, 52)
  assert.equal(data.weeks.length, 13)
  assert.equal(data.weeks.at(-1).date, '2026-11-12')
  assert.equal(data.observations.length, 416)
  assert.equal(data.observations.filter(r => metrics.some(m => r[m.id] !== null)).length, 400)
  assert.deepEqual(data.records.filter(r => r.treatment === 'control').map(r => r.plants), [...Array(9).fill(8), 5, 4, 4, 3])
  for (const record of data.records) {
    const samples = data.observations.filter(r => r.week === record.week && r.treatment === record.treatment)
    assert.deepEqual(samples.map(r => r.sample).sort((a,b) => a-b), [1,2,3,4,5,6,7,8])
    assert.deepEqual(record.sourceRows, samples.map(r => r.sourceRow))
    for (const metric of metrics) {
      const values = samples.map(r => r[metric.id]).filter(v => v !== null)
      assert.equal(record.sampleCounts[metric.id], values.length)
      if (values.length) assert.ok(Math.abs(record[metric.id] - values.reduce((a,b) => a+b, 0)/values.length) < 1e-10)
      else assert.equal(record[metric.id], null)
    }
  }
})
test('filtering preserves selected observations, zero counts and weekly decreases', () => {
  const ids = treatments.map(t => t.id)
  assert.equal(recordsAt(data.records, 1, ids).length, 4)
  assert.equal(recordsAt(data.records, 10, ['azul'])[0].height, 27.875)
  assert.equal(recordsAt(data.records, 1, ['rojo'])[0].flowers, null)
  assert.equal(recordsAt(data.records, 7, ['azul'])[0].height, 17.375)
  assert.equal(recordsAt(data.records, 6, ['azul'])[0].height, 20)
  assert.deepEqual(recordsAt(data.records, 10, []), [])
  assert.equal(data.records.find(r => r.week === 10 && r.treatment === 'rojo').sourceRows[0], 327)
})

test('variable denominators, missing reasons, typed values and unusual observations survive import', () => {
  const get = (week, treatment) => recordsAt(data.records, week, [treatment])[0]
  assert.equal(get(9, 'control').height, 19.875)
  assert.equal(get(9, 'control').sampleCounts.height, 8)
  assert.equal(get(12, 'control').sampleCounts.height, 4)
  assert.equal(get(12, 'control').sampleCounts.diameter, 3)
  assert.equal(get(13, 'verde').sampleCounts.height, 7)
  assert.equal(get(10, 'azul').sampleCounts.flowers, 4)
  assert.equal(get(10, 'azul').flowers, 1.75)
  assert.equal(get(12, 'verde').flowers, 0)
  assert.equal(data.observations.find(r => r.sourceRow === 376).diameter, 20)
  assert.equal(data.observations.find(r => r.sourceRow === 464).fruits, 20)
  assert.equal(data.observations.find(r => r.sourceRow === 430).missing.diameter, 'blank')
  assert.equal(data.observations.find(r => r.week === 1).missing.flowers, 'N/A')
  assert.equal(format(null), 'Sin datos')
  assert.equal(formatSigned(null), 'Sin datos')
  assert.equal(format(0), '0.00')
  assert.equal(data.normalization.corrections.length, 39)
})
test('invalid, duplicate, missing and nonnumeric measurements are rejected', () => {
  const mutate = fn => { const copy = structuredClone(data); fn(copy); return copy }
  assert.throws(() => validateData(mutate(d => d.records.push(d.records[0]))))
  assert.throws(() => validateData(mutate(d => d.records.pop())))
  assert.throws(() => validateData(mutate(d => { d.records[0].height = null })))
  assert.throws(() => validateData(mutate(d => { d.records[0].flowers = 0 })))
  assert.throws(() => validateData(mutate(d => { d.records[0].sampleCounts.height = 9 })))
  assert.throws(() => validateData(mutate(d => { d.records[0].height = '21 cm' })))
  assert.throws(() => validateData(mutate(d => { d.records[0].treatment = 'amarillo' })))
  assert.throws(() => validateData(mutate(d => { d.records[0].date = '2026-08-21' })))
})
