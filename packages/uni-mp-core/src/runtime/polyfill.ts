import { ON_LOAD } from '@dcloudio/uni-shared'
import { camelize } from '@vue/shared'
import { MPComponentInstance } from './component'

const MPPage = Page
const MPComponent = Component

const customizeRE = /:/g

function customize(str: string) {
  return camelize(str.replace(customizeRE, '-'))
}

function initTriggerEvent(mpInstance: MPComponentInstance) {
  const oldTriggerEvent = mpInstance.triggerEvent
  mpInstance.triggerEvent = function (event, ...args) {
    return oldTriggerEvent.apply(mpInstance, [customize(event), ...args])
  }
}

function initHook(
  name: 'onLoad' | 'created',
  options: Record<string, any>,
  isComponent?: boolean
) {
  if (
    (__PLATFORM__ === 'mp-toutiao' || __PLATFORM__ === 'mp-lark') &&
    isComponent
  ) {
    // fix by Lxh 字节自定义组件Component构造器文档上写有created，但是实测只触发了lifetimes上的created
    options = options.lifetimes
  }
  const oldHook = options[name]
  if (!oldHook) {
    options[name] = function (this: MPComponentInstance) {
      initTriggerEvent(this)
    }
  } else {
    options[name] = function (this: MPComponentInstance, ...args: any[]) {
      initTriggerEvent(this)
      return oldHook.apply(this, args)
    }
  }
}

Page = function (options) {
  initHook(ON_LOAD, options)
  return MPPage(options)
}
if (__PLATFORM__ === 'mp-baidu') {
  // 补充after，否则百度报：Cannot read property 'historyStack' of undefined
  // https://smartprogram.baidu.com/forum/topic/show/153894
  ;(Page as any).after = (MPPage as any).after
}
Component = function (options) {
  initHook('created', options, true)
  return MPComponent(options)
}