import { validateData, treatments } from '../modules/experiment'

async function read(file) {
  const response = await fetch(import.meta.env.BASE_URL + 'data/' + file)
  if (!response.ok) throw new Error('No se pudo cargar ' + file + '. Intenta nuevamente.')
  return response.json()
}

export async function loadExperiment() {
  const [biometry, environment] = await Promise.all([read('biometria.json'), read('ambiente.json')])
  validateData(biometry)
  if (!Array.isArray(environment.records) || environment.records.length !== 4 ||
    new Set(environment.records.map(r => r.treatment)).size !== 4 ||
    environment.records.some(r => !treatments.some(t => t.id === r.treatment) ||
      !Number.isFinite(r.temperature) || !Number.isFinite(r.humidity) || r.humidity < 0 || r.humidity > 100)) {
    throw new Error('Las lecturas ambientales no son válidas.')
  }
  return { biometry, environment }
}
