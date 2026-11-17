// Playwright CLI: run-code --filename tests/browser-layout.js (local application).
async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const errors = [], sizes = []
  page.on('pageerror', error => errors.push(error.message))
  await page.reload()
  await page.getByRole('heading', { name: 'Observa y compara', exact: true }).waitFor()
  const rows = page.locator('.week-buttons button')
  const visibleWeek = () => page.locator('.week-buttons').evaluate(strip => {
    const selected = strip.querySelector('[aria-pressed="true"]').getBoundingClientRect()
    const bounds = strip.getBoundingClientRect()
    return selected.left >= bounds.left - 1 && selected.right <= bounds.left + strip.clientWidth + 1
  })
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[320,640]]) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(150)
    await page.evaluate(() => scrollTo(0,0))
    const geometry = await page.evaluate(() => {
      const rect = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { x:b.x, y:b.y, width:b.width, height:b.height, bottom:b.bottom } }
      const strip = document.querySelector('.week-buttons')
      return { intro:rect('.intro'), badges:rect('.study-strip'), data:rect('.data-panel'), scene:rect('.scene-panel'), field:rect('.field-wrap'), plots:rect('.plot-selectors'), detail:rect('.plant-detail'), caption:rect('.scene-caption'), timeline:rect('.timeline'),
        rows:new Set([...strip.children].map(button => button.offsetTop)).size,
        overflow:document.documentElement.scrollWidth > innerWidth,
        scrollable:strip.scrollWidth > strip.clientWidth,
        buttonWidth:strip.children[0].getBoundingClientRect().width,
        cardInPanel:document.querySelector('.experiment-info').closest('.data-panel') !== null }
    })
    check(!geometry.overflow, 'La página desborda a '+width)
    check(geometry.rows === 1, 'Las semanas ocupan varias filas a '+width)
    check(geometry.buttonWidth >= 46, 'Botones comprimidos a '+width)
    check(await rows.count() === 13 && await visibleWeek(), 'Semana seleccionada inaccesible a '+width)
    check(geometry.cardInPanel, 'Tarjeta experimental fuera del panel')
    check(geometry.badges.bottom <= (width > 900 ? 100 : 155), 'Header demasiado alto a '+width)
    check(geometry.field.bottom <= geometry.plots.y+1 && geometry.plots.bottom <= geometry.detail.y+1 && geometry.detail.bottom <= geometry.caption.y+1 && geometry.caption.bottom <= geometry.timeline.y+1, 'Elementos superpuestos a '+width)
    check(geometry.field.height >= (width > 900 ? 280 : width > 580 ? 340 : 280), 'Escenario demasiado bajo a '+width)
    if (width > 900) {
      const ratio = geometry.data.width/(geometry.data.width+geometry.scene.width)
      check(ratio >= .30 && ratio <= .35, 'Proporción del dashboard alterada a '+width)
      check(geometry.timeline.bottom <= height, 'Línea temporal fuera del escritorio a '+width)
    }
    if (width <= 580) check(geometry.scrollable, 'Falta scroll local en móvil')
    await page.getByRole('slider').focus()
    await page.keyboard.press('Home')
    check(await page.getByRole('slider').inputValue() === '1' && await visibleWeek(), 'Primera semana oculta a '+width)
    await page.keyboard.press('End')
    check(await page.getByRole('slider').inputValue() === '13' && await visibleWeek(), 'Última semana oculta a '+width)
    // A passive week change (as in playback) must not scroll the whole document.
    await page.evaluate(() => {
      scrollTo(0,0)
      const range = document.querySelector('#week-range')
      range.value = '12'
      range.dispatchEvent(new Event('input', { bubbles:true }))
    })
    check(await visibleWeek() && await page.evaluate(() => scrollY === 0), 'La selección mueve la página a '+width)
    await page.locator('.week-buttons').evaluate(strip => { strip.scrollLeft=0 })
    await rows.first().focus()
    await page.keyboard.press('Enter')
    check(await page.getByRole('slider').inputValue() === '1', 'Primera semana no responde por teclado')
    await rows.last().focus()
    await page.keyboard.press('Enter')
    check(await page.getByRole('slider').inputValue() === '13' && await visibleWeek(), 'Última semana no responde por teclado')
    await page.evaluate(() => scrollTo(0,0))
    await page.screenshot({ path:'output/playwright/layout-'+width+'x'+height+'.png', fullPage:true })
    sizes.push({ width, height, sceneHeight:geometry.field.height, timelineHeight:geometry.timeline.height, scrollable:geometry.scrollable })
  }
  await page.setViewportSize({ width:1440, height:900 })
  await page.reload()
  await page.getByRole('button', { name:'Reproducir evolución', exact:true }).waitFor()
  await page.getByRole('slider').focus()
  await page.keyboard.press('ArrowLeft')
  await page.getByRole('button', { name:'Reproducir evolución', exact:true }).click()
  await page.waitForTimeout(2150)
  check(await page.getByRole('slider').inputValue() === '13' && await visibleWeek(), 'Reproducción no mantiene visible la última semana')
  check(await page.getByRole('button', { name:'Reproducir evolución', exact:true }).isVisible(), 'No se detiene la reproducción')
  await page.getByRole('button', { name:'Reiniciar evolución' }).click()
  check(await page.getByRole('slider').inputValue() === '1' && await visibleWeek(), 'Reinicio no revela la primera semana')
  const mobileContext = await page.context().browser().newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })
  try {
    const mobile = await mobileContext.newPage()
    mobile.on('pageerror', error => errors.push(error.message))
    await mobile.goto(page.url())
    const strip = mobile.locator('.week-buttons')
    await strip.waitFor()
    await strip.scrollIntoViewIfNeeded()
    const before = await strip.evaluate(el => el.scrollLeft)
    const bounds = await strip.boundingBox()
    const client = await mobileContext.newCDPSession(mobile)
    await client.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:bounds.x+40, y:bounds.y+20, id:1 }] })
    await client.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:bounds.x+240, y:bounds.y+20, id:1 }] })
    await client.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] })
    await mobile.waitForTimeout(200)
    check(await strip.evaluate(el => el.scrollLeft) < before, 'El deslizamiento táctil no desplaza las semanas')
    check(await mobile.evaluate(() => scrollX === 0 && document.documentElement.scrollWidth <= innerWidth), 'El gesto desplaza toda la página')
    await strip.locator('button').first().tap()
    check(await mobile.getByRole('slider').inputValue() === '1', 'No selecciona la semana por tacto')
  } finally { await mobileContext.close() }
  check(errors.length === 0, errors.join('; '))
  return { result:'PASS', sizes, javascriptErrors:errors }
}
