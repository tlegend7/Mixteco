<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { treatments } from '../modules/experiment'

const props = defineProps({ records: Array, selected: Array, focused: String, view: String })
const emit = defineEmits(['inspect'])
const host = ref(null)
const failure = ref('')
let renderer, scene, camera, observer, frame, field, roofs, plants, raycaster
let plots = [], resources = []
let aspect = 1
const corners = [-7.65, 7.65].flatMap(x => [-0.4, 2.8].flatMap(y => [-2.9, 2.9].map(z => new THREE.Vector3(x, y, z))))
const projected = new THREE.Vector3()
const target = new THREE.Vector3(0, 0.6, 0)
const positions = {
  frontal: new THREE.Vector3(10, 11, 17),
  lateral: new THREE.Vector3(0, 3.8, 22),
  superior: new THREE.Vector3(0, 24, 0.01),
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const coords = [-5.1, -1.7, 1.7, 5.1]
function own(resource) { resources.push(resource); return resource }
const material = (color, options = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...options }))
function mesh(geometry, mat, parent, position, treatment) {
  const m = new THREE.Mesh(geometry, mat)
  m.position.set(...position)
  m.castShadow = true
  m.receiveShadow = true
  if (treatment) m.userData.treatment = treatment
  parent.add(m)
  return m
}
let stemGeo, leafGeo, fruitGeo, flowerGeo, stemMat, leafMat, fruitMat, flowerMat

function buildPlants() {
  if (!plants) return
  plants.clear()
  props.records.forEach(r => {
    const i = treatments.findIndex(t => t.id === r.treatment)
    const group = new THREE.Group()
    group.visible = props.selected.includes(r.treatment)
    plants.add(group)
    // Six identical illustrative plants per area; no individual measurements are inferred.
    for (let n = 0; n < 6; n++) {
      const plant = new THREE.Group()
      plant.position.set(coords[i] + (n % 2 ? 0.63 : -0.63), 0.16, Math.floor(n / 2) * 1.05 - 1.05)
      group.add(plant)
      const height = r.height * 0.055
      const stem = mesh(stemGeo, stemMat, plant, [0, height / 2, 0], r.treatment)
      stem.scale.set(r.diameter * 0.009, height, r.diameter * 0.009)
      const count = Math.max(2, Math.round(r.leaves / 3))
      for (let j = 0; j < count; j++) {
        const angle = j * 2.399
        const level = 0.22 + (j / count) * 0.75
        const size = 0.16 + Math.min(r.leaves, 45) / 150
        const leaf = mesh(leafGeo, leafMat, plant, [Math.sin(angle) * size * 0.55, height * level, Math.cos(angle) * size * 0.55], r.treatment)
        leaf.scale.set(size * 0.44, size * 0.12, size)
        leaf.rotation.set(-0.25, angle, Math.sin(angle) * 0.35)
      }
      // Fractional aggregate counts map to relative visual size, never individual counts.
      if (r.flowers > 0) {
        const flower = mesh(flowerGeo, flowerMat, plant, [0.16, height * 0.83, 0.04], r.treatment)
        flower.scale.setScalar(0.07 + r.flowers * 0.055)
      }
      if (r.fruits > 0) {
        const fruit = mesh(fruitGeo, fruitMat, plant, [-0.12, height * 0.61, 0.13], r.treatment)
        fruit.scale.set(0.07 * r.fruits, 0.19 * r.fruits, 0.07 * r.fruits)
        fruit.rotation.z = -0.3
      }
    }
  })
}

