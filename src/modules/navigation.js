import { Box3, Vector3, MathUtils } from 'three'

// Bounds enclose the actual 15.3 × 5.8 field and its roof height.
export const fieldBounds = new Box3(new Vector3(-7.65, .25, -2.9), new Vector3(7.65, 2.85, 2.9))
export const zoomLimits = { min: .65, max: 40 }

export function constrainNavigation(camera, controls, bounds = fieldBounds) {
  const target = controls.target.clone().clamp(bounds.min, bounds.max)
  const correction = target.clone().sub(controls.target)
  controls.target.copy(target)
  camera.position.add(correction)
  camera.zoom = MathUtils.clamp(camera.zoom, zoomLimits.min, zoomLimits.max)
  // OrbitControls constrains the angle; this also protects preset/point transitions.
  camera.position.y = Math.max(camera.position.y, target.y + .12)
  camera.updateProjectionMatrix()
}
