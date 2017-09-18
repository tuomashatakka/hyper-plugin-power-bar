const { resolve } = require('path')
const { readFileSync } = require('fs')

const suffix    = [ 'seconds', 'minutes', 'hours', 'days', 'weeks', '', '', '' ]
const factor    = [ 60, 60, 24, 7, 1, 1, 1 ]
const states    = {
  95: 'full',
  40: 'charged',
  15: 'low-power',
  0:  'critical',
}

const container = document.createElement('aside')
const progress  = document.createElement('progress')
const label     = document.createElement('label')
container.appendChild(label)
container.appendChild(progress)

async function getBatteryLevel () {
  let { level } = await navigator.getBattery()
  return 100 * level
}

async function getBatteryChargingLabel () {
  let { charging } = await navigator.getBattery()
  return charging ? ' until full' : ' until empty'
}

async function getBatteryTime () {
  let { charging, chargingTime, dischargingTime } = await navigator.getBattery()
  let time = (charging ? chargingTime : dischargingTime)
  let n = 0
  while (time > factor[n]) {
    time = time / factor[n]
    n++
  }
  return time.toFixed(1) + ' ' + suffix[n]
}

async function onBatteryChange (callback) {
  let battery = await navigator.getBattery()
  battery.addEventListener('dischargingtimechange', callback)
  battery.addEventListener('levelchange', callback)
  return () => {
    battery.removeEventListener('dischargingtimechange', callback)
    battery.removeEventListener('levelchange', callback)
  }
}

async function drawBatteryLevel (e) {
  if (e)
    console.info("Battery change event", e)

  let state
  let level           = await getBatteryLevel()
  let time            = getBatteryTime()
  let timeLabel       = getBatteryChargingLabel()
  let timeContent     = '<time>' + await time + await timeLabel + '</time>'

  for (let lvl in states) {
    if (parseInt(level) >= lvl)
      state = states[lvl]
  }

  progress.max    = parseInt(100)
  progress.value  = parseFloat(level)
  label.innerHTML = level.toPrecision(3) + '%' + timeContent

  label.setAttribute('class', 'battery-level')
  progress.setAttribute('class', 'battery-bar ' + state)
  document.body.appendChild(container)
}

function applyCSS (filename, variables={}) {
  const css = document.createElement('style')
  const outputVar = name => '--' + name + ': ' + variables[name] + ';\n'
  let vars = Object.keys(variables).reduce((stream, name) => stream + outputVar(name), '')
  container.querySelector('style[name="' + filename + '"]')
  css.setAttribute('name', filename)
  css.innerHTML = readFileSync(resolve(__dirname, filename), 'utf8') + `
    ${readFileSync(resolve(__dirname, filename), 'utf8')}
    :root {${vars}}`
  container.appendChild(css)
}
let vars = {
  height: '4px'
}

drawBatteryLevel()
applyCSS('style.css', vars)
onBatteryChange(drawBatteryLevel)
