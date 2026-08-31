/* Wires the pieces together and mounts the Vue app onto #app.
   Load order (see index.html): util, config, catalog, selection, impacts, highlight,
   share, portraits, components, then this file. */
;(function (VSP) {
  'use strict'
  const { createApp, ref, reactive, computed, watchEffect, nextTick, provide } = Vue

  const app = createApp({
    setup() {
      console.log(
        '%cVOCÊ É O AMOR DA MINHA VIDA <3',
        'font-size:20px; font-weight:bold; color:#ff69b4; background:#1a0010; padding:8px 16px; border-radius:8px; border: 2px solid #ff69b4;'
      )

      const config = VSP.useConfig()
      const settings = ref(false)
      const collapsedSections = reactive({})

      const catalog = VSP.createCatalog()
      const { characters, weapons, evolutions, passives, arcanas, stages, items, itemsById } = catalog

      const missingIcons = VSP.installMissingIconPlaceholder(items)
      if (missingIcons.length) console.warn(`${missingIcons.length} item(s) have no sprite in css/icons.css:`, missingIcons.slice(0, 20).join(' '), missingIcons.length > 20 ? '…' : '')

      const selection = VSP.createSelection(catalog)
      const impactsById = VSP.createImpacts(catalog, selection)
      const { showImpacts, hideImpacts } = VSP.createHighlighter(catalog, impactsById)
      const shareActions = VSP.createShareActions(selection)
      const portraits = VSP.createPortraits()
      portraits.preload()

      // the tile components reach these through inject rather than a prop chain
      provide('config', config)
      provide('itemsById', itemsById)
      provide('impactsById', impactsById)
      provide('collapsedSections', collapsedSections)

      /* One filter for every section: an item is shown unless its DLC is switched off. */
      const visibleIn = (collection) => computed(() => collection.filter((item) => VSP.isVisibleWith(item, config)))

      /* With every label hidden there is nothing under the sprite, so centre it. */
      const bareTiles = computed(() => !config.combinations && !config.titles && !config.impacts)

      /* The stage's own pickups, laid out as the three rows the slot area draws. */
      const stagePassiveRows = computed(() => {
        const all = selection.stagePassives.value
        return [all.slice(0, 12).slice(0, -4), all.slice(8, 20).slice(0, -4), all.slice(-4)]
      })

      const walkAnimationStyle = (character) =>
        character.id === portraits.hoveredCharacterId.value ? { backgroundImage: `url('./img/characters/${character.id}.gif')`, backgroundSize: 'contain', backgroundPosition: 'bottom center' } : null

      /* Optional sort: the items that the current build cares about most, first. */
      const impactCount = (item) => (impactsById.value[item.id] || []).filter((impact) => selection.selectedIds.has(impact.substring(1))).length
      const byRelevance = (a, b) => impactCount(b) - impactCount(a) || b.index - a.index

      watchEffect(() => {
        if (!config.sorting) return
        weapons.sort(byRelevance)
        evolutions.sort(byRelevance)
        // Emergency Meeting passives are only reachable with their weapon, so keep them last
        passives.sort((a, b) => (a.dlc3 && !b.dlc3 ? 1 : !a.dlc3 && b.dlc3 ? -1 : byRelevance(a, b)))
        arcanas.sort(byRelevance)
      })

      function onMouseEnter(item) {
        portraits.show(item)
        showImpacts(item)
      }

      function onMouseLeave() {
        portraits.clear()
        hideImpacts()
      }

      function toggleItem(item) {
        if (item.selected) {
          selection.unselectId(item.id)
        } else {
          selection.selectId(item.id)
          nextTick(() => showImpacts(item))
        }
      }

      /* Clicking a filled slot removes it and moves the highlight to the next slot. */
      function deleteItem(item, nextItem) {
        selection.unselectId(item.id)
        hideImpacts()
        if (nextItem) showImpacts(nextItem)
      }

      // handy from the browser console: vsp.itemsById.whip, vsp.config.sorting = true, …
      window.vsp = { config, catalog, selection, impactsById, itemsById }

      return {
        config,
        dlcFlags: VSP.DLC_FLAGS,
        settings,
        itemsById,
        arcanas,
        bareTiles,
        walkAnimationStyle,
        visibleCharacters: visibleIn(characters),
        visibleWeapons: visibleIn(weapons),
        visibleEvolutions: visibleIn(evolutions),
        visiblePassives: visibleIn(passives),
        visibleStages: visibleIn(stages),
        selectedCharacter: selection.selectedCharacter,
        selectedStage: selection.selectedStage,
        selectedPassives: selection.selectedPassives,
        selectedArcanas: selection.selectedArcanas,
        pickedPassives: selection.pickedPassives,
        extraPassives: selection.extraPassives,
        stagePassiveRows,
        evolvedWeapons: selection.evolvedWeapons,
        counterpartsWeapons: selection.counterpartsWeapons,
        extraOpenWeaponSlots: selection.extraOpenWeaponSlots,
        maxArcanas: selection.maxArcanas,
        onMouseEnter,
        onMouseLeave,
        toggleItem,
        deleteItem,
        ...shareActions,
      }
    },
  })

  VSP.registerComponents(app)
  app.mount('#app')
})(window.VSP)
