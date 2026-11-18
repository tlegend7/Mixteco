import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export function useViewerFullscreen(viewer) {
  const expanded = ref(false)
  const notice = ref('')
  let previousFocus, previousOverflow
  function changed() { expanded.value = document.fullscreenElement === viewer.value }
  async function exit() {
    if (document.fullscreenElement === viewer.value) {
      try { await document.exitFullscreen() }
      catch { expanded.value = document.fullscreenElement === viewer.value; notice.value = 'No se pudo salir de pantalla completa. Usa Escape o vuelve a pulsar Salir.' }
    } else expanded.value = false
  }
  async function toggle() {
    if (expanded.value) return exit()
    previousFocus = document.activeElement
    notice.value = ''
    if (viewer.value?.requestFullscreen && document.fullscreenEnabled) {
      try { await viewer.value.requestFullscreen(); return }
      catch { notice.value = 'El navegador no permitió la pantalla completa; se amplió el visor dentro de la ventana.' }
    } else notice.value = 'Visor ampliado dentro de la ventana; pantalla completa no disponible en este navegador.'
    expanded.value = true
  }
  function keyboard(event) {
    if (!expanded.value) return
    if (event.key === 'Escape') { event.preventDefault(); exit(); return }
    if (event.key !== 'Tab') return
    const items = [...viewer.value.querySelectorAll('button, input, select, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length)
    const first = items[0], last = items.at(-1)
    if (event.shiftKey && (document.activeElement === first || !viewer.value.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && (document.activeElement === last || !viewer.value.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
  }
  watch(expanded, value => {
    if (value) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      viewer.value?.querySelector('[data-fullscreen-toggle]')?.focus()
    } else {
      document.body.style.overflow = previousOverflow ?? ''
      notice.value = ''
      previousFocus?.focus({ preventScroll: true })
    }
  }, { flush: 'post' })
  onMounted(() => {
    document.addEventListener('fullscreenchange', changed)
    document.addEventListener('keydown', keyboard)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', changed)
    document.removeEventListener('keydown', keyboard)
    if (expanded.value) document.body.style.overflow = previousOverflow ?? ''
    if (document.fullscreenElement === viewer.value) document.exitFullscreen().catch(() => {})
  })
  return { expanded, notice, toggle }
}
