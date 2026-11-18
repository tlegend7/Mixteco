<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { treatments } from '../modules/experiment'
import { createCropModels } from '../modules/cropModel'
import { fieldBounds, zoomLimits, constrainNavigation } from '../modules/navigation'

const props = defineProps({ records: Array, selected: Array, focused: String, inspection: Boolean, view: String, coversVisible: Boolean, expanded: Boolean, cameraRequest: Number })
const emit = defineEmits(['inspect', 'free-view', 'reset'])
const host = ref(null)
const failure = ref('')
const pointFocus = ref('')
const zoomLevel = ref(1)
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
const center = new THREE.Vector3(0, 1.1, 0)
const positions = {
  frontal: new THREE.Vector3(10, 11, 17),
  lateral: new THREE.Vector3(0, 3.8, 22),
  superior: new THREE.Vector3(0, 24, 0.01),
}
const coords = [-5.1, -1.7, 1.7, 5.1]
const corners = [-7.65, 7.65].flatMap(x => [-0.4, 2.85].flatMap(y => [-2.9, 2.9].map(z => new THREE.Vector3(x, y, z))))
const projected = new THREE.Vector3()
let renderer, scene, camera, controls, observer, frame, field, plants, raycaster, cropModels
let transition = null, aspect = 1, frustumHeight = 8
let plots = [], resources = []
let gesture = null
let pointTarget = null
let pointAnchor = null
const pointers = new Set()
function own(resource) { resources.push(resource); return resource }
const material = (color, options = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options }))
function mesh(geometry, mat, parent, position, treatment) {
  const object = new THREE.Mesh(geometry, mat)
  object.position.set(...position)
  object.castShadow = true
  object.receiveShadow = true
  if (treatment) object.userData.treatment = treatment
  parent.add(object)
  return object
}
function buildPlants() {
  if (!plants) return
  disposeInstances()
  plants.clear()
  for (const record of props.records) {
    const i = treatments.findIndex(t => t.id === record.treatment)
    const group = new THREE.Group()
    group.userData.treatment = record.treatment
    plants.add(group)
    const model = cropModels.create(record)
    model.updateMatrixWorld(true)
    const batches = new Map()
    model.traverse(object => {
      if (!object.isMesh) return
      const key = object.geometry.uuid + ':' + object.material.uuid
      if (!batches.has(key)) batches.set(key, [])
      batches.get(key).push(object)
    })
    // Batch six identical illustrative plants, rather than drawing every leaf separately.
    for (const objects of batches.values()) {
      const batch = new THREE.InstancedMesh(objects[0].geometry, objects[0].material, objects.length * 6)
      batch.userData.treatment = record.treatment
      batch.userData.kind = objects[0].userData.kind
      batch.castShadow = batch.receiveShadow = true
      let instance = 0
      const placement = new THREE.Matrix4(), transform = new THREE.Matrix4()
      for (let n = 0; n < 6; n++) {
        placement.makeTranslation(coords[i] + (n % 2 ? 0.63 : -0.63), 0.25, Math.floor(n / 2) * 1.05 - 1.05)
        for (const object of objects) batch.setMatrixAt(instance++, transform.multiplyMatrices(placement, object.matrixWorld))
      }
      batch.computeBoundingSphere()
      group.add(batch)
    }
  }
  followPoint()
}
function followPoint() {
  if (!pointTarget || !pointAnchor || !camera) return
  const record = props.records.find(r => r.treatment === pointAnchor.treatment)
  if (!Number.isFinite(record?.height)) {
    pointFocus.value = 'Sin altura disponible para representar esta planta · usa Centrar todo'
    return
  }
  const missingFlower = ['petal','pollen','stamen','anther'].includes(pointAnchor.kind) && !(record.flowers > 0)
  const missingFruit = ['pepper','calyx'].includes(pointAnchor.kind) && !(record.fruits > 0)
  const next = pointAnchor.base.clone()
  next.y += record.height * .055 * pointAnchor.level
  if (!missingFlower && !missingFruit) { next.x += pointAnchor.dx; next.z += pointAnchor.dz; pointFocus.value = pointAnchor.label }
  else pointFocus.value = 'Sin estructura reproductiva medida para esta semana · enfoque en el tallo ilustrativo'
  next.clamp(fieldBounds.min, fieldBounds.max)
  const delta = next.clone().sub(pointTarget)
  controls.target.add(delta)
  camera.position.add(delta)
  pointTarget.copy(next)
  controls.update()
}
function disposeInstances() {
  plants?.traverse(object => { if (object.isInstancedMesh) object.dispose() })
}
function updateSelection() {
  plots.forEach((plot, i) => {
    const selected = props.selected.includes(treatments[i].id)
    plot.rim.material = props.focused === treatments[i].id && selected ? plot.activeMat : plot.baseMat
    plot.roof.visible = props.coversVisible && props.view !== 'superior' && selected
    plot.posts.visible = selected
    const inspecting = props.inspection && props.focused === treatments[i].id
    for (const object of plot.roof.children) {
      if (object.material?.transparent) object.material.opacity = object.isMesh ? (inspecting ? 0.1 : 0.18) : (inspecting ? 0.32 : 0.48)
    }
  })
  plants?.children.forEach(group => { group.visible = props.selected.includes(group.userData.treatment) })
}
function projection(height) {
  frustumHeight = height
  camera.left = -height * aspect / 2
  camera.right = height * aspect / 2
  camera.top = height / 2
  camera.bottom = -height / 2
  camera.updateProjectionMatrix()
}
function frameHeight(probe) {
  probe.updateMatrixWorld()
  const plotX = coords[treatments.findIndex(t => t.id === props.focused)]
  const bounds = props.inspection
    ? [-1.55, 1.55].flatMap(x => [-0.15, 2.85].flatMap(y => [-2.05, 2.05].map(z => new THREE.Vector3(plotX + x, y, z))))
    : corners
  let halfWidth = 0, halfHeight = 0
  for (const corner of bounds) {
    projected.copy(corner).applyMatrix4(probe.matrixWorldInverse)
    halfWidth = Math.max(halfWidth, Math.abs(projected.x))
    halfHeight = Math.max(halfHeight, Math.abs(projected.y))
  }
  return Math.max(props.inspection ? 3.6 : 5.7, halfHeight * 2.15, halfWidth * 2.15 / aspect)
}
function fitPreset() {
  projection(frameHeight(camera))
}
function focusCenter() {
  return props.inspection
    ? new THREE.Vector3(coords[treatments.findIndex(t => t.id === props.focused)], center.y, 0)
    : center.clone()
}
function limitNavigation() {
  const bounds = fieldBounds.clone()
  if (props.inspection && !pointTarget) {
    const x = coords[treatments.findIndex(t => t.id === props.focused)]
    bounds.min.x = x - 1.5
    bounds.max.x = x + 1.5
  }
  constrainNavigation(camera, controls, bounds)
}
function resize() {
  if (!renderer || !host.value) return
  const width = host.value.clientWidth, height = host.value.clientHeight
  if (!width || !height) return
  const oldAspect = aspect
  aspect = width / height
  // Keep the inspected point, zoom and orientation across fullscreen and resize.
  projection(frustumHeight * Math.max(1, oldAspect) / Math.max(1, aspect))
  renderer.setSize(width, height)
  if (props.view !== 'libre' && !transition && !pointTarget) fitPreset()
}
function clearInertia() {
  controls.enableDamping = false
  controls.update()
  controls.enableDamping = !motion.matches
}
function requestPreset() {
  if (!controls) return
  pointTarget = null
  pointAnchor = null
  pointFocus.value = ''
  clearInertia()
  const toTarget = focusCenter()
  // Orthographic framing approaches the plot without moving the camera into its structure.
  const destination = (positions[props.view] ?? positions.frontal).clone().sub(center).add(toTarget)
  const probe = camera.clone()
  probe.position.copy(destination)
  probe.lookAt(toTarget)
  transition = {
    started: performance.now(), position: camera.position.clone(),
    target: controls.target.clone(), zoom: camera.zoom, destination, toTarget,
    height: frustumHeight, toHeight: frameHeight(probe),
  }
}
function stopTransition() {
  if (!transition) return
  transition = null
  clearInertia()
}
function freeView() {
  if (!controls) return
  stopTransition()
  if (props.view !== 'libre') emit('free-view')
}
function releaseCamera() {
  freeView()
  pointTarget = null
  pointAnchor = null
  pointFocus.value = ''
}
function focusAt(point, label, treatment = props.focused, kind = 'plant', span = .6) {
  if (!controls) return
  freeView()
  clearInertia()
  pointTarget = point.clone().clamp(fieldBounds.min, fieldBounds.max)
  const x = coords[treatments.findIndex(t => t.id === treatment)]
  const bases = [-.63,.63].flatMap(dx => [-1.05,0,1.05].map(z => new THREE.Vector3(x+dx,.25,z)))
  const base = bases.sort((a,b) => Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z))[0]
  const record = props.records.find(r => r.treatment === treatment)
  pointAnchor = { treatment, kind, label, base, level:(pointTarget.y-.25)/Math.max(.01,record.height*.055), dx:pointTarget.x-base.x, dz:pointTarget.z-base.z }
  const offset = camera.position.clone().sub(controls.target)
  controls.target.copy(pointTarget)
  camera.position.copy(pointTarget).add(offset)
  camera.zoom = Math.min(zoomLimits.max, Math.max(camera.zoom, frustumHeight / span))
  camera.updateProjectionMatrix()
  controls.update()
  limitNavigation()
  pointFocus.value = label
}
function focusPlant() {
  if (!props.selected.includes(props.focused)) return
  const record = props.records.find(r => r.treatment === props.focused)
  if (!Number.isFinite(record?.height)) return
  const x = coords[treatments.findIndex(t => t.id === props.focused)] - .63
  focusAt(new THREE.Vector3(x, .25 + record.height * .055 * .75, 1.05), 'Planta ilustrativa · doble clic en una estructura para enfocarla')
}
function focusStructure(kind) {
  const record = props.records.find(r => r.treatment === props.focused)
  if (!props.selected.includes(props.focused) || !Number.isFinite(record?.height) || !(record[kind] > 0)) return
  const x = coords[treatments.findIndex(t => t.id === props.focused)] - .63
  if (kind === 'flowers') focusAt(new THREE.Vector3(x+.13,.25+record.height*.055*.83,1.11),'Flor ilustrativa · detalle de pétalos y estambres',props.focused,'petal',.42)
  if (kind === 'fruits') {
    const size=.75+Math.min(record.fruits,3)*.28
    const point=new THREE.Vector3(0,-.15*size,0).applyAxisAngle(new THREE.Vector3(0,0,1),-.2)
    point.add(new THREE.Vector3(x-.18,.25+record.height*.055*.72,1.29))
    focusAt(point,'Fruto ilustrativo · tamaño no equivalente a una medición individual',props.focused,'pepper',.5)
  }
}
function zoomBy(factor) {
  if (!controls || failure.value) return
  freeView()
  camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom)
  camera.updateProjectionMatrix()
  controls.update()
}
function keyCamera(event) {
  if (event.key.startsWith('Arrow')) freeView()
  if (['+', '=', '-'].includes(event.key)) {
    event.preventDefault()
    zoomBy(event.key === '-' ? 1 / 1.2 : 1.2)
  }
  if (event.key.toLowerCase() === 'r') { event.preventDefault(); emit('reset') }
}
function beginPick(event) {
  pointers.add(event.pointerId)
  if (pointers.size > 1) {
    if (gesture) gesture.moved = true
    freeView()
  } else {
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, button: event.button }
  }
}
function movePick(event) {
  if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5) {
    gesture.moved = true
    freeView()
  }
}
function endPick(event) {
  if (gesture?.id === event.pointerId && !gesture.moved && gesture.button === 0 && pointers.size === 1) pick(event)
  pointers.delete(event.pointerId)
  if (!pointers.size) gesture = null
}
function cancelPick(event) {
  pointers.delete(event.pointerId)
  gesture = null
}
function intersections(event, objects) {
  if (!renderer || failure.value) return
  const rect = renderer.domElement.getBoundingClientRect()
  raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
  return raycaster.intersectObjects(objects, true).filter(hit => {
    if (!hit.object.userData.treatment || !props.selected.includes(hit.object.userData.treatment)) return false
    for (let object = hit.object; object; object = object.parent) if (!object.visible) return false
    return true
  })
}
function pick(event) {
  const hit = intersections(event, field.children)?.[0]
  if (hit) emit('inspect', hit.object.userData.treatment)
}
function inspectPoint(event) {
  const hit = intersections(event, plants.children)?.[0]
  if (!hit) return
  const names = { petal: 'Pétalo', pollen: 'Centro floral', pepper: 'Fruto', calyx: 'Cáliz', leaf: 'Hoja', vein: 'Nervadura', stem: 'Tallo o rama' }
  focusAt(hit.point, (names[hit.object.userData.kind] ?? 'Planta') + ' · representación ilustrativa', hit.object.userData.treatment, hit.object.userData.kind)
}
function handleContextLoss(event) {
  event.preventDefault()
  failure.value = 'Se perdió la conexión gráfica. Recarga la página para recuperar el escenario. Los datos siguen disponibles.'
  cancelAnimationFrame(frame)
}
function buildField() {
  field = new THREE.Group()
  scene.add(field)
  mesh(own(new THREE.BoxGeometry(15.3, 0.25, 5.8)), material('#c6ceb4'), field, [0, -0.24, 0]).castShadow = false
  const soilMat = material('#785b42'), ridgeMat = material('#92704e')
  const postMat = material('#7f8a71', { metalness: 0.18, roughness: 0.65 })
  const woodMat = material('#b99c72')
  const bedGeo = own(new THREE.BoxGeometry(2.82, 0.22, 3.8))
  const rimGeo = own(new THREE.BoxGeometry(3.04, 0.12, 4.03))
  const ridgeGeo = own(new THREE.CylinderGeometry(0.35, 0.4, 3.5, 8))
  const postGeo = own(new THREE.CylinderGeometry(0.025, 0.035, 2.65, 6))
  const footGeo = own(new THREE.BoxGeometry(0.14, 0.12, 0.14))
  const roofGeo = own(new THREE.BoxGeometry(2.98, 0.012, 3.98))
  const beamGeo = own(new THREE.BoxGeometry(3, 0.045, 0.045))
  const longBeamGeo = own(new THREE.BoxGeometry(0.045, 0.045, 4))
  const endRail = own(new THREE.BoxGeometry(3, 0.15, 0.07))
  const sideRail = own(new THREE.BoxGeometry(0.07, 0.15, 3.98))
  const netPoints = []
  for (let i = 0; i <= 20; i++) {
    const x = -1.48 + i * 0.148
    netPoints.push(x, 2.74, -1.98, x, 2.74, 1.98)
  }
  for (let i = 0; i <= 26; i++) {
    const z = -1.98 + i * 3.96 / 26
    netPoints.push(-1.48, 2.74, z, 1.48, 2.74, z)
  }
  const netGeo = own(new THREE.BufferGeometry())
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPoints, 3))
  treatments.forEach((t, i) => {
    const baseMat = material('#c7b99a'), activeMat = material(t.color)
    const rim = mesh(rimGeo, baseMat, field, [coords[i], -0.01, 0], t.id)
    mesh(bedGeo, soilMat, field, [coords[i], 0.01, 0], t.id)
    for (const dx of [-0.63, 0.63]) {
      const ridge = mesh(ridgeGeo, ridgeMat, field, [coords[i] + dx, 0.12, 0], t.id)
      ridge.rotation.x = Math.PI / 2
      ridge.scale.z = 0.33
    }
    for (const dz of [-1.97, 1.97]) mesh(endRail, woodMat, field, [coords[i], 0.12, dz], t.id)
    for (const dx of [-1.47, 1.47]) mesh(sideRail, woodMat, field, [coords[i] + dx, 0.12, 0], t.id)
    const roof = new THREE.Group(), posts = new THREE.Group()
    roof.position.x = coords[i]
    field.add(roof, posts)
    if (t.id !== 'control') {
      const roofMat = material(t.color, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
      mesh(roofGeo, roofMat, roof, [0, 2.73, 0], t.id).castShadow = false
      const net = new THREE.LineSegments(netGeo, own(new THREE.LineBasicMaterial({ color: t.color, transparent: true, opacity: 0.48 })))
      net.userData.treatment = t.id
      roof.add(net)
      for (const dx of [-1.47, 1.47]) {
        for (const dz of [-1.97, 1.97]) {
          mesh(postGeo, postMat, posts, [coords[i] + dx, 1.39, dz], t.id)
          mesh(footGeo, postMat, posts, [coords[i] + dx, 0.1, dz], t.id)
        }
        mesh(longBeamGeo, postMat, roof, [dx, 2.75, 0], t.id)
      }
      for (const dz of [-1.97, 1.97]) mesh(beamGeo, postMat, roof, [0, 2.75, dz], t.id)
    }
    plots.push({ rim, roof, posts, baseMat, activeMat })
  })
  cropModels = createCropModels()
  plants = new THREE.Group()
  field.add(plants)
  buildPlants()
  updateSelection()
}
onMounted(() => {
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color('#e9eee1')
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', handleContextLoss)
    host.value.appendChild(renderer.domElement)
    camera = new THREE.OrthographicCamera(-9, 9, 5, -5, 0.1, 100)
    camera.position.copy(positions.frontal)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    controls.cursor.copy(center)
    controls.maxTargetRadius = Infinity
    controls.minPolarAngle = 0.025
    controls.maxPolarAngle = Math.PI / 2 - 0.12
    controls.minZoom = zoomLimits.min
    controls.maxZoom = zoomLimits.max
    controls.zoomToCursor = true
    controls.screenSpacePanning = true
    controls.enableDamping = !motion.matches
    controls.dampingFactor = 0.12
    controls.rotateSpeed = 0.6
    controls.panSpeed = 0.65
    controls.listenToKeyEvents(host.value)
    controls.addEventListener('start', stopTransition)
    controls.update()
    raycaster = new THREE.Raycaster()
    scene.add(new THREE.HemisphereLight('#fffdf4', '#87966a', 2.1))
    const sun = new THREE.DirectionalLight('#fff4df', 2.5)
    sun.position.set(-6, 12, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 10, bottom: -10 })
    sun.shadow.normalBias = 0.035
    sun.shadow.bias = -0.0003
    scene.add(sun)
    buildField()
    resize()
    fitPreset()
    observer = new ResizeObserver(resize)
    observer.observe(host.value)
    function animate(time) {
      controls.enableDamping = !motion.matches
      if (transition) {
        const progress = motion.matches ? 1 : Math.min((time - transition.started) / 650, 1)
        const eased = progress * progress * (3 - 2 * progress)
        camera.position.lerpVectors(transition.position, transition.destination, eased)
        controls.target.lerpVectors(transition.target, transition.toTarget, eased)
        controls.cursor.copy(controls.target)
        camera.zoom = THREE.MathUtils.lerp(transition.zoom, 1, eased)
        projection(THREE.MathUtils.lerp(transition.height, transition.toHeight, eased))
        controls.update()
        if (progress === 1) {
          transition = null
        }
      } else {
        controls.update()
      }
      limitNavigation()
      zoomLevel.value = Math.round(camera.zoom * 10) / 10
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
  } catch {
    failure.value = 'Tu navegador no pudo iniciar la vista 3D. Puedes seguir comparando los datos y consultar las fichas de cada tratamiento.'
  }
})
watch(() => props.records, () => { buildPlants(); updateSelection() })
watch(() => [props.view, props.selected, props.focused, props.inspection, props.coversVisible], updateSelection, { deep: true })
watch(() => props.cameraRequest, requestPreset)
defineExpose({ zoomBy, releaseCamera, focusPlant, focusStructure,
  getCameraState: () => camera && ({ position:camera.position.toArray(), target:controls.target.toArray(), quaternion:camera.quaternion.toArray(), zoom:camera.zoom, frustumHeight, aspect, fieldPosition:field.position.toArray(), fieldScale:field.scale.toArray() }),
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  controls?.removeEventListener('start', stopTransition)
  controls?.dispose()
  disposeInstances()
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLoss)
    renderer.dispose()
  }
  cropModels?.dispose()
  resources.forEach(resource => resource.dispose())
  resources = []
  plots = []
})
</script>

