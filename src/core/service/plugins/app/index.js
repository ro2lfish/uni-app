import {
  callAppHook
} from '../util'

import createApp from './create-app'

export {
  getApp,
  getCurrentPages
}
  from './create-app'

export let createLaunchOptions = function () {
  const scene = 1001
  const referrerInfo = {
    appId: '',
    extraData: {}
  }
  try {
    return {
      path: this.$route.meta && this.$route.meta.pagePath,
      query: this.$route.query,
      scene,
      referrerInfo
    }
  } catch (error) {
    return {
      path: '',
      query: {},
      scene,
      referrerInfo
    }
  }
}

export function createAppMixin (Vue, routes, entryRoute) {
  return {
    created: function AppCreated () {
      createApp(Vue, this, routes)
      // TODO
      if (!entryRoute.meta.name) { // PageNotFound
        UniServiceJSBridge.emit('onPageNotFound', {
          path: entryRoute.path,
          query: entryRoute.query,
          isEntryPage: true
        })
        // TODO 跳转至缺省404页面
      }
    },

    beforeMount: function appBeforeMount () {
      // TODO 平台代码
      this.$el = document.getElementById('app')
    },
    mounted: function appMounted () {
      // 稍微靠后点，让 App 有机会在 mounted 事件前注册一些全局事件监听，如 UI 显示(showModal)
      createLaunchOptions = createLaunchOptions.bind(this)
      const args = createLaunchOptions()
      callAppHook(this, 'onLaunch', args)
      callAppHook(this, 'onShow', args)
    }
  }
}
