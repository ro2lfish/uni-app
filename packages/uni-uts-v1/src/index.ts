import { isArray } from '@vue/shared'

import { runKotlinProd, runKotlinDev } from './kotlin'
import { runSwiftProd, runSwiftDev } from './swift'

import { genProxyCode, resolvePlatformIndex, resolveRootIndex } from './code'
import { resolvePackage } from './utils'
import { parseUtsSwiftPluginStacktrace } from './stacktrace'
import { resolveUtsPluginSourceMapFile } from './sourceMap'
import { isWindows } from './shared'

export * from './sourceMap'
export {
  generateCodeFrameWithKotlinStacktrace,
  generateCodeFrameWithSwiftStacktrace,
} from './legacy'

export async function compile(module: string) {
  const pkg = resolvePackage(module)
  if (!pkg) {
    return
  }
  const deps: string[] = []
  const code = await genProxyCode(module, pkg)
  if (process.env.NODE_ENV !== 'development') {
    // 生产模式 支持同时生成 android 和 ios 的 uts 插件
    if (
      process.env.UNI_UTS_PLATFORM === 'app-android' ||
      process.env.UNI_UTS_PLATFORM === 'app'
    ) {
      const filename =
        resolvePlatformIndex('app-android', module, pkg) ||
        resolveRootIndex(module, pkg)
      if (filename) {
        await getCompiler('kotlin').runProd(filename)
      }
    }
    if (
      process.env.UNI_UTS_PLATFORM === 'app-ios' ||
      process.env.UNI_UTS_PLATFORM === 'app'
    ) {
      const filename =
        resolvePlatformIndex('app-ios', module, pkg) ||
        resolveRootIndex(module, pkg)
      if (filename) {
        await getCompiler('swift').runProd(filename)
      }
    }
  } else {
    // iOS windows 平台，标准基座不编译
    if (process.env.UNI_UTS_PLATFORM === 'app-ios') {
      if (isWindows) {
        process.env.UNI_UTS_TIPS = `iOS手机在windows上真机运行时uts插件代码修改需提交云端打包自定义基座才能生效`
        return {
          code,
          deps,
        }
      }
      if (process.env.HX_USE_BASE_TYPE === 'standard') {
        process.env.UNI_UTS_TIPS = `iOS手机在标准基座真机或模拟器运行暂不支持uts插件，如需调用uts插件请使用自定义基座`
        return {
          code,
          deps,
        }
      }
    }
    if (
      process.env.UNI_UTS_PLATFORM === 'app-android' ||
      process.env.UNI_UTS_PLATFORM === 'app-ios'
    ) {
      // dev 模式
      const filename =
        resolvePlatformIndex(process.env.UNI_UTS_PLATFORM, module, pkg) ||
        resolveRootIndex(module, pkg)
      const compilerType =
        process.env.UNI_UTS_PLATFORM === 'app-android' ? 'kotlin' : 'swift'

      if (filename) {
        deps.push(filename)
        const res = await getCompiler(compilerType).runDev(filename)
        if (res) {
          if (isArray(res.deps) && res.deps.length) {
            // 添加其他文件的依赖
            deps.push(...res.deps)
          }
          if (res.type === 'swift') {
            if (res.code) {
              console.error(
                `error: ` +
                  (await parseUtsSwiftPluginStacktrace({
                    stacktrace: res.msg,
                    sourceMapFile: resolveUtsPluginSourceMapFile(
                      'swift',
                      filename,
                      process.env.UNI_INPUT_DIR,
                      process.env.UNI_OUTPUT_DIR
                    ),
                    sourceRoot: process.env.UNI_INPUT_DIR,
                  }))
              )
            }
          }
          const files: string[] = []
          if (process.env.UNI_APP_UTS_CHANGED_FILES) {
            try {
              files.push(...JSON.parse(process.env.UNI_APP_UTS_CHANGED_FILES))
            } catch (e) {}
          }
          if (res.changed) {
            files.push(...res.changed)
          }
          process.env.UNI_APP_UTS_CHANGED_FILES = JSON.stringify([
            ...new Set(files),
          ])
        }
      }
    }
  }
  return {
    code,
    deps,
  }
}

function getCompiler(type: 'kotlin' | 'swift') {
  if (type === 'swift') {
    return {
      runProd: runSwiftProd,
      runDev: runSwiftDev,
    }
  }
  return {
    runProd: runKotlinProd,
    runDev: runKotlinDev,
  }
}
