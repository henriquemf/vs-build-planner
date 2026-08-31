/* Hovering a character swaps its static sprite for the walk animation.
   Only the characters listed in data/character-gifs.js actually have one, so the rest
   are never requested — asking for them produced a burst of 404s on every page load. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'
  const { ref } = Vue

  const gifUrl = (characterId) => `./img/characters/${characterId}.gif`

  VSP.createPortraits = function createPortraits() {
    const available = new Set(window.vs.characterGifs || [])
    const hoveredCharacterId = ref('')
    let pendingId = ''

    function show(character) {
      pendingId = character.id
      if (character.type !== 'character' || !available.has(character.id)) return
      const image = new Image()
      image.onload = () => {
        // the pointer may have moved on while the gif was loading
        if (pendingId === character.id) hoveredCharacterId.value = character.id
      }
      image.src = gifUrl(character.id)
      if (image.complete) hoveredCharacterId.value = character.id
    }

    function clear() {
      pendingId = ''
      hoveredCharacterId.value = ''
    }

    /* Warm the cache so the first hover is instant, but only once the page is idle —
       124 sprites are not worth competing with first paint. */
    function preload() {
      const start = () => {
        for (const characterId of available) new Image().src = gifUrl(characterId)
      }
      if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 3000 })
      else setTimeout(start, 1000)
    }

    return { hoveredCharacterId, show, clear, preload }
  }
})(window.VSP)
