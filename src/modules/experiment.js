export const treatments = [
  { id: 'rojo', label: 'Sarán rojo', short: 'Rojo', color: '#c65f53' },
  { id: 'azul', label: 'Sarán azul', short: 'Azul', color: '#4a80b7' },
  { id: 'verde', label: 'Sarán verde', short: 'Verde', color: '#5a8d62' },
  { id: 'control', label: 'Sin sarán', short: 'Control', color: '#7d8178' },
]

export const metrics = [
  { id: 'height', label: 'Altura', unit: 'cm', description: 'Altura promedio' },
  { id: 'diameter', label: 'Diámetro del tallo', unit: 'mm', description: 'Diámetro promedio del tallo' },
  { id: 'leaves', label: 'Hojas', unit: 'hojas/planta', description: 'Promedio de hojas' },
  { id: 'flowers', label: 'Flores', unit: 'flores/planta', description: 'Promedio de flores' },
  { id: 'fruits', label: 'Frutos', unit: 'frutos/planta', description: 'Promedio de frutos' },
]

export const format = (value, digits = 2) => !Number.isFinite(value) ? 'Sin datos' : new Intl.NumberFormat('es-PA', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(value)

export function dateLabel(date, short = false) {
  return new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
}

export function validateData(data) {
  if (!Array.isArray(data?.records) || !Array.isArray(data?.observations) || !data.observations.length || !Array.isArray(data?.weeks) || !data.weeks.length) throw new Error('El archivo de biometría no tiene una estructura válida.')
  const dates = new Map()
  for (const w of data.weeks) {
    if (w.week !== dates.size + 1 || dates.has(w.week) || !/^\d{4}-\d{2}-\d{2}$/.test(w.date) || Number.isNaN(Date.parse(w.date))) throw new Error('Las semanas o fechas no son válidas.')
    dates.set(w.week, w.date)
  }
  const keys = new Set()
  for (const r of data.records) {
    const key = r.week + ':' + r.treatment
    if (keys.has(key) || !treatments.some(t => t.id === r.treatment) || dates.get(r.week) !== r.date ||
      !Number.isInteger(r.plants) || r.plants < 0 || !Number.isInteger(r.sampleSlots) || r.sampleSlots < r.plants ||
      !Array.isArray(r.sourceRows) || r.sourceRows.length !== r.sampleSlots || metrics.some(m => {
        const n = r.sampleCounts?.[m.id], value = r[m.id]
        return !Number.isInteger(n) || n < 0 || n > r.plants ||
          (n === 0 ? value !== null : !Number.isFinite(value) || value < 0)
      })) {
      throw new Error('Hay observaciones duplicadas, incompletas o no válidas.')
    }
    keys.add(key)
  }
  if (keys.size !== dates.size * treatments.length) throw new Error('Faltan tratamientos en una o más semanas.')
  return data
}

export function recordsAt(records, week, ids) {
  return records.filter(r => r.week === week && ids.includes(r.treatment))
}

export function differenceFromControl(record, control, variable) {
  if (!Number.isFinite(record?.[variable]) || !Number.isFinite(control?.[variable])) return { absolute: null, percent: null }
  const absolute = record[variable] - control[variable]
  return { absolute, percent: control[variable] === 0 ? null : absolute / control[variable] * 100 }
}

export function weeklyMaximum(records, variable = 'height') {
  const measured = records.filter(record => Number.isFinite(record[variable]))
  if (!measured.length) return null
  const value = Math.max(...measured.map(record => record[variable]))
  return { value, treatments: measured.filter(record => record[variable] === value).map(record => record.treatment) }
}

export const formatSigned = value => !Number.isFinite(value) ? 'Sin datos' : new Intl.NumberFormat('es-PA', {
  minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero',
}).format(value)
