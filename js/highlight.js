/* Hovering a tile paints the tiles it relates to: yellow for "combines with", and
   green/red for "helps / hurts". Done by toggling classes directly rather than through
   Vue, because it touches hundreds of tiles per hover and none of it is state. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'

  const IMPACT_CLASS = { '+': 'green', '-': 'red', '~': 'greenred', '!': 'redgreen' }
  const ALL_CLASSES = ['yellow', 'green', 'red', 'greenred', 'redgreen']

  VSP.createHighlighter = function createHighlighter(catalog, impactsById) {
    const { evolutions } = catalog

    function paint(itemId, className) {
      if (!className) return
      for (const element of document.querySelectorAll(`[data-id="${itemId}"]`)) element.classList.add(className)
    }

    function showImpacts(item) {
      if (!item) return
      if (item.type !== 'arcana' && item.itemIds) {
        const evolutionIds = evolutions.filter((evolution) => evolution.itemIds.includes(item.id)).map((evolution) => evolution.id)
        for (const relatedId of item.itemIds.concat(evolutionIds)) paint(relatedId, 'yellow')
      }
      for (const impact of impactsById.value[item.id] || []) {
        paint(impact.substring(1), IMPACT_CLASS[impact[0]])
      }
    }

    function hideImpacts() {
      for (const element of document.querySelectorAll('.' + ALL_CLASSES.join(', .'))) {
        element.classList.remove(...ALL_CLASSES)
      }
    }

    return { showImpacts, hideImpacts }
  }
})(window.VSP)
