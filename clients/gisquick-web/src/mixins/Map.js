import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import has from 'lodash/has'
import mapKeys from 'lodash/mapKeys'
import { boundingExtent, getCenter, buffer as bufferExtent } from 'ol/extent'
import { unByKey } from 'ol/Observable'
import 'ol/ol.css'

import { createMap, registerProjections } from '@/map/map-builder'

function getTileKey (tile) {
  return tile.tileCoord.join('/')
}

function round (num, precision) {
  const m = Math.pow(10, precision)
  return Math.round(num * m) / m
}

function layersList (node) {
  return node.layers ? [].concat(...node.layers.map(layersList)) : [node]
}

export default {
  data () {
    return {
      status: {
        baseLayer: {
          loading: false,
          error: false
        },
        overlays: {
          loading: false,
          error: false
        }
      }
    }
  },
  computed: {
    ...mapState(['app', 'project', 'activeTool']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers'])
  },
  watch: {
    visibleLayers: 'setVisibleLayers',
    visibleBaseLayer: 'setVisibleBaseLayer'
  },
  created () {
    const { config } = this.project
    if (config.projections) {
      registerProjections(config.projections)
    }
    this.queryParams = mapKeys(Object.fromEntries(new URLSearchParams(location.search)), (_, k) => k.toLowerCase())
    if (this.queryParams.overlays) {
      let overlays = this.queryParams.overlays.split(',')
      const virtualLayersGroups = this.project.overlays.groups.filter(g => g.virtual_layer && overlays.includes(g.name))
      const virtualLayers = virtualLayersGroups.reduce((list, g) => list.concat(layersList(g).map(l => l.name)), [])
      const exclude = virtualLayers.concat(virtualLayersGroups.map(g => g.name))
      const visibleLayers = overlays.filter(name => !exclude.includes(name))
      this.$store.commit('visibleLayers', visibleLayers)
      virtualLayersGroups.forEach(group => this.$store.commit('groupVisibility', { group, visible: true }))
    }

    const mapConfig = {
      project: config.ows_project,
      baseLayers: this.project.baseLayers.list,
      overlays: this.project.overlays.list,
      extent: config.project_extent,
      projection: config.projection,
      resolutions: config.tile_resolutions,
      scales: config.scales,
      owsUrl: config.ows_url,
      legendUrl: config.legend_url,
      mapcacheUrl: config.mapcache_url,
      mapTiling: config.map_tiling
    }
    const map = createMap(mapConfig, { zoom: false, attribution: false, rotate: false })
    Vue.prototype.$map = map
    if (process.env.NODE_ENV === 'development') {
      window.olmap = map
    }

    // base layer need to be initialized after ol map is created
    let visibleBaseLayer
    if (has(this.queryParams, 'baselayer')) { // baselayer can be empty string
      visibleBaseLayer = this.project.baseLayers.list.find(l => l.name === this.queryParams.baselayer)
    } else {
      visibleBaseLayer = this.project.baseLayers.list.find(l => l.visible)
    }
    if (this.visibleBaseLayer !== visibleBaseLayer) {
      this.$store.commit('visibleBaseLayer', visibleBaseLayer?.name)
    } else {
      this.setVisibleBaseLayer(visibleBaseLayer)
    }
    this.registerStatusListener(map.overlay, this.status.overlays)
  },
  mounted () {
    const map = this.$map
    map.setTarget(this.$refs.mapEl)

    const precision = this.project.config.units.position_precision
    // extra map functions
    map.ext = {
      visibleAreaPadding: () => {
        const { top, right, bottom, left } = this.$refs.mapViewport.getBoundingClientRect()
        return [top, window.innerWidth - right, window.innerHeight - bottom, left]
      },
      visibleAreaExtent: () => {
        const { top, right, bottom, left } = this.$refs.mapViewport.getBoundingClientRect()
        const p1 = map.getCoordinateFromPixel([left, top])
        const p2 = map.getCoordinateFromPixel([right, bottom])
        return boundingExtent([p1, p2])
      },
      zoomToGeometry: (geom, options = {}) => {
        if (!geom) {
          return
        }
        const resolution = map.getView().getResolution()
        let padding = options.padding || map.ext.visibleAreaPadding()
        if (geom.getType() === 'Point') {
          const center = geom.getCoordinates()
          center[0] += (-padding[3] * resolution + padding[1] * resolution) / 2
          center[1] += (-padding[2] * resolution + padding[0] * resolution) / 2
          map.getView().animate({
            center,
            duration: 450
          })
        } else {
          const extent = geom.getExtent()
          // add 5% buffer (padding)
          const buffer = (map.getSize()[0] - padding[1] - padding[3]) * 0.05 * resolution
          map.getView().fit(bufferExtent(extent, buffer), { duration: 450, padding })
        }
      },
      zoomToFeature: (feature, options = {}) => {
        map.ext.zoomToGeometry(feature.getGeometry(), options)
      },
      centerToGeometry (geom) {
        const center = getCenter(geom.getExtent())
        map.getView().animate({ center, duration: 450 })
      },
      refreshOverlays () {
        map.overlay.getSource().refresh()
      },
      createPermalink: () => {
        const toolParams = this.$refs.tools.getActiveComponent()?.getPermalinkParams?.()

        const virtualLayersGroups = this.project.overlays.groups.filter(g => g.virtual_layer && g.visible)
        const virtualLayers = virtualLayersGroups.reduce((list, g) => list.concat(layersList(g).map(l => l.name)), [])
        const overlays = this.visibleLayers
          .filter(l => !l.hidden && !virtualLayers.includes(l.name))
          .map(l => l.name)
        overlays.push(...virtualLayersGroups.map(g => g.name))

        const extent = map.ext.visibleAreaExtent()
        const params = {
          extent: extent.map(v => round(v, precision)).join(','),
          overlays: overlays.join(','),
          baselayer: this.visibleBaseLayer?.name ?? '',
          ...toolParams
        }
        if (location.pathname === '/') {
          params['PROJECT'] = this.project.config.name
        }
        const url = new URL(location.href)
        Array.from(url.searchParams.keys()).forEach(k => url.searchParams.delete(k))
        Object.keys(params).forEach(name => url.searchParams.set(name, params[name]))
        return decodeURIComponent(url.toString()) // unescaped url
        // return url.toString()
      },
      formatCoordinate: v => round(v, precision)
    }
    const extentParam = this.queryParams.extent?.split(',').map(parseFloat)
    const extent = extentParam || this.project.config.zoom_extent || this.project.config.project_extent
    const padding = map.ext.visibleAreaPadding()
    map.getView().fit(extent, { padding })
    if (this.queryParams.tool) {
      this.$store.commit('activeTool', this.queryParams.tool)
    }
    this.$nextTick(() => this.$refs.tools.getActiveComponent()?.loadPermalink?.(this.queryParams))
  },
  methods: {
    async setVisibleBaseLayer (layer) {
      this.$map?.getLayers().getArray()
        .filter(l => l.get('type') === 'baselayer' && l.get('name') !== layer?.name)
        .forEach(l => l.setVisible(false))
      if (layer) {
        const baseLayer = await this.$map.getBaseLayer(layer.name)
        baseLayer.setVisible(true)
        this.unregisterBaseLayerListener?.()
        this.unregisterBaseLayerListener = this.registerStatusListener(baseLayer, this.status.baseLayer)
      }
    },
    setVisibleLayers (layers) {
      this.$map.overlay.getSource().setVisibleLayers(layers.map(l => l.name))
    },
    registerStatusListener (olLayer, status) {
      const source = olLayer.getSource()
      if (source.getTileLoadFunction) {
        this.registerTilesStatusListener(source, status)
      } else {
        this.registerImageStatusListener(source, status)
      }
    },
    registerImageStatusListener (source, status) {
      const l1 = source.on('imageloadstart', () => {
        status.loading = true
      })
      const l2 = source.on('imageloadend', () => {
        status.error = false
        status.loading = false
      })
      const l3 = source.on('imageloaderror', () => {
        status.error = true
        status.loading = false
      })
      // unregister function
      return () => {
        status.error = false
        status.loading = false
        unByKey([l1, l2, l3])
      }
    },
    registerTilesStatusListener (source, status) {
      const tiles = new Set()
      const l1 = source.on('tileloadstart', e => {
        tiles.add(getTileKey(e.tile))
        status.loading = true
      })
      const l2 = source.on('tileloadend', e => {
        tiles.delete(getTileKey(e.tile))
        status.loading = tiles.size > 0
        // status.loading = !isEmpty(e.target.tileLoadingKeys_)
      })
      const l3 = source.on('tileloaderror', e => {
        tiles.delete(getTileKey(e.tile))
        status.loading = tiles.size > 0
        // status.loading = !isEmpty(e.target.tileLoadingKeys_)
      })
      // unregister function
      return () => {
        status.error = false
        status.loading = false
        unByKey([l1, l2, l3])
      }
    }
  }
}
