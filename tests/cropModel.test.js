import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Box3 } from 'three'
import { readFileSync } from 'node:fs'
import { createCropModels } from '../src/modules/cropModel.js'

const records = JSON.parse(readFileSync(new URL('../public/data/biometria.json', import.meta.url))).records
const objectsOfKind = (model, kind) => {
  const result = []
  model.traverse(object => { if (object.userData.kind === kind) result.push(object) })
  return result
}
test('early and reproductive models preserve the observations and use distinct biological elements', t => {
  const models = createCropModels()
  t.after(models.dispose)
  const original = structuredClone(records)
  const early = models.create(records.find(r => r.week === 1 && r.treatment === 'azul'))
  const late = models.create(records.find(r => r.week === 10 && r.treatment === 'azul'))
  assert.equal(objectsOfKind(early, 'flower').length, 0)
  assert.equal(objectsOfKind(early, 'fruit').length, 0)
  assert.equal(objectsOfKind(late, 'flower').length, 1)
  assert.equal(objectsOfKind(late, 'petal').length, 5)
  assert.equal(objectsOfKind(late, 'fruit').length, 1)
  assert.ok(objectsOfKind(late, 'leaf').length > objectsOfKind(early, 'leaf').length)
  const earlyBox = new Box3().setFromObject(early)
  const lateBox = new Box3().setFromObject(late)
  assert.ok(lateBox.max.y - lateBox.min.y > earlyBox.max.y - earlyBox.min.y)
  assert.deepEqual(records, original)
})
test('every nonzero reproductive average remains visible and shared assets survive week rebuilds', t => {
  const models = createCropModels()
  t.after(models.dispose)
  for (const record of records) {
    const plant = models.create(record)
    assert.equal(objectsOfKind(plant, 'flower').length, Number(record.flowers > 0))
    assert.equal(objectsOfKind(plant, 'fruit').length, Number(record.fruits > 0))
    plant.traverse(object => assert.equal(object.userData.treatment, record.treatment))
  }
  const first = models.create(records[0]), second = models.create(records[0])
  assert.equal(objectsOfKind(first, 'leaf')[0].geometry, objectsOfKind(second, 'leaf')[0].geometry)
})

test('missing measurements do not create invented geometry', t => {
  const models = createCropModels()
  t.after(models.dispose)
  const record = records[0]
  assert.equal(models.create({ ...record, height: null }).children.length, 0)
  assert.equal(models.create({ ...record, diameter: null }).children.length, 0)
  assert.equal(objectsOfKind(models.create({ ...record, leaves: null }), 'leaf').length, 0)
})
