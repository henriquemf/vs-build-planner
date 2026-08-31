/* The RESET / COPY / SAVE buttons. Each one flashes its button green or red. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'

  const SLOTS_SELECTOR = '.slots'

  VSP.createShareActions = function createShareActions(selection) {
    const { selectedCharacter, selectedStage, selectedArcanas, selectedPassives, evolvedWeapons, reset } = selection

    function resetBuild(event) {
      reset()
      VSP.highlightElement(event.target, '#3c3')
    }

    function copyLink(event) {
      VSP.reportOn(event.target, navigator.clipboard.writeText(location.href))
    }

    /* A Discord-friendly summary: link, then character + arcanas, weapons, passives. */
    function buildEmojiSummary() {
      const lines = [`Build: <${location.href}>`]
      if (selectedCharacter.value.id || selectedArcanas.value.length) {
        const head = selectedCharacter.value.id ? [selectedCharacter.value.emoji] : []
        lines.push(head.concat(selectedArcanas.value.map((item) => item.emoji)).join(' '))
      }
      if (evolvedWeapons.value.length) {
        lines.push(evolvedWeapons.value.map((item) => item.emoji).join(' '))
      }
      if (selectedPassives.value.length) {
        lines.push(
          selectedPassives.value
            .concat(selectedStage.value.items || [])
            .map((item) => item?.emoji || '')
            .join(' ')
        )
      }
      return lines.join('\n')
    }

    function copyEmojis(event) {
      VSP.reportOn(event.target, navigator.clipboard.writeText(buildEmojiSummary()))
    }

    function copyImage(event) {
      VSP.reportOn(
        event.target,
        domtoimage.toBlob(document.querySelector(SLOTS_SELECTOR)).then((blob) => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
      )
    }

    function saveImage(event) {
      VSP.reportOn(
        event.target,
        domtoimage.toPng(document.querySelector(SLOTS_SELECTOR)).then((dataUrl) => {
          const link = document.createElement('a')
          link.download = `vs-build_${new Date().toISOString().substring(0, 19).replaceAll(':', '-')}.png`
          link.href = dataUrl
          link.click()
        })
      )
    }

    return { reset: resetBuild, copyLink, copyEmojis, copyImage, saveImage }
  }
})(window.VSP)
