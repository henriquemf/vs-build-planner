/* Display settings, persisted to localStorage.
   Only values that differ from the defaults are stored, so changing a default in a new
   release reaches everybody who never touched that particular switch. Bumping `version`
   discards the whole stored object. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'
  const { reactive, watch } = Vue

  const DEFAULT_CONFIG = {
    sorting: false,
    impacts: true,
    pixels: true,
    titles: true,
    dlc1: true,
    dlc2: true,
    dlc3: true,
    dlc4: true,
    dlc5: true,
    dlc6: true,
    dlc7: true,
    dlc8: true,
    combinations: true,
    size: 1,
    version: 3,
  }

  VSP.useConfig = function useConfig(storageKey = 'vs-build') {
    const stored = read(storageKey)
    const userConfig = stored.version === DEFAULT_CONFIG.version ? stored : { ...DEFAULT_CONFIG }
    const config = reactive({ ...DEFAULT_CONFIG, ...userConfig })

    watch(config, () => {
      for (const key in config) {
        if (config[key] === DEFAULT_CONFIG[key] && key !== 'version') delete userConfig[key]
        else userConfig[key] = config[key]
      }
      write(storageKey, userConfig)
    })

    return config
  }

  function read(storageKey) {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}')
    } catch (error) {
      return {} // private mode, or a corrupted value left by an older build
    }
  }

  function write(storageKey, value) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch (error) {
      /* storage full or blocked — the session still works, it just will not persist */
    }
  }
})(window.VSP)
