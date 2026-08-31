/* Derives the impact graph shown on each tile from the static table in data/impacts.js.
   On top of that table it adds
     - the reverse link (if a weapon wants Might, Spinach lists that weapon), and
     - the conditional impacts that only exist because of the current selection
       (an arcana that is picked, the character's own weapons, free weapon slots). */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'
  const { computed } = Vue

  /* Arcanas that grant extra stats to a fixed list of weapons while they are picked. */
  const ARCANA_BONUSES = [
    {
      arcanaId: 'arcana14',
      itemIds: ['magicwand', 'magicwand_', 'runetracer', 'runetracer_', 'bracelet', 'bracelet_', 'bracelet__', 'guns2', 'guns4', 'bird3', 'prism', 'prism_'],
      grants: ['+luck', '+duration'],
    },
    {
      arcanaId: 'arcana16',
      itemIds: ['knife', 'knife_', 'whip', 'whip_', 'axe', 'axe_', 'vento', 'vento_', 'cross_', 'sword', 'muramasa_', 'eskizzibur', 'eskizzibur_', 'arrow', 'arrow_', 'fandango_', 'tongue_', 'miniimpostor'],
      grants: ['+luck'],
    },
    {
      arcanaId: 'arcana21',
      itemIds: ['garlic', 'garlic_', 'pentagram', 'pentagram_', 'mana', 'mana_', 'lancet', 'laurel'],
      grants: ['+amount', '+magnet'],
    },
    {
      arcanaId: 'arcana2',
      itemIds: ['bible', 'bible_', 'lightning', 'lightning_', 'bird1', 'bird2', 'runetracer', 'pinion', 'bone', 'flowers', 'bracelet_', 'bracelet__', 'wind', 'wind_', 'prism', 'prism_', 'miniengineer', 'minishapeshifter'],
      grants: ['+curse'],
    },
    {
      arcanaId: 'arcana9',
      itemIds: ['cross', 'bible', 'garlic', 'water', 'lightning', 'mana', 'vento', 'sword', 'wind', 'minicrewmate', 'miniengineer', 'miniscientist'],
      grants: ['+armor'],
    },
  ]

  /* Stage relics and Torrona's Box amplify anything that already scales with these. */
  const AMPLIFIERS = [
    { when: ['+area', '+duration'], grants: '+ring1' },
    { when: ['+curse'], grants: '+ring2' },
    { when: ['+recovery', '+health'], grants: '+sign1' },
    { when: ['+might', '+speed', '+duration', '+area'], grants: '+torrona' },
    { when: ['+amount', '+revival'], grants: '+badge' },
  ]

  const MAX_WEAPON_SLOTS = 6

  VSP.createImpacts = function createImpacts(catalog, selection) {
    const { itemsById } = catalog
    const { selectedIds, selectedCharacter, evolvedWeapons, isItemFixed } = selection

    return computed(() => {
      // the table is mutated below, so start from a copy of it
      const impactsById = {}
      for (const [id, impacts] of Object.entries(window.vs.impacts)) impactsById[id] = impacts.slice()

      const freeWeaponSlots = evolvedWeapons.value.length < MAX_WEAPON_SLOTS

      for (const itemId of Object.keys(impactsById)) {
        const impactIds = impactsById[itemId]
        const item = itemsById[itemId]
        if (!item) {
          console.warn(`data/impacts.js refers to an unknown item: ${itemId}`)
          continue
        }

        for (const bonus of ARCANA_BONUSES) {
          if (selectedIds.has(bonus.arcanaId) && bonus.itemIds.includes(itemId)) impactIds.push(...bonus.grants)
        }
        // Arcana X (Beginning of an End) upgrades the character's own weapons
        if (item.id === 'arcana10' && selectedCharacter.value.id) {
          const characterId = selectedCharacter.value.id
          const rerollsWholeBuild = (evolvedWeapons.value.length && characterId === 'trouser') || characterId === 'random'
          if (rerollsWholeBuild) {
            // Random starts with nothing at all, so there may be no first weapon yet
            const first = evolvedWeapons.value[0]
            if (first) impactIds.push(`+${first.id}`)
          } else {
            for (const weapon of selectedCharacter.value.items) {
              if (!isItemFixed(weapon)) continue
              impactIds.push(`+${weapon.id}`)
              if (weapon.evolution) {
                impactIds.push(`+${weapon.evolution.id}`)
                if (weapon.evolution.evolution) impactIds.push(`+${weapon.evolution.evolution.id}`)
              }
            }
          }
        }

        // Arcana XX (Silent Old Sanctuary) pays off only while weapon slots are free
        if (item.id === 'arcana20' && freeWeaponSlots) impactIds.push('+cooldown', '+might')
        if ((item.type === 'weapon' || item.type === 'evolution') && freeWeaponSlots && (impactIds.includes('+cooldown') || impactIds.includes('+might'))) {
          impactIds.push('+arcana20')
        }

        /* Arcana IX (Divine Bloodline) converts Might into Health.
           NOTE: the original test was `impactIds.includes('+might', '-might', '~might',
           '!might')`. Array.includes takes (value, fromIndex), so every argument after
           the first was silently ignored and only '+might' ever matched. Widening it to
           all four is kept out on purpose: an item that *lowers* Might would then be
           marked as benefiting from Health, which is probably backwards. Behaviour is
           left exactly as it shipped until the intended rule is settled. */
        if (selectedIds.has('arcana9') && item.id !== 'torrona' && impactIds.includes('+might')) {
          impactIds.push('+health')
        }

        if (item.type === 'weapon' || item.type === 'evolution' || item.type === 'passive') {
          for (const amplifier of AMPLIFIERS) {
            if (amplifier.when.some((impact) => impactIds.includes(impact))) impactIds.push(amplifier.grants)
          }
        }

        // TODO: minnah does not benefit from the dynamic arcanas (V), (XVII), (XVIII)

        // mirror every impact back onto the item it points at
        for (const impactId of impactIds) {
          const targetId = impactId.substring(1)
          const backLink = impactId[0] + itemId
          impactsById[targetId] = impactsById[targetId] || []
          if (!impactsById[targetId].includes(backLink)) impactsById[targetId].push(backLink)
        }
      }

      // selected items sink to the bottom of each tile's impact strip
      const isSelected = (impactId) => !!itemsById[impactId.substring(1)]?.selected
      for (const itemId in impactsById) {
        impactsById[itemId].sort((a, b) => (isSelected(a) ? 1 : 0) - (isSelected(b) ? 1 : 0))
      }

      return impactsById
    })
  }
})(window.VSP)
