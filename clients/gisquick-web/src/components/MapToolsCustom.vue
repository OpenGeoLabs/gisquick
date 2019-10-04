<script>
import Vue from 'vue'

import MapTools from './MapTools.vue'
import Identification from './Identification'

export default {
  extends: MapTools,
  computed: {
    identification () {
      return {
        name: 'identification',
        props: Vue.observable({
          identificationLayer: '',
          displayMode: 'info-panel'
        }),
        component: Identification
      }
    }
  },
  watch: {
    activeTool: {
      immediate: true,
      handler (activeTool) {
        if (!activeTool) {
          this.$store.commit('activeTool', 'identification')
        }
      }
    }
  }
}
</script>
