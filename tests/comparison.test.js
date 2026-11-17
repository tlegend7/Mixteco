import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { differenceFromControl, weeklyMaximum } from '../src/modules/experiment.js'

const records = JSON.parse(readFileSync(new URL('../public/data/biometria.json', import.meta.url))).records
test('descriptive differences use original observations, signed units and a valid denominator', () => {
  const week = records.filter(record => record.week === 10)
  const control = week.find(record => record.treatment === 'control')
  const blue = week.find(record => record.treatment === 'azul')
  const delta = differenceFromControl(blue, control, 'height')
  assert.ok(Math.abs(delta.absolute - 9.475) < 1e-10)
  assert.ok(Math.abs(delta.percent - 9.475 / 18.4 * 100) < 1e-10)
  assert.deepEqual(differenceFromControl(control, control, 'height'), { absolute: 0, percent: 0 })
  const early = records.filter(record => record.week === 1)
  assert.deepEqual(differenceFromControl(early[0], early[3], 'flowers'), { absolute: null, percent: null })
  assert.deepEqual(differenceFromControl({ height: 4 }, { height: 0 }, 'height'), { absolute: 4, percent: null })
  assert.deepEqual(differenceFromControl({ height: 3 }, { height: 4 }, 'height'), { absolute: -1, percent: -25 })
  assert.deepEqual(differenceFromControl({ height: null }, { height: 4 }, 'height'), { absolute: null, percent: null })
})
test('weekly maxima handle ties, selected subsets and empty selections without changing observations', () => {
  const original = structuredClone(records)
  assert.deepEqual(weeklyMaximum(records.filter(record => record.week === 10)), { value: 27.875, treatments: ['azul'] })
  assert.equal(weeklyMaximum(records.filter(record => record.week === 1), 'flowers'), null)
  assert.deepEqual(weeklyMaximum([{ treatment: 'rojo', height: 2 }, { treatment: 'azul', height: 2 }, { treatment: 'control', height: null }]), { value: 2, treatments: ['rojo', 'azul'] })
  assert.equal(weeklyMaximum([]), null)
  assert.deepEqual(weeklyMaximum(records.filter(record => record.week === 10 && record.treatment === 'control')), { value: 18.4, treatments: ['control'] })
  assert.deepEqual(records, original)
})
