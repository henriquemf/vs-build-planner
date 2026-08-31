/* Turns the raw collections in data/*.js into the single indexed catalogue the rest of
   the app works with: one flat `items` list, an id lookup, and the derived fields
   (type, combinations, evolution links, tooltip) that the data files do not carry. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'
  const { reactive } = Vue

  /* Order matters twice over: it is the order `itemsById` is filled in (later
     collections win a duplicate id) and the order the UI iterates. */
  const COLLECTIONS = ['powerups', 'passives', 'weapons', 'evolutions', 'counterparts', 'arcanas', 'characters', 'stages', 'pickups', 'structures']

  /* Stages that do not spawn the four map relics. */
  const STAGES_WITHOUT_RELICS = ['bridge', 'whiteout', 'batcountry', 'astral', 'space']
  const RELIC_IDS = ['ring1', 'ring2', 'sign1', 'sign2']

  VSP.createCatalog = function createCatalog(source = window.vs) {
    const data = reactive(source)
    const { characters, weapons, evolutions, counterparts, powerups, passives, arcanas, stages, pickups, structures } = data

    const items = COLLECTIONS.flatMap((key) => data[key])
    const itemsById = {}
    for (const item of items) itemsById[item.id] = item

    /* `index` is the tie-breaker used when sorting by impact count: it keeps each
       collection in its authored order and pushes bare items below the ones that
       belong to a combination. */
    for (const item of items) {
      item.index = 0
      item.dlcClass = VSP.dlcClassOf(item)
    }

    for (const character of characters) {
      character.type = 'character'
      character.fullName = [character.prefix, character.name, character.surname].filter(Boolean).join(' ')
    }
    for (const weapon of weapons) {
      weapon.index++
      weapon.type = 'weapon'
    }
    for (const counterpart of counterparts) {
      counterpart.type = 'counterpart'
    }
    for (const passive of passives) {
      passive.index++
      passive.type = 'passive'
    }
    for (const evolution of evolutions) {
      evolution.index++
      evolution.type = 'evolution'
      evolution.weaponIds = evolution.itemIds.filter((id) => itemsById[id].type === 'weapon' || itemsById[id].type === 'evolution')
      evolution.evolutionIds = evolution.itemIds.filter((id) => itemsById[id].type === 'evolution')
      evolution.passiveIds = evolution.itemIds.filter((id) => itemsById[id].type === 'passive')
      for (const itemId of evolution.itemIds) {
        const item = itemsById[itemId]
        item.evolutionId = evolution.id
        // every ingredient learns about its siblings, so a tile can show what it combines with
        if (item.type === 'weapon' || (item.type === 'passive' && item.id !== 'powerup')) {
          item.itemIds = (item.itemIds || []).concat(evolution.itemIds.filter((id) => id !== itemId))
        }
      }
    }
    for (const arcana of arcanas) {
      arcana.index++
      arcana.type = 'arcana'
      arcana.roman = VSP.toRoman(+arcana.id.substring(6) || +arcana.id.substring(7))
    }
    for (const stage of stages) {
      stage.type = 'stage'
      if (!STAGES_WITHOUT_RELICS.includes(stage.id)) stage.itemIds.push(...RELIC_IDS)
      else if (stage.id === 'batcountry') stage.itemIds.push('ring2')
    }

    for (const item of items) {
      item.items = item.itemIds ? item.itemIds.map((id) => itemsById[id]).filter((it) => !(it.type === 'passive' && item.type === 'passive')) : []
      item.evolution = item.evolutionId && itemsById[item.evolutionId]
      item.title = buildTitle(item)
    }

    return { data, characters, weapons, evolutions, counterparts, powerups, passives, arcanas, stages, pickups, structures, items, itemsById }
  }

  function buildTitle(item) {
    const rarity = item.type === 'weapon' || item.type === 'passive' ? ` (Rarity: ${item.rarity || 'Unknown'})` : ''
    const price = item.price ? ` (Price: ${item.price})` : ''
    const description = item.description ? `\n${item.description}` : ''
    return (item.fullName || item.name) + rarity + price + description
  }

  const PLACEHOLDER_ICON =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1.5' y='1.5' width='13' height='13' rx='2' fill='none' stroke='%23fff' stroke-opacity='.25' stroke-dasharray='2 2'/><text x='8' y='11.5' text-anchor='middle' font-family='monospace' font-size='9' fill='%23fff' fill-opacity='.45'>?</text></svg>"

  /* Content can land in data/ before its sprite is extracted into css/icons.css. Rather
     than render those tiles blank, give them a dashed "?" placeholder.

     The rule is inserted *before* the stylesheets, not after: `.icon-<id>` in icons.css
     then wins on source order wherever a real sprite exists. That way an inaccurate scan
     can only leave a placeholder unused — it can never paint over a real icon. */
  VSP.installMissingIconPlaceholder = function installMissingIconPlaceholder(items) {
    const withRules = readIconIds()
    const missing = items.filter((item) => !withRules.has(item.id)).map((item) => item.id)
    if (!missing.length) return missing

    /* Browsers refuse to expose cssRules for a local stylesheet when the page itself came
       from file://, so the scan comes back empty and every item looks unsprited. A result
       that implausible means the scan failed, not that the sprites are gone. */
    if (missing.length > items.length / 2) return []

    const style = document.createElement('style')
    style.textContent = missing.map((id) => `.icon-${id}`).join(',') + `{background-image:url("${PLACEHOLDER_ICON}")}`
    const firstSheet = document.head.querySelector('link[rel="stylesheet"], style')
    document.head.insertBefore(style, firstSheet)
    return missing
  }

  /* Which ids have a rule, read straight off the parsed stylesheets: one pass, no layout
     (the alternative — probing getComputedStyle per item — costs 700+ style recalcs).
     A sheet we are not allowed to read is skipped rather than fatal. */
  function readIconIds() {
    const ids = new Set()
    for (const sheet of document.styleSheets) {
      let rules
      try {
        rules = sheet.cssRules
      } catch (error) {
        continue // cross-origin, or file:// in a strict browser
      }
      for (const rule of rules) {
        const match = rule.selectorText && rule.selectorText.match(/^\.icon-(\S+)$/)
        if (match) ids.add(match[1])
      }
    }
    return ids
  }
})(window.VSP)
