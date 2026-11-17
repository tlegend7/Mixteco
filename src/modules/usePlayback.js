import { ref, onScopeDispose } from 'vue'

export function usePlayback(week, weeks) {
  const playing = ref(false)
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let timer
  function pause() {
    clearInterval(timer)
    timer = undefined
    playing.value = false
  }
  function selectWeek(value) {
    pause()
    if (weeks.value.some(item => item.week === Number(value))) week.value = Number(value)
  }
  function restart() {
    pause()
    if (weeks.value.length) week.value = weeks.value[0].week
  }
  function toggle() {
    if (playing.value) return pause()
    if (!weeks.value.length) return
    if (week.value === weeks.value.at(-1).week) restart()
    playing.value = true
    // Discrete observed weeks only; reduced motion uses a slower reading interval.
    timer = setInterval(() => {
      const next = weeks.value.findIndex(item => item.week === week.value) + 1
      if (next >= weeks.value.length) return pause()
      week.value = weeks.value[next].week
      if (next === weeks.value.length - 1) pause()
    }, motion.matches ? 3200 : 2000)
  }
  motion.addEventListener('change', pause)
  onScopeDispose(() => { pause(); motion.removeEventListener('change', pause) })
  return { playing, pause, selectWeek, restart, toggle }
}
