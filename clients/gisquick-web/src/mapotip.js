import mapKeys from 'lodash/mapKeys'
import _DtmAttributes from './dtm_attrs.json'

const DtmAttributes = mapKeys(_DtmAttributes, (_, k) => k.toLowerCase())

const DateConfig = { type: 'datetime', config: { display_format: 'dd.MM.yyyy' } }

const Widgets = {
  datumzmeny: DateConfig,
  datumvkladu: DateConfig
}

export function dtmFeatureFields (feature) {
  // return feature.getKeys().filter(n => n !== 'geometry').map(name => ({ name, type: 'text', alias: DtmAttributes[name.toLowerCase()] }))
  return feature.getKeys().filter(n => n !== 'geometry')
    .map(name => name.toLowerCase())
    .map(name => ({ name, type: 'text', alias: DtmAttributes[name], ...Widgets[name] }))
}

export function isDtmField (name) {
  return !!DtmAttributes[name]
}
