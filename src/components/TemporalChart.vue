<script setup>
import { computed, ref, watch } from 'vue'
import { treatments, format, dateLabel } from '../modules/experiment'
const props = defineProps({ records: Array, weeks: Array, selected: Array, week: Number, metric: Object })
const emit = defineEmits(['select-week'])
const svg = ref(null)
const tooltip = ref(null)
const active = ref(null)
const lines = computed(() => treatments.filter(t => props.selected.includes(t.id)).map(t => ({
  ...t, records: props.records.filter(r => r.treatment === t.id).sort((a, b) => a.week - b.week),
})))
const top = computed(() => {
  const max = Math.max(0, ...lines.value.flatMap(t => t.records.map(r => r[props.metric.id])).filter(Number.isFinite))
  const step = max <= 2 ? 0.5 : max <= 6 ? 2 : max <= 20 ? 5 : 10
  return Math.max(step * 4, Math.ceil(max / (step * 4)) * step * 4)
})
const x = w => 44 + (w - props.weeks[0].week) / Math.max(1, props.weeks.at(-1).week - props.weeks[0].week) * 360
const y = v => 159 - v / top.value * 131
const measured = records => records.filter(r => Number.isFinite(r[props.metric.id]))
const hasMeasurements = computed(() => lines.value.some(t => measured(t.records).length))
const points = records => {
  let connected = false
  return records.map(r => {
    if (!Number.isFinite(r[props.metric.id])) { connected = false; return '' }
    const command = connected ? 'L' : 'M'
    connected = true
    return command + x(r.week) + ',' + y(r[props.metric.id])
  }).join(' ')
}
const key = (treatment, week) => treatment + ':' + week
const focusedPoint = computed(() => {
  const available = lines.value.flatMap(t => measured(t.records).map(r => ({ key: key(t.id, r.week), week: r.week })))
  return available.find(p => p.key === active.value)?.key ?? available.find(p => p.week === props.week)?.key ?? available[0]?.key
})
const label = (t, r) => t.label + ', semana ' + r.week + ', ' + dateLabel(r.date) + ', ' + props.metric.description + ': ' + format(r[props.metric.id]) + ' ' + props.metric.unit + ', n=' + r.sampleCounts[props.metric.id]
function reveal(t, r) { tooltip.value = { treatment: t, record: r } }
function choose(t, r) { reveal(t, r); active.value = key(t.id, r.week); emit('select-week', r.week) }
function selectPoint(value) {
  const [id, week] = value.split(':')
  const treatment = lines.value.find(line => line.id === id)
  const record = treatment?.records.find(record => record.week === Number(week))
  if (record) choose(treatment, record)
}
function keyboard(event, t, r) {
  if (event.key === 'Escape') { tooltip.value = null; return }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(t, r); return }
  const index = lines.value.findIndex(line => line.id === t.id)
  let treatment = t.id, week = r.week
  const available = measured(lines.value[index].records)
  if (event.key === 'ArrowLeft') week = available.filter(record => record.week < week).at(-1)?.week ?? week
  else if (event.key === 'ArrowRight') week = available.find(record => record.week > week)?.week ?? week
  else if (event.key === 'ArrowUp') treatment = lines.value[Math.max(0, index - 1)].id
  else if (event.key === 'ArrowDown') treatment = lines.value[Math.min(lines.value.length - 1, index + 1)].id
  else if (event.key === 'Home') week = available[0].week
  else if (event.key === 'End') week = available.at(-1).week
  else return
  event.preventDefault()
  svg.value.querySelector('[data-point="' + key(treatment, week) + '"]')?.focus()
}
function leave() {
  if (!svg.value?.contains(document.activeElement)) tooltip.value = null
}
watch(() => [props.metric.id, props.selected.join(',')], () => { tooltip.value = null; active.value = null })
</script>

<template>
  <div class="temporal-chart" @pointerleave="leave">
    <svg ref="svg" viewBox="0 0 430 198" role="group" :aria-label="metric.description + ' durante ' + weeks.length + ' semanas, en ' + metric.unit" aria-describedby="chart-help">
      <g v-for="i in 5" :key="i"><line x1="44" :y1="y(top * (i - 1) / 4)" x2="404" :y2="y(top * (i - 1) / 4)" stroke="#e4e9e2" stroke-dasharray="3 4" /><text x="35" :y="y(top * (i - 1) / 4) + 4" text-anchor="end">{{ format(top * (i - 1) / 4, top < 3 ? 1 : 0) }}</text></g>
      <line :x1="x(week)" y1="23" :x2="x(week)" y2="159" stroke="#a1ac9b" stroke-dasharray="4 4" />
      <g v-for="t in lines" :key="t.id">
        <path :d="points(t.records)" fill="none" :stroke="t.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <g v-for="r in measured(t.records)" :key="r.week" class="chart-point" role="button" :data-point="key(t.id, r.week)" :aria-label="label(t, r)"
          :tabindex="focusedPoint === key(t.id, r.week) ? 0 : -1"
          :aria-describedby="tooltip?.treatment.id === t.id && tooltip?.record.week === r.week ? 'chart-point-tooltip' : undefined"
          @pointerenter="reveal(t, r)" @focus="active = key(t.id, r.week); reveal(t, r)" @blur="tooltip = null" @click="choose(t, r)" @keydown="keyboard($event, t, r)">
          <circle :cx="x(r.week)" :cy="y(r[metric.id])" r="9" fill="transparent" />
          <circle class="point-mark" :cx="x(r.week)" :cy="y(r[metric.id])" :r="r.week === week ? 4.5 : 2.5" :fill="t.color" stroke="white" stroke-width="1.5" />
        </g>
      </g>
      <text v-for="w in weeks" :key="w.week" :x="x(w.week)" y="178" text-anchor="middle">{{ w.week }}</text><text x="225" y="195" text-anchor="middle">Semana de observación</text>
    </svg>
    <div v-if="tooltip" id="chart-point-tooltip" class="chart-tooltip" role="tooltip"><strong>{{ tooltip.treatment.label }} · Semana {{ tooltip.record.week }}</strong><span>{{ dateLabel(tooltip.record.date) }}</span><span>{{ metric.description }}: <b>{{ format(tooltip.record[metric.id]) }} {{ metric.unit }}</b> · n={{ tooltip.record.sampleCounts[metric.id] }}</span></div>
    <p id="chart-help" class="sr-only">Pasa el cursor, toca un punto o usa Tab y las flechas para consultar los valores. Enter o espacio seleccionan su semana y pausan la reproducción. Escape cierra la ficha.</p>
    <p v-if="!selected.length" class="chart-empty">Sin tratamientos seleccionados</p>
    <p v-else-if="!hasMeasurements" class="chart-empty">Sin mediciones disponibles para esta variable</p>
    <div class="chart-footer">
    <div class="chart-legend"><span v-for="t in lines" :key="t.id"><i :style="{ background: t.color }"></i>{{ t.short }}</span></div>
    <details v-if="hasMeasurements" class="chart-access"><summary>Consultar punto</summary><label class="sr-only" for="chart-point-select">Punto del gráfico</label><select id="chart-point-select" :value="active ?? ''" @change="selectPoint($event.target.value)"><option value="" disabled>Tratamiento y semana…</option><optgroup v-for="t in lines" :key="t.id" :label="t.label"><option v-for="r in measured(t.records)" :key="r.week" :value="key(t.id, r.week)">{{ label(t, r) }}</option></optgroup></select></details>
    </div>
  </div>
</template>