function updateSelection() {
  plots.forEach((plot, i) => {
    const t = treatments[i]
    plot.rim.material = props.focused === t.id && props.selected.includes(t.id) ? plot.activeMat : plot.baseMat
    plot.roof.visible = props.view !== 'superior' && props.selected.includes(t.id)
    plot.posts.visible = props.selected.includes(t.id)
  })
  if (plants) plants.children.forEach((g, i) => { g.visible = props.selected.includes(props.records[i].treatment) })
}
function resize() {
  if (!renderer || !host.value) return
  const width = host.value.clientWidth, height = host.value.clientHeight
  aspect = width / height
  fitCamera()
  renderer.setSize(width, height)
}
function fitCamera() {
  camera.updateMatrixWorld()
  let halfWidth = 0, halfHeight = 0
  for (const corner of corners) {
    projected.copy(corner).applyMatrix4(camera.matrixWorldInverse)
    halfWidth = Math.max(halfWidth, Math.abs(projected.x))
    halfHeight = Math.max(halfHeight, Math.abs(projected.y))
  }
  // Keep the entire plot in frame throughout the transition, including intermediate angles.
  const size = Math.max(8.7, 17.5 / aspect, halfHeight * 2.14, halfWidth * 2.14 / aspect)
  camera.left = -size * aspect / 2
  camera.right = size * aspect / 2
  camera.top = size / 2
  camera.bottom = -size / 2
  camera.updateProjectionMatrix()
}
function pick(event) {
  if (!renderer || failure.value) return
  const rect = renderer.domElement.getBoundingClientRect()
  raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
  const hit = raycaster.intersectObjects(field.children, true).find(h => h.object.userData.treatment)
  if (hit) emit('inspect', hit.object.userData.treatment)
}
function handleContextLoss(event) {
  event.preventDefault()
  failure.value = 'Se perdió la conexión gráfica. Recarga la página para recuperar el escenario. Los datos siguen disponibles.'
  cancelAnimationFrame(frame)
}
onMounted(() => {
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color('#edf1e7')
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', handleContextLoss)
    host.value.appendChild(renderer.domElement)
    camera = new THREE.OrthographicCamera(-9, 9, 5, -5, 0.1, 100)
    camera.position.copy(positions.frontal)
    raycaster = new THREE.Raycaster()
    scene.add(new THREE.HemisphereLight('#ffffff', '#afb795', 2.8))
    const sun = new THREE.DirectionalLight('#fff0ce', 3.2)
    sun.position.set(-6, 12, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 10, bottom: -10 })
    sun.shadow.bias = -0.001
    scene.add(sun)
    field = new THREE.Group()
    scene.add(field)
    const ground = mesh(own(new THREE.BoxGeometry(15.3, 0.25, 5.8)), material('#c7cfb5'), field, [0, -0.25, 0])
    ground.castShadow = false
    const soilMat = material('#7f6952')
    const postMat = material('#a3aa94', { metalness: 0.18 })
    const bedGeo = own(new THREE.BoxGeometry(2.82, 0.22, 3.8))
    const rimGeo = own(new THREE.BoxGeometry(3.03, 0.15, 4.01))
    const postGeo = own(new THREE.CylinderGeometry(0.028, 0.028, 2.55, 6))
    const roofGeo = own(new THREE.BoxGeometry(2.98, 0.035, 3.98))
    const beamGeo = own(new THREE.BoxGeometry(3, 0.035, 0.035))
    const longBeamGeo = own(new THREE.BoxGeometry(0.035, 0.035, 4))
    const rowGeo = own(new THREE.BoxGeometry(0.62, 0.07, 3.5))
    const rowMat = material('#947554')
    roofs = new THREE.Group()
    field.add(roofs)
    treatments.forEach((t, i) => {
      const baseMat = material('#b9c1a9')
      const activeMat = material(t.color)
      const rim = mesh(rimGeo, baseMat, field, [coords[i], -0.02, 0], t.id)
      mesh(bedGeo, soilMat, field, [coords[i], 0.01, 0], t.id)
      for (const dx of [-0.63, 0.63]) mesh(rowGeo, rowMat, field, [coords[i] + dx, 0.13, 0], t.id)
      const roof = new THREE.Group(), posts = new THREE.Group()
      roofs.add(roof)
      field.add(posts)
      if (t.id !== 'control') {
        const roofMat = material(t.color, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
        const covering = mesh(roofGeo, roofMat, roof, [coords[i], 2.62, 0], t.id)
        covering.castShadow = false
        for (const dx of [-1.47, 1.47]) {
          for (const dz of [-1.97, 1.97]) mesh(postGeo, postMat, posts, [coords[i] + dx, 1.32, dz], t.id)
          mesh(longBeamGeo, postMat, roof, [coords[i] + dx, 2.64, 0], t.id)
        }
        for (const dz of [-1.97, 1.97]) mesh(beamGeo, postMat, roof, [coords[i], 2.64, dz], t.id)
        // Parallel threads suggest a net without inventing the mesh's shade percentage.
        const threadGeo = own(new THREE.BoxGeometry(0.012, 0.012, 3.94))
        const threadMat = material(t.color, { transparent: true, opacity: 0.4 })
        for (let j = 0; j < 11; j++) mesh(threadGeo, threadMat, roof, [coords[i] - 1.4 + j * 0.28, 2.65, 0], t.id).castShadow = false
      }
      plots.push({ rim, roof, posts, baseMat, activeMat })
    })
    stemGeo = own(new THREE.CylinderGeometry(0.7, 1, 1, 7))
    leafGeo = own(new THREE.SphereGeometry(1, 8, 5))
    fruitGeo = own(new THREE.SphereGeometry(1, 8, 6))
    flowerGeo = own(new THREE.SphereGeometry(1, 5, 3))
    stemMat = material('#4c7838')
    leafMat = material('#3e7940')
    fruitMat = material('#24552c')
    flowerMat = material('#fff4cd')
    plants = new THREE.Group()
    field.add(plants)
    buildPlants()
    updateSelection()
    resize()
    observer = new ResizeObserver(resize)
    observer.observe(host.value)
    let previous = 0
    const animate = time => {
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 1 / 60
      previous = time
      camera.position.lerp(positions[props.view], reduceMotion ? 1 : 1 - Math.exp(-6 * dt))
      camera.lookAt(target)
      fitCamera()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
  } catch {
    failure.value = 'Tu navegador no pudo iniciar la vista 3D. Puedes seguir comparando los datos y consultar las fichas de cada tratamiento.'
  }
})
watch(() => props.records, () => { buildPlants(); updateSelection() })
watch(() => [props.view, props.selected, props.focused], updateSelection, { deep: true })
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLoss)
    renderer.dispose()
  }
  resources.forEach(r => r.dispose())
  resources = []
  plots = []
})
</script>

<template>
  <div class="field-wrap">
    <div class="field-overlay"><span class="sun-icon" aria-hidden="true">☀</span><span>UVG · Campus Sur<small>Montaje esquemático</small></span></div>
    <div ref="host" class="field-canvas" role="img" :aria-label="'Cultivo ilustrativo en vista ' + view + '. Usa los botones inferiores para examinar cada tratamiento.'" @click="pick"></div>
    <div v-if="failure" class="scene-failure" role="status">{{ failure }}</div>
    <span class="scene-scale">MODELO DE PROMEDIOS · {{ view.toUpperCase() }}</span>
  </div>
</template>
