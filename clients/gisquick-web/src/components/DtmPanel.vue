<template>
  <div v-if="infopanelFields.mapotip.length && infopanelFields.dtm.length" class="dtm-infopanel">
    <v-tabs-header :items="tabs" v-model="activeTab"/>
    <v-tabs :items="tabs" v-model="activeTab">
      <template v-slot:mapotip>
        <generic-info-panel
          v-bind="$props"
          :show-relations="false"
          :properties="infopanelFields.mapotip"
        />
      </template>
      <template v-slot:dtm>
        <generic-info-panel
          v-bind="$props"
          :show-relations="false"
          :properties="infopanelFields.dtm"
        />
      </template>
    </v-tabs>
    <generic-info-panel
      v-bind="$props"
      :properties="[]"
      @relation="(r, d) => $emit('relation', r, d)"
    />
  </div>
  <generic-info-panel
    v-else
    v-bind="$props"
    @relation="(r, d) => $emit('relation', r, d)"
  />
</template>

<script>
import VTabs from '@/ui/Tabs.vue'
import VTabsHeader from '@/ui/TextTabsHeader.vue'
import GenericInfoPanel from '@/components/GenericInfopanel.vue'
import { isDtmField } from '@/mapotip.js'


export default {
  name: 'DTM_Panel',
  components: { VTabs, VTabsHeader, GenericInfoPanel },
  props: {
    project: Object,
    layer: Object,
    feature: Object
  },
  data () {
    return {
      activeTab: 'mapotip'
    }
  },
  computed: {
    tabs () {
      return [
        { key: 'mapotip', label: 'Pasport' },
        { key: 'dtm', label: 'DTM' },
      ]
    },
    infopanelFields () {
      const orderedFields = this.layer.info_panel_fields || this.layer.attributes.map(a => a.name)
      const mapotip = []
      const dtm = []
      orderedFields.forEach(n => {
        const list = n === 'fid' || isDtmField(n) ? dtm : mapotip
        list.push(n)
      })
      return { mapotip, dtm }
    }
  }
}
</script>

<style lang="scss" scoped>
.dtm-infopanel {
  .generic-infopanel {
    :deep(.fields:empty) {
      border: none;
    }
  }
  @media (min-width: 501px) {
    width: 400px;
  }
}
</style>
