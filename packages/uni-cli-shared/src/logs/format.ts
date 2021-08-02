import { once } from '@dcloudio/uni-shared'

import { isInHBuilderX } from '../hbx/env'
import { moduleAliasFormatter } from '../hbx/alias'
import { h5ServeFormatter, removeInfoFormatter } from '../hbx/log'

export interface Formatter {
  test: (msg: string) => boolean
  format: (msg: string) => string
}

const errFormatters: Formatter[] = []
const infoFormatters: Formatter[] = []

const initErrFormattersOnce = once(() => {
  if (isInHBuilderX()) {
    errFormatters.push(moduleAliasFormatter)
  }
})

const initInfoFormattersOnce = once(() => {
  if (isInHBuilderX()) {
    if (
      // 开发模式下
      process.env.UNI_PLATFORM === 'h5' &&
      process.env.NODE_ENV !== 'production'
    ) {
      infoFormatters.push(h5ServeFormatter)
    }
    infoFormatters.push(removeInfoFormatter)
  }
})

export function formatErrMsg(msg: string) {
  initErrFormattersOnce()
  const formatter = errFormatters.find(({ test }) => test(msg))
  if (formatter) {
    return formatter.format(msg)
  }
  return msg
}

export function formatInfoMsg(msg: string) {
  initInfoFormattersOnce()
  const formatter = infoFormatters.find(({ test }) => test(msg))
  if (formatter) {
    return formatter.format(msg)
  }
  return msg
}
