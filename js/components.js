/* The pieces the page repeats. Registered globally in js/app.js.

   Templates are strings rather than .vue files on purpose: the project has no build
   step, so the components have to be compiled in the browser. `config`, `itemsById` and
   `impactsById` come through provide/inject instead of props, since every tile needs
   them and none of them ever changes identity. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'
  const { inject, computed } = Vue

  /* The strip of coloured dots along the bottom of a tile. */
  const ImpactStrip = {
    name: 'ImpactStrip',
    props: { itemId: { type: String, required: true } },
    setup(props) {
      const config = inject('config')
      const impactsById = inject('impactsById')
      const itemsById = inject('itemsById')
      const impacts = computed(() => impactsById.value[props.itemId] || [])
      // a dot is only coloured once the item it points at is actually in the build
      const impactClass = (impact) => (itemsById[impact.substring(1)]?.selected ? (impact[0] === '+' ? 'positive' : 'negative') : '')
      return { config, impacts, impactClass }
    },
    template: `
      <div v-if="config.impacts" class="impacts">
        <div v-for="impact in impacts" class="impact" :class="impactClass(impact)" :title="impact.substring(1)"></div>
      </div>`,
  }

  /* The small sprites overlaid on a tile: what it combines with, or what a stage and an
     arcana bring along. `rows` splits them across full-width lines. */
  const CombinationList = {
    name: 'CombinationList',
    props: {
      items: { type: Array, default: () => [] },
      rows: { type: Array, default: null },
    },
    setup(props) {
      return { groups: computed(() => props.rows || [props.items]) }
    },
    template: `
      <div class="items">
        <template v-for="(group, index) in groups">
          <div v-if="index" style="width: 100%"></div>
          <div v-for="item in group" class="icon" :class="'icon-' + item.id" :title="item.title"></div>
        </template>
      </div>`,
  }

  /* One pickable tile in a section grid. Everything below the sprite is a slot, because
     characters, arcanas and stages each decorate it differently. */
  const ObjectTile = {
    name: 'ObjectTile',
    props: {
      item: { type: Object, required: true },
      kind: { type: String, required: true },
      selected: { type: Boolean, default: false },
      center: { type: Boolean, default: false },
      iconStyle: { type: Object, default: null },
    },
    emits: ['select', 'enter', 'leave'],
    template: `
      <div class="object" :class="[kind, item.dlcClass, {selected, special: item.special, center}]" :data-id="item.id" :title="item.title"
           @click="$emit('select', item)" @mouseenter="$emit('enter', item)" @mouseleave="$emit('leave')">
        <div class="icon" :class="'icon-' + item.id" :style="iconStyle"></div>
        <slot></slot>
      </div>`,
  }

  /* One square in the build at the top of the page. With no `item` it renders the slot
     content instead — the "WEAPON" / "ARCANA" placeholder, or the arcana-20 lock. */
  const BuildSlot = {
    name: 'BuildSlot',
    props: {
      item: { type: Object, default: null },
      kind: { type: String, required: true },
      inverse: { type: Boolean, default: false },
    },
    emits: ['remove', 'enter', 'leave'],
    template: `
      <div class="slot" :class="[kind, {inverse}]" :data-id="item ? item.id : null" :title="item ? item.title : null"
           @click="item && $emit('remove')" @mouseenter="item && $emit('enter')" @mouseleave="$emit('leave')">
        <div v-if="item" class="icon" :class="'icon-' + item.id"></div>
        <slot v-else></slot>
      </div>`,
  }

  /* A titled section that folds away when its heading is clicked. */
  const CollapsibleSection = {
    name: 'CollapsibleSection',
    props: {
      name: { type: String, required: true },
      title: { type: String, required: true },
      maxWidth: { type: String, default: '75em' },
    },
    setup(props) {
      const collapsedSections = inject('collapsedSections')
      return {
        collapsed: computed(() => !!collapsedSections[props.name]),
        toggle: () => (collapsedSections[props.name] = !collapsedSections[props.name]),
      }
    },
    template: `
      <h2 @click="toggle"><small :style="{transform: collapsed ? 'none' : 'rotate(90deg)'}">&#9658;</small> {{title}}</h2>
      <Transition name="slidedown">
        <section v-if="!collapsed" :style="{maxWidth}"><slot></slot></section>
      </Transition>`,
  }

  /* An ON/OFF settings button bound to one key of `config`. */
  const ToggleButton = {
    name: 'ToggleButton',
    props: { setting: { type: String, required: true }, label: { type: String, required: true } },
    setup(props) {
      const config = inject('config')
      return { config, toggle: () => (config[props.setting] = !config[props.setting]) }
    },
    template: `
      <span class="button" @click="toggle">{{label}}: <span :class="config[setting] ? 'enabled' : 'disabled'">{{config[setting] ? 'ON' : 'OFF'}}</span></span>`,
  }

  VSP.registerComponents = function registerComponents(app) {
    app.component('ImpactStrip', ImpactStrip)
    app.component('CombinationList', CombinationList)
    app.component('ObjectTile', ObjectTile)
    app.component('BuildSlot', BuildSlot)
    app.component('CollapsibleSection', CollapsibleSection)
    app.component('ToggleButton', ToggleButton)
  }
})(window.VSP)
