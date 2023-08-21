<template>
  <div class="search-tool dark f-row-ac" :class="{expanded}" key="search">
    <v-btn class="toggle icon flat" @click="toggle">
      <v-icon name="magnifier"/>
    </v-btn>
    <div v-if="expanded" class="toolbar f-row-ac">
      <v-autocomplete
        ref="autocomplete"
        :placeholder="source === 'addresses' ? tr.SearchAddress : tr.SearchParcel"
        class="flat"
        :loading="loading"
        :min-chars="1"
        :items="suggestions"
        highlight-fields="text"
        @input="onInput"
        :value="result"
        @text:update="onTextChangeDebounced"
      >
        <template v-slot:item="{ html }">
          <div class="item f-row f-grow">
            <div class="f-grow">
              <span class="address" v-html="html.text"/>
            </div>
          </div>
        </template>
      </v-autocomplete>
      <v-select
        v-if="parcelsLayer"
        class="flat"
        :items="sources"
        v-model="source"
        @input="clear"
      />
      <features-viewer :features="features"/>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import debounce from 'lodash/debounce'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import Feature from 'ol/Feature'

import VAutocomplete from '@/ui/Autocomplete.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import { formatLayerQuery, getFeatureQuery } from '@/map/featureinfo'

const Token = 'AAPK837f27799c4b424b9da1641edb380ff5x9tUsMKtBKTpXqO9geCQtn5paAL3YCPDrfKEPFkoNQ5HXMtW4_GJmJgyo_PWqNDF'

function stripSuffix (text, suffix) {
  return text.endsWith(suffix) ? text.substring(0, text.length - suffix.length) : text
}

export default {
  name: 'search',
  components: { VAutocomplete, FeaturesViewer },
  data () {
    return {
      suggestions: [],
      feature: null,
      source: 'addresses',
      // source: 'parcels',
      expanded: false,
      loading: false,
      result: null
    }
  },
  computed: {
    ...mapState(['project']),
    parcelsLayer () {
      return this.project.overlays.list.find(l => l.name === 'par')
    },
    sources () {
      return [{
        text: this.$gettext('Addresses'),
        value: 'addresses'
      }, {
        text: this.$gettext('Parcels'),
        value: 'parcels'
      }]
    },
    projectExtent () {
      const [ xmin, ymin, xmax, ymax ] = this.project.config.project_extent
      const wkid = this.project.config.projection.split(':')?.[1]
      return JSON.stringify({
        xmin, ymin, xmax, ymax,
        // spatialReference: { wkid }
        spatialReference: { wkid: 102067 }
        
      })
    },
    features () {
      return this.feature ? [this.feature] : []
    },
    countryCode () {
      const domainLang = location.hostname.split('.').pop()
      return domainLang?.toUpperCase() ?? 'CZ'
    },
    tr () {
      return {
        SearchAddress: this.$gettext('Search address'),
        SearchParcel: this.$gettext('Search parcel')
      }
    }
  },
  methods: {
    clear () {
      this.feature = null
      this.result = null
      this.suggestions = []
      this.$refs.autocomplete?.clear()
    },
    toggle () {
      this.expanded = !this.expanded
      if (this.expanded) {
        this.$nextTick(() => {
          this.$refs.autocomplete.focus()
        })
      } else {
        this.clear()
      }
    },
    viewExtent () {
      const [ xmin, ymin, xmax, ymax ] = this.$map.getView().calculateExtent()
      return JSON.stringify({ xmin, ymin, xmax, ymax, spatialReference: { wkid: 102067 } })
    },
    viewLocation () {
      const [x, y] = this.$map.getView().getCenter()
      return JSON.stringify({
        x: Math.round(x),
        y: Math.round(y),
        spatialReference: { wkid: 102067 }
      })
    },
    async suggest (text) {
      const params = {
        token: Token,
        text,
        location: this.viewLocation(),
        countryCode: this.countryCode,
        searchExtent: this.projectExtent,
        maxSuggestions: 8,
        f: 'json',
        distance: 10000
      }
      const url = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest'
      const { data } = await this.$http.get(url, { params })
      data.suggestions.forEach(i => {
        i.text = stripSuffix(i.text, ', CZE')
      })
      return data.suggestions
    },
    async findAddressCandidates (text, params = {}) {
      params = {
        token: Token,
        text,
        SingleLine: text,
        searchExtent: this.projectExtent,
        location: this.viewLocation(),
        outSR: 102067,
        f: 'json',
        ...params
      }
      const url = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
      const { data } = await this.$http.get(url, { params })
      return data.candidates
    },
    async findParcels (text) {
      const filters1 = [{
        attribute: 'text',
        operator: '=',
        value: text
      }]
      const filters2 = [{
        attribute: 'text',
        operator: 'LIKE',
        value: `${text}%`
      }, {
        attribute: 'text',
        operator: '!=',
        value: text
      }]
      const query = getFeatureQuery(
        formatLayerQuery(this.parcelsLayer, null, filters1),
        formatLayerQuery(this.parcelsLayer, null, filters2)
      )
      const params = {
        'VERSION': '1.1.0',
        'SERVICE': 'WFS',
        'REQUEST': 'GetFeature',
        'OUTPUTFORMAT': 'GeoJSON',
        'MAXFEATURES': 8
      }
      const headers = { 'Content-Type': 'text/xml' }
      const { data } = await this.$http.post(this.project.config.ows_url, query, { params, headers })
      return data.features.map(f => {
        const { text, katuze, cislovani_parcel } = f.properties
        return {
          text: cislovani_parcel === 'Stavební parcela' ? `${katuze} st. ${text}` : `${katuze} ${text}`,
          properties: f.properties,
          geometry: f.geometry
        }
      })
    },
    async onInput (item) {
      if (this.result === item) {
        if (this.feature) {
          this.$map.ext.zoomToFeature(this.feature)
        }
        return
      }
      let feature
      if (item) {
        if (this.source === 'addresses') {
          const params = {
            magicKey: item.magicKey,
          }
          const results = await this.findAddressCandidates(item.text, params)
          const result = results[0]
          if (result) {
            const { x, y } = result.location
            feature = new Feature({ geometry: new Point([x, y]) })
            this.$map.ext.zoomToFeature(feature)
          }
        } else {
          const geometry = new Polygon(item.geometry.coordinates).transform('EPSG:4326', this.$map.getView().getProjection())
          feature = new Feature({ geometry })
          this.$map.ext.zoomToFeature(feature)
        }
      }
      this.result = item
      this.feature = feature ? Object.freeze(feature) : null
    },
    onTextChangeDebounced: debounce(async function (text) {
      this.onTextChange(text)
    }, 400),
    async onTextChange (text) {
      if (text.length > 0) {
        this.loading = true
        if (this.source === 'addresses') {
          this.suggestions = await this.suggest(text)
        } else {
          this.suggestions = await this.findParcels(text)
        }
        this.loading = false
      } else {
        this.suggestions = []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.search-tool {
  margin-top: 7px;
  height: 36px;
  --gutter: 0;
  --fill-color: #3b3b3b;
  --border-color: #5a5a5a;
  border-radius: 4px;
  background-color: #333;
  .btn {
    width: 32px;
    height: 32px;
  }
  .i-field.autocomplete {
    min-width: 280px;
    ::v-deep {
      .input {
        height: 28px;
      }
    }
  }
  .i-field.select {
    line-height: 28px;
    min-width: 80px;
    font-size: 15px;
    ::v-deep {
      .input {
        height: 28px;
      }
    }
  }
  .toolbar {
    gap: 6px;
    padding-right: 6px;
  }
}
</style>
