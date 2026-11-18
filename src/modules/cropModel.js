import * as THREE from 'three'

// Shared low-poly assets: rebuilding a week reuses every geometry and material.
export function createCropModels() {
  const resources = []
  const own = resource => { resources.push(resource); return resource }
  const mat = (color, extra = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }))
  const stemMaterial = mat('#52753b')
  const leafMaterial = mat('#347b47', { side: THREE.DoubleSide })
  const veinMaterial = mat('#719452')
  const petalMaterial = mat('#fff7df', { side: THREE.DoubleSide })
  const pollenMaterial = mat('#dcb044')
  const fruitMaterial = mat('#42712a', { roughness: 0.48, vertexColors: true })
  const stemGeometry = own(new THREE.CylinderGeometry(0.45, 1, 1, 6))
  const branchGeometry = own(new THREE.CylinderGeometry(0.65, 1, 1, 5))
  const blade = new THREE.Shape()
  blade.moveTo(0, 0)
  blade.bezierCurveTo(-0.32, 0.25, -0.27, 0.68, 0, 1)
  blade.bezierCurveTo(0.27, 0.68, 0.32, 0.25, 0, 0)
  const leafGeometry = own(new THREE.ShapeGeometry(blade, 8))
  const leafPositions = leafGeometry.attributes.position
  for (let i = 0; i < leafPositions.count; i++) {
    const height = leafPositions.getY(i)
    leafPositions.setZ(i, Math.sin(height * Math.PI) * 0.12 + height * height * 0.15)
  }
  leafGeometry.computeVertexNormals()
  const petal = new THREE.Shape()
  petal.moveTo(0, 0)
  petal.bezierCurveTo(-.3, .14, -.42, .62, -.12, .94)
  petal.quadraticCurveTo(0, 1.08, .12, .94)
  petal.bezierCurveTo(.42, .62, .3, .14, 0, 0)
  const petalGeometry = own(new THREE.ExtrudeGeometry(petal, { depth:.06, bevelEnabled:true, bevelThickness:.025, bevelSize:.025, bevelSegments:1, steps:1, curveSegments:5 }))
  const petalPositions = petalGeometry.attributes.position
  for (let i=0; i<petalPositions.count; i++) {
    const level = petalPositions.getY(i)
    petalPositions.setZ(i, petalPositions.getZ(i) + Math.sin(level*Math.PI)*.15 - level*level*.22)
  }
  petalGeometry.computeVertexNormals()
  const pollenGeometry = own(new THREE.SphereGeometry(1, 8, 5))
  const fruitGeometry = own(new THREE.LatheGeometry([
    new THREE.Vector2(0.002, 0), new THREE.Vector2(0.025, 0.025),
    new THREE.Vector2(0.055, 0.1), new THREE.Vector2(0.065, 0.23),
    new THREE.Vector2(0.052, 0.29), new THREE.Vector2(0.018, 0.32),
  ], 14))
  const fruitPositions = fruitGeometry.attributes.position
  for (let i = 0; i < fruitPositions.count; i++) {
    fruitPositions.setX(i, fruitPositions.getX(i) + Math.sin(fruitPositions.getY(i) / 0.32 * Math.PI) * 0.018)
  }
  fruitGeometry.computeVertexNormals()
  const fruitColors=[]
  for (let i=0; i<fruitPositions.count; i++) {
    const shade=.92 + fruitPositions.getY(i)*.2 + Math.cos(Math.atan2(fruitPositions.getZ(i),fruitPositions.getX(i))*7)*.025
    fruitColors.push(shade,shade,shade)
  }
  fruitGeometry.setAttribute('color',new THREE.Float32BufferAttribute(fruitColors,3))
  const up = new THREE.Vector3(0, 1, 0)
  function add(parent, geometry, material, position, kind) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.kind = kind
    parent.add(mesh)
    return mesh
  }
  function branch(parent, start, end, radius) {
    const direction = new THREE.Vector3().subVectors(end, start)
    const mesh = add(parent, branchGeometry, stemMaterial, start.clone().add(end).multiplyScalar(0.5), 'stem')
    mesh.scale.set(radius, direction.length(), radius)
    mesh.quaternion.setFromUnitVectors(up, direction.normalize())
    add(parent, pollenGeometry, stemMaterial, end, 'joint').scale.setScalar(radius * 1.25)
  }
  function create(record) {
    const plant = new THREE.Group()
    // Missing dimensions do not describe a zero-sized plant or justify an invented model.
    if (!Number.isFinite(record.height) || !Number.isFinite(record.diameter)) return plant
    const height = record.height * 0.055
    const radius = record.diameter * 0.006
    const stem = add(plant, stemGeometry, stemMaterial, new THREE.Vector3(0, height / 2, 0), 'stem')
    stem.scale.set(radius, height, radius)
    const leaves = record.leaves > 0 ? Math.max(2, Math.round(record.leaves / 2.7)) : 0
    for (let j = 0; j < leaves; j++) {
      const angle = j * 2.399
      const level = 0.25 + j / leaves * 0.61
      const length = (0.21 + Math.min(record.leaves, 46) / 150) * (1 - 0.35 * j / leaves)
      const origin = new THREE.Vector3(0, height * level, 0)
      const end = new THREE.Vector3(Math.sin(angle) * length * 0.45, height * level + length * 0.12, Math.cos(angle) * length * 0.45)
      branch(plant, origin, end, radius * 0.5)
      const leaf = new THREE.Group()
      leaf.position.copy(end)
      leaf.quaternion.setFromUnitVectors(up, new THREE.Vector3(Math.sin(angle), 0.38, Math.cos(angle)).normalize())
      leaf.rotateY(angle + 0.4)
      leaf.scale.set(length * 1.15, length, length)
      add(leaf, leafGeometry, leafMaterial, new THREE.Vector3(), 'leaf')
      const vein=add(leaf,branchGeometry,veinMaterial,new THREE.Vector3(0,.46,.14),'vein')
      vein.scale.set(.009,.86,.009)
      plant.add(leaf)
    }
    if (record.flowers > 0) {
      const flower = new THREE.Group()
      flower.userData.kind = 'flower'
      flower.position.set(0.13, height * 0.83, 0.06)
      flower.rotation.x = -0.45
      flower.scale.setScalar(1.05 + Math.min(record.flowers, 2) * 0.4)
      branch(plant, new THREE.Vector3(0, height * 0.74, 0), flower.position, radius * 0.4)
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * Math.PI * 2
        const petal = add(flower, petalGeometry, petalMaterial, new THREE.Vector3(0,0,.004), 'petal')
        petal.scale.setScalar(.105)
        petal.rotation.z = angle - Math.PI / 2
      }
      add(flower, pollenGeometry, pollenMaterial, new THREE.Vector3(0, 0, 0.015), 'pollen').scale.setScalar(0.025)
      for(let i=0; i<5; i++) {
        const angle=i/5*Math.PI*2
        const stamen=add(flower,branchGeometry,stemMaterial,new THREE.Vector3(Math.cos(angle)*.02,Math.sin(angle)*.02,.031),'stamen')
        stamen.rotation.x=Math.PI/2
        stamen.scale.set(.004,.035,.004)
        add(flower,pollenGeometry,pollenMaterial,new THREE.Vector3(Math.cos(angle)*.02,Math.sin(angle)*.02,.05),'anther').scale.set(.008,.012,.008)
      }
      plant.add(flower)
    }
    if (record.fruits > 0) {
      const fruit = new THREE.Group()
      fruit.userData.kind = 'fruit'
      fruit.position.set(-0.18, height * 0.72, 0.24)
      fruit.rotation.z = -0.2
      fruit.scale.setScalar(0.75 + Math.min(record.fruits, 3) * 0.28)
      branch(plant, new THREE.Vector3(0, height * 0.82, 0), fruit.position, radius * 0.6)
      add(fruit, fruitGeometry, fruitMaterial, new THREE.Vector3(0, -0.32, 0), 'pepper')
      add(fruit, pollenGeometry, stemMaterial, new THREE.Vector3(0, 0.005, 0), 'calyx').scale.set(0.055, 0.018, 0.055)
      plant.add(fruit)
    }
    plant.traverse(object => { object.userData.treatment = record.treatment })
    return plant
  }
  return { create, dispose: () => resources.forEach(resource => resource.dispose()) }
}
