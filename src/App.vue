<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadExperiment } from './services/data'
import { treatments, metrics, format, formatSigned, dateLabel, recordsAt, differenceFromControl, weeklyMaximum } from './modules/experiment'
import { usePlayback } from './modules/usePlayback'
import TemporalChart from './components/TemporalChart.vue'
import FieldScene from './components/FieldScene.vue'

const experiment = ref(null)
const error = ref('')
const loading = ref(true)
const selected = ref(treatments.map(t => t.id))
const week = ref(10)
const metricId = ref('height')
const view = ref('frontal')
const cameraRequest = ref(0)
const focused = ref('azul')
const inspection = ref(false)
const sceneRef = ref(null)
const weeks = computed(() => experiment.value?.biometry.weeks ?? [])
const { playing, selectWeek, restart, toggle: togglePlayback } = usePlayback(week, weeks)
const metric = computed(() => metrics.find(m => m.id === metricId.value))
const currentWeek = computed(() => experiment.value.biometry.weeks.find(w => w.week === week.value))
const current = computed(() => recordsAt(experiment.value.biometry.records, week.value, selected.value))
const allCurrent = computed(() => recordsAt(experiment.value.biometry.records, week.value, treatments.map(t => t.id)))
const focusRecord = computed(() => allCurrent.value.find(r => r.treatment === focused.value))
const focusTreatment = computed(() => treatments.find(t => t.id === focused.value))
const maximum = computed(() => Math.max(1, ...current.value.map(r => r[metricId.value])))
const evaluated = computed(() => current.value.reduce((sum, r) => sum + r.plants, 0))
const control = computed(() => allCurrent.value.find(record => record.treatment === 'control'))
const differences = computed(() => current.value.filter(record => record.treatment !== 'control').map(record => ({
  ...treatments.find(t => t.id === record.treatment),
  ...differenceFromControl(record, control.value, metricId.value),
})))
const weeklySummary = computed(() => {
  const maximum = weeklyMaximum(current.value)
  if (!maximum) return ''
  const names = maximum.treatments.map(id => treatments.find(t => t.id === id).short).join(' y ')
  return (maximum.treatments.length > 1 ? 'Mayor altura compartida: ' : 'Mayor altura: ') + names + ', ' + format(maximum.value) + ' cm.'
})

async function load() {
  loading.value = true
  error.value = ''
  try { experiment.value = await loadExperiment() }
  catch (e) { error.value = e.message || 'No se pudieron leer los datos.' }
  finally { loading.value = false }
}
function toggle(id) {
  selected.value = selected.value.includes(id) ? selected.value.filter(x => x !== id) : [...selected.value, id]
  if (selected.value.length && !selected.value.includes(focused.value)) {
    focused.value = selected.value[0]
    if (inspection.value) cameraRequest.value++
  }
}
function inspect(id) {
  focused.value = id
  if (!selected.value.includes(id)) selected.value = [...selected.value, id]
  inspection.value = true
  if (view.value === 'libre') view.value = 'frontal'
  cameraRequest.value++
}
function showGeneral() {
  inspection.value = false
  setView('frontal')
}
function setView(id) {
  view.value = id
  cameraRequest.value++
}
onMounted(load)
</script>