<template>
  <div class="field-wrap">
    <div class="field-overlay"><span class="sun-icon" aria-hidden="true">☀</span><span>UVG · Campus Sur<small>Montaje esquemático</small></span></div>
    <div ref="host" class="field-canvas" role="group" tabindex="0" :aria-label="'Cultivo ilustrativo en vista ' + view" aria-describedby="camera-help"
      @pointerdown.capture="beginPick" @pointermove.capture="movePick" @pointerup.capture="endPick" @pointercancel.capture="cancelPick"
      @wheel.capture="freeView" @keydown.capture="keyCamera" @dblclick="inspectPoint" @contextmenu.prevent></div>
    <div v-if="failure" class="scene-failure" role="status">{{ failure }}</div>
    <p id="camera-help" class="mouse-help"><span class="desktop-help">Arrastra: girar · Rueda: zoom al cursor · Doble clic: enfocar estructura</span><span class="touch-help">Un dedo: girar · Dos dedos: zoom y desplazamiento · Acercar a planta: inspección</span><span class="sr-only">. Con foco en el escenario, flechas para desplazar, + y − para zoom, R para centrar todo. Usa los botones de tratamiento para seleccionar con teclado.</span></p>
    <p v-if="pointFocus" class="point-focus" role="status">{{ pointFocus }}</p>
    <span class="scene-scale">PROMEDIOS · {{ view.toUpperCase() }} · Zoom {{ zoomLevel }}×</span>
  </div>
</template>
