const { resolve } = require('path')
const { readFileSync } = require('fs')


const elements = {
  container:  null,
  progress:   null,
  label:      null,
}

const suffix    = [ 'seconds', 'minutes', 'hours', 'days', 'weeks', '', '', '' ]
const factor    = [ 60, 60, 24, 7, 1, 1, 1 ]
const states    = {
  95: 'full',
  40: 'charged',
  15: 'low-power',
  0:  'critical',
}

let vars = {
  height: '2px'
}


async function getBatteryLevel () {
  const { level } = await navigator.getBattery()
  return 100 * level
}


async function getBatteryChargingLabel () {
  const { charging } = await navigator.getBattery()
  return charging ? ' until full' : ' until empty'
}


async function getBatteryTime () {
  const { charging, chargingTime, dischargingTime } = await navigator.getBattery()
  let time = (charging ? chargingTime : dischargingTime)
  let n = 0
  while (time > factor[n])
    time = time / factor[n++]
  return time.toFixed(1) + ' ' + suffix[n]
}


async function observeBatteryChange (callback) {
  const battery = await navigator.getBattery()
  battery.addEventListener('dischargingtimechange', callback)
  battery.addEventListener('levelchange', callback)
  callback()
  return () => {
    battery.removeEventListener('dischargingtimechange', callback)
    battery.removeEventListener('levelchange', callback)
  }
}


async function drawBatteryLevel (event) {

  if (event)
    console.info("Battery change event", event)

  const conf = config.getConfig()



  let state
  const promises = [
    getBatteryLevel(),
    getBatteryTime(),
    getBatteryChargingLabel(),
  ]

  const [ level, time, timeLabel ] = await Promise.all(promises)

  for (let lvl in states)
    if (parseInt(level) >= lvl)
      state = states[lvl]

  elements.progress.max     = parseInt(100)
  elements.progress.value   = parseFloat(level)
  elements.label.innerHTML  = `<span class='level'>${level.toPrecision(3)}%</span><time>${time}${timeLabel}</time>`

  elements.label.classList.add('battery-level', 'updated')
  elements.progress.classList.add('battery-bar', state)
  elements.container.classList.add('power-bar-container')
  elements.container.classList.toggle('hidden', conf.showBatteryBar === false)
  setTimeout(() => elements.label.classList.remove('updated'), 50)
  document.body.appendChild(elements.container)
}


function applyCSS (filename, variables={}) {
  const css       = document.createElement('style')
  const outputVar = name => '--' + name + ': ' + variables[name] + ';\n'
  const vars      = Object.keys(variables).reduce((stream, name) => stream + outputVar(name), '')

  elements.container.querySelector('style[name="' + filename + '"]')
  css.setAttribute('name', filename)
  css.innerHTML = readFileSync(resolve(__dirname, filename), 'utf8') + `
    ${readFileSync(resolve(__dirname, filename), 'utf8')}
    :root {${vars}}`
  elements.container.appendChild(css)
}


function decorateHyper (host) {
  elements.container = document.createElement('aside')
  elements.progress  = document.createElement('progress')
  elements.label     = document.createElement('label')
  elements.container.appendChild(elements.label)
  elements.container.appendChild(elements.progress)

  applyCSS('style.css', vars)
  observeBatteryChange(drawBatteryLevel)

  console.log("config now:", config.getConfig())
  return host
}

function decorateConfig (config) {
  console.log(config)
  return { ...config }
}


module.exports = {
  decorateHyper,
  decorateConfig,
}