<template>
  <div class="app-shell">
    <main id="main">
      <header class="intro">
        <h1>Crecimiento del chile jalapeño bajo sarán</h1>
        <p>Explora su desarrollo y compara los registros bajo distintas condiciones de sombra.</p>
      </header>

      <div v-if="loading" class="state" role="status">Cargando registros experimentales…</div>
      <div v-else-if="error" class="state error" role="alert"><h2>No se pudieron cargar los registros</h2><p>{{ error }}</p><button class="primary" @click="load">Reintentar</button></div>
      <template v-else>
        <section class="study-strip" aria-label="Alcance de los datos">
          <span class="study-chip">4 tratamientos</span>
          <span class="study-chip">10 semanas</span>
          <span class="study-chip">40 observaciones</span>
          <span class="study-chip">20 ago. — 22 oct. 2026</span>
        </section>

        <div class="dashboard">
          <section class="data-panel panel" aria-labelledby="data-title">
            <div class="section-heading"><div><p class="eyebrow">01 / DATOS DEL CULTIVO</p><h2 id="data-title">Observa y compara</h2></div><span class="small-tag">Promedios</span></div>
            <aside class="experiment-info" aria-label="Información del experimento">
              <div class="experiment-meta"><a href="#main" aria-label="Mixteco, ir al contenido">Mixteco <span>· Observatorio fenológico</span></a><strong>UTP × UVG</strong></div>
              <p><i>Capsicum annuum L.</i> · <strong>Variedad Mixteco</strong></p>
              <p class="experiment-location"><span>UVG Campus Sur · Guatemala</span><small>Investigación colaborativa</small></p>
            </aside>
            <fieldset class="treatment-filters"><legend>Tratamientos <span>Selecciona uno o varios</span></legend>
              <label v-for="t in treatments" :key="t.id" :class="['treatment-chip', { active: selected.includes(t.id) }]" :style="{ '--treatment': t.color }">
                <input type="checkbox" :checked="selected.includes(t.id)" @change="toggle(t.id)" /><span class="treatment-dot"></span>{{ t.short }}
              </label>
            </fieldset>
            <div class="metric-heading"><label for="metric">Variable biométrica</label><select id="metric" v-model="metricId"><option v-for="m in metrics" :value="m.id" :key="m.id">{{ m.label }}</option></select></div>
            <div class="comparison-heading"><h3>{{ metric.description }}</h3><span>Semana {{ week }} · {{ metric.unit }}</span></div>
            <div v-if="!selected.length" class="empty" role="status">Selecciona un tratamiento para comparar sus registros.</div>
            <div v-else class="comparison" aria-label="Comparación de la semana seleccionada">
              <button v-for="t in treatments.filter(t => selected.includes(t.id))" :key="t.id" class="bar-row" :aria-pressed="focused === t.id" @click="inspect(t.id)">
                <span>{{ t.short }}</span><span class="bar-track"><span :style="{ width: (current.find(r => r.treatment === t.id)[metricId] / maximum * 100) + '%', background: t.color }"></span></span><strong>{{ format(current.find(r => r.treatment === t.id)[metricId]) }}</strong>
              </button>
            </div>
            <p v-if="weeklySummary" class="weekly-summary" :title="'Entre los tratamientos seleccionados, semana ' + week">{{ weeklySummary }} <span>Entre seleccionados.</span></p>
            <details class="control-comparison">
              <summary>Comparar con control <span>{{ format(control[metricId]) }} {{ metric.unit }}</span></summary>
              <table v-if="differences.length"><caption class="sr-only">Diferencias respecto al grupo sin sarán en semana {{ week }}</caption><thead><tr><th>Tratamiento</th><th>Δ {{ metric.unit }}</th><th>Δ %</th></tr></thead><tbody><tr v-for="difference in differences" :key="difference.id"><th scope="row">{{ difference.short }}</th><td>{{ formatSigned(difference.absolute) }}</td><td>{{ difference.percent === null ? 'No definido' : formatSigned(difference.percent) + ' %' }}</td></tr></tbody></table>
              <p v-else>Selecciona un tratamiento distinto del control para comparar.</p>
              <p>Tratamiento − control, usando los registros originales aunque el control esté oculto. Porcentaje no definido si el control vale cero. Comparación descriptiva, sin inferencia de causalidad ni significancia estadística.</p>
            </details>
            <div class="chart-heading"><h3>Evolución temporal</h3><span>{{ metric.unit }}</span></div>
            <TemporalChart :records="experiment.biometry.records" :weeks="weeks" :selected="selected" :week="week" :metric="metric" @select-week="selectWeek" />
            <div class="sample-note"><span class="sample-symbol">n</span><p><strong>{{ evaluated }} plantas evaluadas</strong> en los tratamientos seleccionados esta semana.<br>Los valores representan promedios por tratamiento.</p></div>
          </section>

          <section class="scene-panel panel" aria-labelledby="scene-title">
            <div class="section-heading"><div><p class="eyebrow">02 / EXPLORACIÓN ESPACIAL</p><h2 id="scene-title">{{ inspection ? 'Explorar · ' + focusTreatment.label : 'El experimento, en perspectiva' }}</h2></div><button v-if="inspection" class="general-view" aria-label="Volver a vista general" @click="showGeneral">← Vista general</button><span v-else class="small-tag green">Vista general · Ilustrativa</span></div>
            <div class="scene-toolbar"><div class="view-tabs" role="group" aria-label="Perspectiva de cámara">
              <button v-for="v in [{ id: 'frontal', label: 'Frontal' }, { id: 'lateral', label: 'Lateral' }, { id: 'superior', label: 'Superior' }]" :key="v.id" :class="{ active: view === v.id }" :aria-pressed="view === v.id" @click="setView(v.id)">{{ v.label }}</button>
            </div><span class="camera-status" aria-live="polite">{{ view === 'superior' ? 'Superior · cubiertas ocultas' : view === 'libre' ? 'Exploración libre' : 'Cubiertas visibles' }}</span>
              <div class="camera-actions" role="group" aria-label="Acercamiento y encuadre"><button @click="sceneRef?.zoomBy(1.2)" aria-label="Acercar escenario" title="Acercar">+</button><button @click="sceneRef?.zoomBy(1 / 1.2)" aria-label="Alejar escenario" title="Alejar">−</button><button class="reset-camera" @click="setView('frontal')" aria-label="Restablecer encuadre">↺ <span>Restablecer</span></button></div>
            </div>
            <FieldScene ref="sceneRef" :records="allCurrent" :selected="selected" :focused="focused" :inspection="inspection" :view="view" :camera-request="cameraRequest" @inspect="inspect" @free-view="view = 'libre'" @reset="setView('frontal')" />
            <div class="plot-selectors" aria-label="Examinar tratamiento">
              <button v-for="t in treatments" :key="t.id" :aria-pressed="focused === t.id" :class="{ focused: focused === t.id }" @click="inspect(t.id)"><span class="treatment-dot" :style="{ background: t.color }"></span>{{ t.label }}</button>
            </div>
            <div class="plant-detail" v-if="selected.includes(focused)" :style="{ '--treatment': focusTreatment.color }">
              <div class="detail-title"><span class="treatment-dot"></span><h3>{{ focusTreatment.label }}</h3><span>{{ focusRecord.plants }} plantas evaluadas</span></div>
              <dl class="detail-metrics"><div v-for="m in metrics" :key="m.id"><dt>{{ m.label }}</dt><dd>{{ format(focusRecord[m.id]) }}<small>{{ m.unit }}</small></dd></div></dl>
            </div>
            <div v-else class="empty">Selecciona una parcela para consultar su ficha.</div>
            <p class="scene-caption">Distribución esquemática. Las plantas representan promedios; su número y posición son ilustrativos. Sol y sombras sin modelado físico.</p>
            <section class="timeline" aria-labelledby="timeline-title">
              <div class="timeline-heading"><div class="playback-controls"><h2 id="timeline-title" class="sr-only">Evolución temporal</h2><button :aria-label="playing ? 'Pausar evolución' : 'Reproducir evolución'" :aria-pressed="playing" @click="togglePlayback">{{ playing ? 'Ⅱ Pausar' : '▷ Reproducir evolución' }}</button><button aria-label="Reiniciar evolución" title="Volver a la primera semana y pausar" @click="restart">↺</button></div><div class="selected-date" aria-live="polite"><strong>Semana {{ week }}</strong><span>{{ dateLabel(currentWeek.date) }}</span></div></div>
              <div class="week-buttons" role="group" aria-label="Seleccionar semana de observación"><button v-for="w in weeks" :key="w.week" :aria-pressed="week === w.week" :class="{ active: week === w.week }" @click="selectWeek(w.week)"><span class="week-dot"></span><strong>Sem. {{ w.week }}</strong><small>{{ dateLabel(w.date, true) }}</small></button></div>
              <label class="sr-only" for="week-range">Semana seleccionada</label><input id="week-range" class="week-range" type="range" min="1" max="10" step="1" :value="week" @input="selectWeek($event.target.value)" :aria-valuetext="'Semana ' + week + ', ' + dateLabel(currentWeek.date)" />
            </section>
          </section>
        </div>

        <section class="support-grid">
          <details class="panel supporting">
            <summary><span><span class="eyebrow">CONTEXTO AMBIENTAL</span><strong>Temperatura y humedad</strong></span><span class="expand-sign" aria-hidden="true">+</span></summary>
            <p>Lecturas independientes · {{ experiment.environment.timeRange }}. <strong>Fecha no especificada en la fuente.</strong> No cambian con la semana seleccionada.</p>
            <div class="table-scroll"><table><caption class="sr-only">Lecturas ambientales del cuestionario de Guatemala</caption><thead><tr><th>Tratamiento</th><th>Temperatura</th><th>Humedad relativa</th></tr></thead><tbody><tr v-for="t in treatments.filter(t => selected.includes(t.id))" :key="t.id"><th scope="row">{{ t.label }}</th><td>{{ format(experiment.environment.records.find(r => r.treatment === t.id).temperature, 1) }} °C</td><td>{{ experiment.environment.records.find(r => r.treatment === t.id).humidity }} %</td></tr></tbody></table></div>
            <p v-if="!selected.length">Selecciona un tratamiento para consultar sus lecturas.</p>
          </details>
          <details class="panel supporting">
            <summary><span><span class="eyebrow">ACERCA DE LOS REGISTROS</span><strong>Fuentes y alcance científico</strong></span><span class="expand-sign" aria-hidden="true">+</span></summary>
            <p>Biometría: {{ experiment.biometry.source }}, hoja {{ experiment.biometry.sheet }}. Los ceros y las disminuciones semanales se conservan. En el control se evaluaron 6 plantas en la semana 9 y 5 en la 10.</p>
            <p>Ambiente y montaje: respuestas del equipo de Guatemala. El montaje descrito tiene 5 camellones y 300 plantas iniciales; no se conoce la distribución exacta de cada sarán ni su porcentaje de sombra.</p>
            <p>La altura del modelo es proporcional al promedio medido. El grosor del tallo se amplifica y la cantidad visual de hojas, flores y frutos se simplifica para facilitar la observación. No se infieren valores individuales, radiación ni etapas fenológicas no documentadas.</p>
            <p><a :href="'data/biometria.json'" download>Descargar registros y procedencia (JSON) ↗</a></p>
          </details>
        </section>
        <details class="panel supporting raw-data"><summary><span><span class="eyebrow">REGISTROS DE LA SEMANA {{ week }}</span><strong>Consultar valores originales</strong></span><span class="expand-sign" aria-hidden="true">+</span></summary>
          <div class="table-scroll"><table><caption class="sr-only">Registros biométricos de la semana {{ week }}</caption><thead><tr><th>Tratamiento</th><th>n</th><th v-for="m in metrics" :key="m.id">{{ m.label }} ({{ m.unit }})</th><th>Fila Excel</th></tr></thead><tbody><tr v-for="r in current" :key="r.treatment"><th scope="row">{{ treatments.find(t => t.id === r.treatment).label }}</th><td>{{ r.plants }}</td><td v-for="m in metrics" :key="m.id">{{ format(r[m.id]) }}</td><td>{{ r.sourceRow }}</td></tr></tbody></table></div>
        </details>
      </template>
    </main>
    <footer><span>Mixteco · Visualización y análisis fenológico</span><span>Universidad Tecnológica de Panamá × Universidad del Valle de Guatemala</span></footer>
  </div>
</template>
