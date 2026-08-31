/* What is currently in the build: the selected ids, everything derived from them, and
   the rules for adding and removing an item. The selection is mirrored into
   location.hash, which is what makes a build shareable as a link. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'
  const { reactive, computed, watch } = Vue

  /* Characters whose starting "weapon" is really a passive effect: it must not be added
     to the weapon slots, and it must not be treated as fixed. */
  const CHARACTERS_WITHOUT_STARTING_WEAPON = ['cosmo', 'megamenya', 'scorej', 'megaimpostor']

  /* Weapons a character brings that never appear in the normal weapon slots. */
  const CHARACTER_EXTRA_WEAPONS = {
    cosmo: ['bird1', 'bird2'],
    megamenya: ['bocce'],
    scorej: ['lightning'],
    jeneviv: ['insatiable'],
    syuuto: ['muramasa'], // megasyuuto's hidden weapon
    megaimpostor: ['tongue'],
  }

  /* Arcana I (Gemini) mirrors these weapons into their counterpart. */
  const GEMINI_COUNTERPARTS = {
    guns1: 'guns3',
    guns2: 'guns4',
    bird1: 'bird3',
    bird2: 'bird4',
    cat: 'cat2',
    popper: 'pooper',
    servant: 'sliver',
    tongue: 'tongue2',
    javelin: 'javelin2',
    lass: 'lass2',
  }

  const MAX_ARCANAS = { sigma: 5, avatar: 4 }
  const DEFAULT_MAX_ARCANAS = 3

  /* Stands in for "nothing selected" so callers can read `.id` / `.itemIds` unguarded. */
  const EMPTY_SELECTION = Object.freeze({ id: '', emoji: '', itemIds: Object.freeze([]) })

  VSP.createSelection = function createSelection(catalog) {
    const { items, itemsById, weapons, evolutions } = catalog

    const selectedIds = reactive(new Set(readHash()))

    /* Ids that no longer exist — an old share link, or an item renamed by a patch — are
       dropped rather than allowed to become `undefined` further down. */
    const selectedItems = computed(() =>
      Array.from(selectedIds)
        .map((id) => itemsById[id])
        .filter(Boolean)
    )

    const selectedCharacter = computed(() => selectedItems.value.find((item) => item.type === 'character') || EMPTY_SELECTION)
    const selectedStage = computed(() => selectedItems.value.find((item) => item.type === 'stage') || EMPTY_SELECTION)
    const selectedWeapons = computed(() => selectedItems.value.filter((item) => item.type === 'weapon').sort((a, b) => (a.fixed && !b.fixed ? -1 : 0)))
    const selectedPassives = computed(() => selectedItems.value.filter((item) => item.type === 'passive' && !selectedStage.value.itemIds.includes(item.id)))
    const selectedArcanas = computed(() => selectedItems.value.filter((item) => item.type === 'arcana'))

    const pickedPassives = computed(() => selectedPassives.value.filter((item) => !item.extra))
    const extraPassives = computed(() => selectedPassives.value.filter((item) => item.extra))
    const stagePassives = computed(() => selectedStage.value.items?.filter((item) => item.type === 'passive') || [])

    /* A selected weapon is displayed as its evolution once the recipe is complete. */
    const evolvedWeapons = computed(() => {
      const shown = selectedWeapons.value.map((weapon) => {
        if (!weapon.evolved || weapon.id === 'sword') return weapon // sword evolves into a counterpart
        if (weapon.evolution.evolved) return weapon.evolution.evolution // second-tier evolution
        return weapon.evolution
      })
      for (const item of selectedCharacter.value.items || []) {
        if (item.type === 'evolution') shown.unshift(item)
      }
      return Array.from(new Set(shown))
    })

    const counterpartsWeapons = computed(() => {
      const extras = CHARACTER_EXTRA_WEAPONS[selectedCharacter.value.id] || []
      const result = extras.map((id) => itemsById[id])
      if (itemsById.sword.evolved) result.push(itemsById.sword_)
      if (selectedIds.has('arcana1')) {
        const owns = (id) => selectedIds.has(id) || extras.includes(id)
        for (const [baseId, counterpartId] of Object.entries(GEMINI_COUNTERPARTS)) {
          if (owns(baseId)) result.push(itemsById[counterpartId])
        }
      }
      return result
    })

    /* Arcana XX (Silent Old Sanctuary) trades weapon slots for power: how many of the
       six slots are still worth opening for the evolutions currently planned? */
    const extraOpenWeaponSlots = computed(() => {
      if (!evolvedWeapons.value.length) return 1
      let extraCount = 0
      for (const maybeEvolution of evolvedWeapons.value) {
        const weaponsCount = maybeEvolution.fixed ? 1 : maybeEvolution.weaponIds?.length || 1
        extraCount = Math.max(extraCount, weaponsCount - 1)
      }
      for (const maybeEvolution of evolvedWeapons.value) {
        const weaponsCount = maybeEvolution.fixed ? 1 : maybeEvolution.weaponIds?.length || 1
        if (weaponsCount <= extraCount && !maybeEvolution.fixed) extraCount--
      }
      return extraCount
    })

    const maxArcanas = computed(() => {
      if (selectedIds.has('darkana6')) return 99
      return MAX_ARCANAS[selectedCharacter.value.id] || DEFAULT_MAX_ARCANAS
    })

    /* A character's own weapons cannot be removed from the build — and neither can an
       evolution built on one of them, whether or not the weapon itself is fixed. */
    function isItemFixed(item) {
      const character = selectedCharacter.value
      const startsWithWeapon = !CHARACTERS_WITHOUT_STARTING_WEAPON.includes(character.id)
      const isCharacterWeapon = startsWithWeapon && character.itemIds.includes(item.id)
      const isBuiltOnCharacterWeapon = item.type === 'evolution' && item.weaponIds.some((weaponId) => character.itemIds.includes(weaponId))
      return isCharacterWeapon || isBuiltOnCharacterWeapon
    }

    function selectId(itemId) {
      const item = itemsById[itemId]
      if (!item) return
      switch (item.type) {
        case 'character':
          if (selectedCharacter.value.id) selectedIds.delete(selectedCharacter.value.id)
          selectedIds.add(item.id)
          break
        case 'evolution':
          for (const ingredientId of item.itemIds) selectId(ingredientId)
          break
        case 'arcana':
          if (item.id === 'darkana6' || selectedArcanas.value.length <= maxArcanas.value) selectedIds.add(item.id)
          break
        case 'stage':
          if (selectedStage.value.id) selectedIds.delete(selectedStage.value.id)
          selectedIds.add(item.id)
          for (const pickupId of item.itemIds) selectId(pickupId)
          break
        case 'passive':
          if (!selectedStage.value.itemIds.includes(item.id)) {
            // a few passives only exist alongside an Emergency Meeting weapon
            const dlcWeapon = item.items.find((it) => it.dlc3)
            if (dlcWeapon && !selectedIds.has(dlcWeapon.id)) selectId(dlcWeapon.id)
            else if (item.id === 'minihorse') selectId('hats')
          }
        // falls through: the passive itself still has to be selected
        default:
          selectedIds.add(item.id)
      }
    }

    function unselectId(itemId) {
      const item = itemsById[itemId]
      if (!item) return
      if (item.type === 'evolution') {
        for (const ingredientId of item.weaponIds.concat(item.evolutionIds)) unselectId(ingredientId)
        return
      }
      if (item.fixed) return
      selectedIds.delete(item.id)
      if (item.type === 'weapon') {
        const dlcWeapon = item.items.find((it) => it.dlc3)
        if (dlcWeapon) unselectId(dlcWeapon.id)
        else if (item.id === 'hats') unselectId('minihorse')
      }
    }

    function reset() {
      selectedIds.clear()
    }

    /* ---- hash <-> selection ---- */

    function readHash() {
      return location.hash.substring(1).split(',').filter(Boolean)
    }

    function writeHash() {
      const ordered = (selectedCharacter.value.id ? [selectedCharacter.value] : [])
        .concat(selectedWeapons.value, selectedPassives.value, selectedArcanas.value, selectedStage.value)
        .map((item) => item.id)
        .filter(Boolean)
        .join()
      if ('#' + ordered === location.hash) return
      // assigning location.hash scrolls to the (non-existent) anchor, so pin the scroll
      const scrollPosition = document.documentElement.scrollTop
      location.hash = ordered
      document.documentElement.scrollTop = scrollPosition
    }

    window.addEventListener('hashchange', () => {
      selectedIds.clear()
      for (const id of readHash()) selectedIds.add(id)
    })

    /* ---- keep the per-item flags in step with the selection ----
       Registration order is also flush order, so it is kept as it was: trim the arcanas
       first, then refresh the item flags, then swap the character's own weapons. */

    /* Losing a character that granted extra arcana slots drops the surplus arcanas. */
    watch(maxArcanas, (newMax) => {
      for (const arcana of selectedArcanas.value.slice(newMax)) unselectId(arcana.id)
    })

    watch(
      selectedIds,
      () => {
        const stageItemIds = selectedStage.value.itemIds
        for (const item of items) {
          item.selected = selectedIds.has(item.id) || (item.type === 'passive' && stageItemIds.includes(item.id))
          item.fixed = isItemFixed(item)
        }
        const characterItemIds = selectedCharacter.value.itemIds
        for (const evolution of evolutions) {
          evolution.selected = evolution.items.every((item) => item.selected) || characterItemIds.includes(evolution.id)
        }
        for (const weapon of weapons) {
          weapon.evolved =
            weapon.evolutionId &&
            weapon.evolution.items.every((it) => it.selected) &&
            !characterItemIds.includes(weapon.evolutionId) &&
            !characterItemIds.includes(weapon.evolution?.evolutionId)
        }
        for (const evolution of evolutions) {
          evolution.evolved = evolution.evolutionId && (evolution.evolution.items.every((it) => it.selected) || characterItemIds.includes(evolution.evolutionId))
        }
        writeHash()
      },
      { immediate: true }
    )

    watch(
      selectedCharacter,
      (newCharacter, oldCharacter) => {
        if (oldCharacter) {
          if (oldCharacter.id === 'sigma') {
            for (const arcana of selectedArcanas.value.slice(DEFAULT_MAX_ARCANAS)) unselectId(arcana.id)
          }
          for (const itemId of oldCharacter.itemIds) {
            if (itemsById[itemId]?.type === 'weapon') unselectId(itemId)
          }
        }
        if (CHARACTERS_WITHOUT_STARTING_WEAPON.includes(newCharacter.id)) return
        for (const itemId of newCharacter.itemIds) {
          const type = itemsById[itemId]?.type
          if (type === 'weapon' || type === 'passive') selectId(itemId)
        }
      },
      { immediate: true }
    )

    return {
      selectedIds,
      selectedItems,
      selectedCharacter,
      selectedStage,
      selectedWeapons,
      selectedPassives,
      selectedArcanas,
      pickedPassives,
      extraPassives,
      stagePassives,
      evolvedWeapons,
      counterpartsWeapons,
      extraOpenWeaponSlots,
      maxArcanas,
      isItemFixed,
      selectId,
      unselectId,
      reset,
    }
  }
})(window.VSP)
