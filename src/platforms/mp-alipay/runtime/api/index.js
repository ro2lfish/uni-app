import createMediaQueryObserver from '../../../mp-weixin/helpers/create-media-query-observer'
import {
  isFn,
  hasOwn
} from 'uni-shared'

export {
  setStorageSync,
  getStorageSync,
  removeStorageSync
}
  from '../../helpers/storage'
export {
  getPushClientid,
  onPushMessage,
  offPushMessage,
  invokePushCallback
}
  from 'uni-core/service/api/plugin/push'
export function startGyroscope (params) {
  if (hasOwn(params, 'interval')) {
    console.warn('支付宝小程序 startGyroscope暂不支持interval')
  }
  params.success && params.success({
    errMsg: 'startGyroscope:ok'
  })
  params.complete && params.complete({
    errMsg: 'startGyroscope:ok'
  })
}

function createExecCallback (execCallback) {
  return function wrapperExecCallback (res) {
    this.actions.forEach((action, index) => {
      (action._$callbacks || []).forEach(callback => {
        callback(res[index])
      })
    })
    if (isFn(execCallback)) {
      execCallback(res)
    }
  }
}

function addCallback (callback) {
  if (isFn(callback)) {
    const action = this.actions[this.actions.length - 1]
    if (action) {
      (action._$callbacks || (action._$callbacks = [])).push(callback)
    }
  }
}

export function createSelectorQuery () {
  const query = my.createSelectorQuery()

  const oldExec = query.exec
  const oldScrollOffset = query.scrollOffset
  const oldBoundingClientRect = query.boundingClientRect
  query.exec = function exec (callback) {
    return oldExec.call(this, createExecCallback(callback).bind(this))
  }
  query.scrollOffset = function scrollOffset (callback) {
    const ret = oldScrollOffset.call(this)
    addCallback.call(this, callback)
    return ret
  }
  query.boundingClientRect = function boundingClientRect (callback) {
    const ret = oldBoundingClientRect.call(this)
    addCallback.call(this, callback)
    return ret
  }

  if (!query.fields) {
    query.fields = function ({
      rect,
      size,
      scrollOffset
    } = {}, callback) {
      if (rect || size) {
        this.boundingClientRect()
      }
      if (scrollOffset) {
        this.scrollOffset()
      }
      addCallback.call(this, callback)
      return this
    }
  }

  if (!query.in) {
    query.in = function () {
      return this
    }
  }
  return query
}

export function createIntersectionObserver (component, options) {
  if (options && options.observeAll) {
    options.selectAll = options.observeAll
    delete options.observeAll
  }
  return my.createIntersectionObserver(options)
}

export {
  createMediaQueryObserver
}
