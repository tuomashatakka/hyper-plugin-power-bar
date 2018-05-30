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

let vars = {
  height: '4px'
}

let container = null
let progress  = null
let label     = null
let estimate  = {
  last:      new Date(),
  history:   [],
  calculate: () => {
    let avg = estimate.history
      .reduce((result, current) => result + current, 0)
      / estimate.history.length
    let delta = new Date().getTime() - estimate.last
    return delta / avg
  },
  add: () => {
    estimate.history.push(new Date().getTime())
    estimate.last = new Date()
  }
}


function createElements () {
  let value = document.createElement('div')
  container = document.createElement('aside')
  progress  = document.createElement('div')
  label     = document.createElement('label')

  label.setAttribute('class', 'battery-level')
  progress.appendChild(value)
  container.appendChild(label)
  container.appendChild(progress)
  document.body.appendChild(container)
}


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

  let level       = await getBatteryLevel()
  let time        = getBatteryTime()
  let timeLabel   = getBatteryChargingLabel()
  let timeContent = '<time>' + await time + await timeLabel + '</time>'

  updateLabel(level, time, timeLabel)
  updateProgress(level)
  updateProgressClass(level)
}


const updateProgressClass = (level) =>
  progress.setAttribute('class', 'battery-bar progress ' + getState(level))


const getState = (level) => {
  let state
  for (let lvl in states)
    if (parseInt(level) >= lvl)
      state = states[lvl]
  return state
}


const updateLabel = async (level, time, timeLabel) => label.innerHTML = `
  ${level.toPrecision(3)}%
  <time>
    ${await time}
    ${await timeLabel}
  </time>`


const updateProgress = (level) => {
  progress.max    = parseInt(100)
  progress.value  = parseFloat(level)
  progress.firstElementChild.setAttribute('style', `--value: ${level}%`)
}


function applyCSS (filename, variables={}) {

  const css =
    container.querySelector('style[name="' + filename + '"]') ||
    container.appendChild(document.createElement('style'))

  const outputVar = name =>
    `\t--${name}: ${variables[name]};\n`

  const append = (stream, name) =>
    stream + outputVar(name)

  const vars = Object
    .keys(variables)
    .reduce(append, '')

  css.setAttribute('name', filename)
  css.innerHTML = [
    readFileSync(resolve(__dirname, filename), 'utf8'),
    `:root {\n${vars}}`
  ].join('\n')
}


module.exports.decorateHyper = function (Container) {

  createElements()
  drawBatteryLevel()
  onBatteryChange(drawBatteryLevel)

  applyCSS('style.css', vars)

  console.log("Container:", Container)
  return Container
}
