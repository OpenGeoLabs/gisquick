// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import PortalVue from 'portal-vue'
import GetTextPlugin from 'vue-gettext'
import { ReactiveRefs } from 'vue-reactive-refs'
import Vue2TouchEvents from 'vue2-touch-events'

import './registerServiceWorker'
import Swiper from './swiper'
import http from './client'
import store from './store/index'
import App from './App.vue'
import ServerError from './ServerError.vue'
import UI from './ui/plugin'
import ScrollArea from './ui/ScrollArea.vue'
import BasicScrollArea from './ui/BasicScrollArea.vue'
import VImage from '@/components/image/Image.vue'
import GenericInfopanel from '@/components/GenericInfopanel.vue'

import translations from './translations'
import '@/assets/fonts/fonts.css'
import '@/ui/base.scss'
import '@/ui/layout.scss'
import '@/ui/transitions/transitions.scss'
import '@/backhandler'

import {
  Collapsible,
  CollapseTransition,
  CollapseWidth,
  SwitchTransition,
  SlideTop
} from './components/transitions'

// import all icons for hot reload functionality in dev mode
if (process.env.NODE_ENV === 'development') {
  require.context('../icons', false, /.*\.svg$/)
}

Vue.config.productionTip = false
const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)
window.env = {
  mobile
}
if (mobile) {
  Vue.use(Swiper)
}

Vue.use(Vue2TouchEvents, {
  disableClick: true,
  swipeTolerance: 30
})
Vue.use(PortalVue)
Vue.use(ReactiveRefs)
Vue.use(GetTextPlugin, { translations, defaultLanguage: 'en-us', muteLanguages: ['en-us'] })

// register general purpose components globally
Vue.use(UI)
Vue.component('scroll-area', mobile ? BasicScrollArea : ScrollArea)
// Vue.component('scroll-area', BasicScrollArea)
Vue.component('v-collapsible', Collapsible)
Vue.component('v-image', VImage)
Vue.component('collapse-transition', CollapseTransition)
Vue.component('collapse-width-transition', CollapseWidth)
Vue.component('switch-transition', SwitchTransition)
Vue.component('slide-top-transition', SlideTop)
Vue.component('generic-infopanel', GenericInfopanel)

Vue.prototype.$http = http

function createApp (data) {
  store.commit('app', data.app)
  store.commit('user', data.user)
  const vm = new Vue({
    store,
    // render: h => null
    render: h => h(App)
  })
  let lang = localStorage.getItem('gisquick:language') || data.app.lang
  if (!lang && data.app.languages) {
    const appLangs = data.app.languages.map(l => l.code)
    for (const l of navigator.languages) {
      const match = appLangs.find(al => al.toLowerCase() === l.toLowerCase())
      if (match) {
        lang = match
        break
      }
    }
  }
  if (lang) {
    vm.$language.current = lang
    document.documentElement.setAttribute('lang', lang.split('-')[0])
  }
  vm.$mount('#app')
}

function errorPage (err) {
  const status = err && err.response && err.response.status
  const vm = new Vue({
    render: h => h(ServerError, { props: { status }})
  })
  vm.$mount('#app')
}

http.get('/api/app/')
  .then(resp => createApp(resp.data))
  .catch(err => errorPage(err))
