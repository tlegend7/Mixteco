<script setup>
import { computed } from 'vue'
import { treatments, format } from '../modules/experiment'
const props = defineProps({ records: Array, weeks: Array, selected: Array, week: Number, metric: Object })
defineEmits(['select-week'])
const lines = computed(() => treatments.filter(t => props.selected.includes(t.id)).map(t => ({
  ...t, records: props.records.filter(r => r.treatment === t.id).sort((a, b) => a.week - b.week),
})))
const top = computed(() => {
  const max = Math.max(0, ...lines.value.flatMap(t => t.records.map(r => r[props.metric.id])))
  const step = max <= 2 ? 0.5 : max <= 6 ? 2 : max <= 20 ? 5 : 10
  return Math.max(step * 4, Math.ceil(max / (step * 4)) * step * 4)
})
const x = w => 44 + (w - 1) / 9 * 360
const y = v => 159 - v / top.value * 131
const points = records => records.map(r => x(r.week) + ',' + y(r[props.metric.id])).join(' ')
</script>

<template>
  <div class="temporal-chart">
    <svg viewBox="0 0 430 198" role="img" :aria-label="metric.description + ' durante diez semanas, en ' + metric.unit">
      <g v-for="i in 5" :key="i"><line x1="44" :y1="y(top * (i - 1) / 4)" x2="404" :y2="y(top * (i - 1) / 4)" stroke="#e4e9e2" stroke-dasharray="3 4" /><text x="35" :y="y(top * (i - 1) / 4) + 4" text-anchor="end">{{ format(top * (i - 1) / 4, top < 3 ? 1 : 0) }}</text></g>
      <line :x1="x(week)" y1="23" :x2="x(week)" y2="159" stroke="#a1ac9b" stroke-dasharray="4 4" />
      <g v-for="t in lines" :key="t.id">
        <polyline :points="points(t.records)" fill="none" :stroke="t.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle v-for="r in t.records" :key="r.week" :cx="x(r.week)" :cy="y(r[metric.id])" :r="r.week === week ? 4.5 : 2.5" :fill="t.color" stroke="white" stroke-width="1.5"><title>{{ t.label }} · Semana {{ r.week }}: {{ format(r[metric.id]) }} {{ metric.unit }}</title></circle>
      </g>
      <text v-for="w in weeks" :key="w.week" :x="x(w.week)" y="178" text-anchor="middle">{{ w.week }}</text><text x="225" y="195" text-anchor="middle">Semana de observación</text>
    </svg>
    <p v-if="!selected.length" class="chart-empty">Sin tratamientos seleccionados</p>
    <div class="chart-legend"><span v-for="t in lines" :key="t.id"><i :style="{ background: t.color }"></i>{{ t.short }}</span></div>
  </div>
</template>
