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

export const format = (value, digits = 2) => new Intl.NumberFormat('es-PA', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(value)

export function dateLabel(date, short = false) {
  return new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
}

export function validateData(data) {
  if (!Array.isArray(data?.records) || !Array.isArray(data?.weeks) || !data.weeks.length) throw new Error('El archivo de biometría no tiene una estructura válida.')
  const dates = new Map()
  for (const w of data.weeks) {
    if (!Number.isInteger(w.week) || dates.has(w.week) || !/^\d{4}-\d{2}-\d{2}$/.test(w.date) || Number.isNaN(Date.parse(w.date))) throw new Error('Las semanas o fechas no son válidas.')
    dates.set(w.week, w.date)
  }
  const keys = new Set()
  for (const r of data.records) {
    const key = r.week + ':' + r.treatment
    if (keys.has(key) || !treatments.some(t => t.id === r.treatment) || dates.get(r.week) !== r.date ||
      !Number.isInteger(r.plants) || r.plants < 1 || metrics.some(m => typeof r[m.id] !== 'number' || !Number.isFinite(r[m.id]) || r[m.id] < 0)) {
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
  const absolute = record[variable] - control[variable]
  return { absolute, percent: control[variable] === 0 ? null : absolute / control[variable] * 100 }
}

export function weeklyMaximum(records, variable = 'height') {
  if (!records.length) return null
  const value = Math.max(...records.map(record => record[variable]))
  return { value, treatments: records.filter(record => record[variable] === value).map(record => record.treatment) }
}

export const formatSigned = value => new Intl.NumberFormat('es-PA', {
  minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero',
}).format(value)
