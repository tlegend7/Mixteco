import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OrthographicCamera, Vector3 } from 'three'
import { fieldBounds, zoomLimits, constrainNavigation } from '../src/modules/navigation.js'

test('panning clamps the target to the field while translating the camera by the same correction', () => {
  const camera = new OrthographicCamera(-8,8,4,-4,.1,100)
  const controls = { target:new Vector3(100,1,-100) }
  camera.position.copy(controls.target).add(new Vector3(10,11,17))
  const offset=camera.position.clone().sub(controls.target)
  constrainNavigation(camera,controls)
  assert.ok(fieldBounds.containsPoint(controls.target))
  assert.ok(camera.position.clone().sub(controls.target).distanceTo(offset)<1e-10)
  assert.equal(controls.target.x,7.65)
  assert.equal(controls.target.z,-2.9)
})

test('vertical pan, orthographic zoom and camera elevation remain bounded', () => {
  const camera = new OrthographicCamera(-8,8,4,-4,.1,100)
  const controls = { target:new Vector3(0,-200,0) }
  camera.position.set(10,-210,17)
  camera.zoom=1000
  constrainNavigation(camera,controls)
  assert.equal(controls.target.y,.25)
  assert.ok(camera.position.y>=controls.target.y+.12)
  assert.equal(camera.zoom,zoomLimits.max)
  camera.zoom=.0001
  controls.target.y=100
  constrainNavigation(camera,controls)
  assert.equal(controls.target.y,2.85)
  assert.equal(camera.zoom,zoomLimits.min)
})

test('valid close-up framing stays stable across repeated constraint checks', () => {
  const camera = new OrthographicCamera(-8,8,4,-4,.1,100)
  const controls = { target:new Vector3(-2.33,1.6,1.05) }
  camera.position.copy(controls.target).add(new Vector3(10,11,17))
  camera.zoom=32
  const before={ position:camera.position.clone(), target:controls.target.clone(), zoom:camera.zoom }
  for(let i=0;i<120;i++) constrainNavigation(camera,controls)
  assert.ok(camera.position.equals(before.position))
  assert.ok(controls.target.equals(before.target))
  assert.equal(camera.zoom,before.zoom)
})
