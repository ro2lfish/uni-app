import { hasOwn, isArray } from '@vue/shared'
import {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
} from 'vue'

import { MPComponentInstance, MPComponentOptions } from './component'

export function initBehavior(options: any) {
  return Behavior(options)
}

export function initVueIds(
  vueIds: string | undefined,
  mpInstance: MPComponentInstance
) {
  if (!vueIds) {
    return
  }
  const ids = vueIds.split(',')
  const len = ids.length

  if (len === 1) {
    mpInstance._$vueId = ids[0]
  } else if (len === 2) {
    mpInstance._$vueId = ids[0]
    mpInstance._$vuePid = ids[1]
  }
}

const EXTRAS = ['externalClasses']

export function initExtraOptions(
  miniProgramComponentOptions: MPComponentOptions,
  vueOptions: ComponentOptions
) {
  EXTRAS.forEach((name) => {
    if (hasOwn(vueOptions, name)) {
      ;(miniProgramComponentOptions as any)[name] = vueOptions[name]
    }
  })
}

export function initWxsCallMethods(
  methods: WechatMiniprogram.Component.MethodOption,
  wxsCallMethods: WechatMiniprogram.Component.MethodOption
) {
  if (!isArray(wxsCallMethods)) {
    return
  }
  wxsCallMethods.forEach((callMethod: string) => {
    methods[callMethod] = function (this: MPComponentInstance, args: unknown) {
      return (this.$vm as any)[callMethod](args)
    }
  })
}

function selectAllComponents(
  mpInstance: MPComponentInstance,
  selector: string,
  $refs: Record<string, ComponentPublicInstance>
) {
  const components = mpInstance.selectAllComponents(selector)
  components.forEach((component) => {
    const ref = component.dataset.r
    $refs[ref] = component.$vm || component
    if (__PLATFORM__ === 'mp-weixin') {
      if (component.dataset.vueGeneric === 'scoped') {
        component
          .selectAllComponents('.scoped-ref')
          .forEach((scopedComponent) => {
            selectAllComponents(
              scopedComponent as MPComponentInstance,
              selector,
              $refs
            )
          })
      }
    }
  })
}

export function initRefs(
  instance: ComponentInternalInstance,
  mpInstance: MPComponentInstance
) {
  Object.defineProperty(instance, 'refs', {
    get() {
      const $refs: Record<string, any> = {}
      selectAllComponents(mpInstance, '.r', $refs)
      const forComponents = mpInstance.selectAllComponents('.r-i-f')
      forComponents.forEach((component) => {
        const ref = component.dataset.r
        if (!$refs[ref]) {
          $refs[ref] = []
        }
        $refs[ref].push(component.$vm || component)
      })
      return $refs
    },
  })
}

export function findVmByVueId(
  instance: ComponentPublicInstance,
  vuePid: string
): ComponentPublicInstance | undefined {
  // 标准 vue3 中 没有 $children，定制了内核
  const $children = (instance as any).$children
  // 优先查找直属(反向查找:https://github.com/dcloudio/uni-app/issues/1200)
  for (let i = $children.length - 1; i >= 0; i--) {
    const childVm = $children[i]
    if (childVm.$scope._$vueId === vuePid) {
      return childVm
    }
  }
  // 反向递归查找
  let parentVm
  for (let i = $children.length - 1; i >= 0; i--) {
    parentVm = findVmByVueId($children[i], vuePid)
    if (parentVm) {
      return parentVm
    }
  }
}

const EVENT_OPTS = 'eO'
/**
 * 需要搭配：
 * ./componentInstance/index.ts:24 triggerEvent 时传递 __ins__
 * ./componentProps.ts:49 增加 properties eO
 * @param this
 * @param event
 * @returns
 */
export function handleEvent(
  this: MPComponentInstance,
  event: {
    type: string
    target: {
      dataset: Record<string, any>
    }
    detail: {
      __ins__: MPComponentInstance & { eO: Record<string, string> }
    }
  }
) {
  const {
    type,
    target: { dataset },
    detail: { __ins__ },
  } = event
  let methodName: string = type
  // 快手小程序的 __l 方法也会走此处逻辑，但没有 __ins__
  if (__ins__) {
    // 自定义事件，通过 triggerEvent 传递 __ins__
    methodName = (__ins__.properties[EVENT_OPTS] || {})[type]
  } else if (dataset && dataset[EVENT_OPTS]) {
    // 快手小程序 input 等内置组件的 input 事件也会走此逻辑，所以从 dataset 中读取
    methodName = dataset[EVENT_OPTS][type]
  }

  if (!(this as any)[methodName]) {
    return console.warn(type + ' not found')
  }
  ;(this as any)[methodName](event)
}