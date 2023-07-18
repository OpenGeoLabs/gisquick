<template>
  <div class="ruian-search-tool dark f-row-ac xpx-1" :class="{expanded}" key="search">
    <v-btn class="toggle icon flat" @click="expanded = !expanded">
      <v-icon name="magnifier"/>
    </v-btn>
    <div v-if="expanded" class="toolbar f-row-ac">
      <v-autocomplete
        :placeholder="tr.Search"
        class="flat"
        :loading="loading"
        :min-chars="2"
        :items="suggestions"
        :highlight-fields="method === 'findAddressCandidates' ? 'address' : 'text'"
        @input="onInput"
        @text:update="onTextChange"
      >
        <template v-if="method === 'findAddressCandidates'" v-slot:item="{ html }">
          <div class="item f-row f-grow">
            <div class="f-grow">
              <span class="address" v-html="html.address"/>
            </div>
          </div>
        </template>
        <template v-else v-slot:item="{ html }">
          <div class="item f-row f-grow">
            <div class="f-grow">
              <span class="address" v-html="html.text"/>
            </div>
          </div>
        </template>
      </v-autocomplete>
      <v-menu
        content-class="mt-2"
        transition="slide-y"
        align="rr;bb,tt"
        :items="menuOptions"
      >
        <template v-slot:activator="{ toggle }">
          <v-btn :aria-label="tr.Menu" class="icon flat" @click="toggle">
            <v-icon name="settings"/>
          </v-btn>
        </template>
      </v-menu>
      <features-viewer :features="features"/>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Point from 'ol/geom/Point'
import Feature from 'ol/Feature'

import VAutocomplete from '@/ui/Autocomplete.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'

export default {
  name: 'search',
  components: { VAutocomplete, FeaturesViewer },
  data () {
    return {
      suggestions: [],
      feature: null,
      // method: 'findAddressCandidates',
      method: 'suggest',
      service: 'ruian',
      expanded: false,
      loading: false
    }
  },
  computed: {
    ...mapState(['project']),
    menuOptions () {
      return [
        {
          text: 'Method',
          separator: true
        }, {
          text: 'findAddressCandidates',
          checked: this.method === 'findAddressCandidates',
          action: () => {
            this.method = 'findAddressCandidates'
          }
        }, {
          text: 'suggest',
          checked: this.method === 'suggest',
          action: () => {
            this.method = 'suggest'
          }
        }, {
          text: 'Service',
          separator: true
        }, {
          text: 'ags.cuzk.cz',
          checked: this.service === 'ruian',
          action: () => {
            this.service = 'ruian'
          }
        }, {
          text: 'geocode.arcgis.com',
          checked: this.service === 'arcgis',
          action: () => {
            this.service = 'arcgis'
          }
        }
      ]
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
    tr () {
      return {
        Search: this.$gettext('Search'),
      }
    }
  },
  methods: {
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
    async suggest (url, text) {
      const params = {
        text,
        location: this.viewLocation(),
        searchExtent: this.projectExtent,
        maxSuggestions: 6,
        f: 'json',
        distance: 500
      }
      const { data } = await this.$http.get(url, { params })
      this.suggestions = data.suggestions
    },
    async findAddressCandidates (url, text) {
      const params = {
        text,
        SingleLine: text,
        searchExtent: this.projectExtent,
        location: this.viewLocation(),
        outSR: 102067,
        f: 'json'
      }
      const { data } = await this.$http.get(url, { params })
      this.suggestions = data.candidates
    },
    async onInput (item) {
      if (this.method === 'suggest') {
        const params = {
          SingleLine: item.text,
          magicKey: item.magicKey,
          // searchExtent: this.projectExtent,
          outSR: 102067,
          f: 'json'
        }
        const url = this.service === 'ruian'
          ? 'http://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/findAddressCandidates'
          : '/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
        const { data } = await this.$http.get(url, { params })
        item = data.candidates[0]
        if (!item) {
          return
        }
      }
      const { x, y } = item.location
      const f = new Feature({ geometry: new Point([x, y]) })
      this.feature = Object.freeze(f)
      this.$map.ext.zoomToFeature(f)
    },
    async onTextChange (text) {
      if (text.length > 1) {
        this.loading = true
        if (this.method === 'findAddressCandidates') {
          const url = this.service === 'ruian'
          ? 'http://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/findAddressCandidates'
          : '/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
          await this.findAddressCandidates(url, text)
        } else {
          const url = this.service === 'ruian'
            ? 'http://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/suggest'
            : '/arcgis/rest/services/World/GeocodeServer/suggest'
          await this.suggest(url, text)
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
.ruian-search-tool {
  margin-top: 7px;
  height: 36px;
  --gutter: 0;
  --fill-color: #3b3b3b;
  --border-color: #5a5a5a;
  border-radius: 4px;
  background-color: #333;
  gap: 3px;
  .btn {
    width: 32px;
    height: 32px;
  }
  .i-field.autocomplete {
    min-width: 240px;
    ::v-deep {
      .input {
        height: 28px;
      }
    }
  }
}
</style>