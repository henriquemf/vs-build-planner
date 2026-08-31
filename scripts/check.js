/* Pre-push sanity check for the whole tree. Plain Node, no dependencies:
     node scripts/check.js
   Exits non-zero if anything is broken, so it also works in a git hook or CI. */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.join(__dirname, '..')
const problems = []
const notes = []
const fail = (msg) => problems.push(msg)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))

/* ---------- 1. every script parses ---------- */
const sourceFiles = [...fs.readdirSync(path.join(ROOT, 'data')).map((f) => 'data/' + f), ...fs.readdirSync(path.join(ROOT, 'js')).map((f) => 'js/' + f)]
for (const rel of sourceFiles) {
  try {
    new vm.Script(read(rel), { filename: rel })
  } catch (error) {
    fail(`${rel} does not parse: ${error.message}`)
  }
}

/* ---------- 2. the data loads and hangs together ---------- */
const sandbox = { window: {}, console }
sandbox.globalThis = sandbox
for (const rel of sourceFiles.filter((f) => f.startsWith('data/'))) {
  try {
    vm.runInNewContext(read(rel), sandbox, { filename: rel })
  } catch (error) {
    fail(`${rel} threw while loading: ${error.message}`)
  }
}
const vs = sandbox.window.vs || {}
const collections = Object.keys(vs).filter((k) => Array.isArray(vs[k]) && k !== 'characterGifs')

const itemsById = {}
for (const name of collections) {
  const seen = new Set()
  for (const item of vs[name]) {
    if (!item.id) fail(`${name}: an entry has no id`)
    if (seen.has(item.id)) fail(`${name}: duplicate id "${item.id}"`)
    seen.add(item.id)
    if (!item.name) fail(`${name}/${item.id}: has no name`)
    itemsById[item.id] = { ...item, collection: name }
  }
}

for (const name of collections) {
  for (const item of vs[name]) {
    for (const ref of item.itemIds || []) {
      if (!itemsById[ref]) fail(`${name}/${item.id}: itemIds points at "${ref}", which does not exist`)
    }
  }
}

/* an evolution needs at least one weapon or evolution to be built from */
const EQUIP = ['weapons', 'evolutions', 'passives', 'powerups', 'counterparts']
for (const evolution of vs.evolutions || []) {
  const parts = (evolution.itemIds || []).map((id) => itemsById[id]).filter(Boolean)
  if (!parts.length) fail(`evolutions/${evolution.id}: empty itemIds`)
  else if (!parts.some((p) => p.collection === 'weapons' || p.collection === 'evolutions')) fail(`evolutions/${evolution.id}: no base weapon in itemIds`)
  const odd = parts.filter((p) => !EQUIP.includes(p.collection))
  if (odd.length) fail(`evolutions/${evolution.id}: itemIds contains non-equipment (${odd.map((p) => `${p.id} is a ${p.collection}`).join(', ')})`)
}

/* a character starts with equipment, or with a permanently granted arcana
   (Avatar Infernas and Arcana XIX) */
const CHARACTER_START = EQUIP.concat('arcanas')
for (const character of vs.characters || []) {
  for (const ref of character.itemIds || []) {
    const item = itemsById[ref]
    if (item && !CHARACTER_START.includes(item.collection)) fail(`characters/${character.id}: starts with "${ref}", which is a ${item.collection}`)
  }
}

/* ---------- 3. sprites ---------- */
const iconCss = read('css/icons.css')
if ((iconCss.match(/\{/g) || []).length !== (iconCss.match(/\}/g) || []).length) fail('css/icons.css: unbalanced braces')

const spriteIds = new Set([...iconCss.matchAll(/^\.icon-(\S+)\s*\{/gm)].map((m) => m[1]))
const unsprited = Object.values(itemsById).filter((item) => !spriteIds.has(item.id))
if (unsprited.length) notes.push(`${unsprited.length} item(s) render as a "?" placeholder: ${unsprited.map((i) => i.collection + '/' + i.id).join(' ')}`)

const unusedRules = [...spriteIds].filter((id) => !itemsById[id])
if (unusedRules.length) notes.push(`${unusedRules.length} .icon- rule(s) match no item: ${unusedRules.join(' ')}`)

for (const m of iconCss.matchAll(/url\("\.\.\/([^"]+)"\)/g)) {
  if (!exists(m[1])) fail(`css/icons.css points at ${m[1]}, which is missing`)
}

/* ---------- 4. index.html wiring ---------- */
const html = read('index.html')
const tagged = [...html.matchAll(/<script[^>]+src="\.\/([^"]+)"/g)].map((m) => m[1])
for (const m of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  if (!exists(m[1])) fail(`index.html references ./${m[1]}, which is missing`)
}
for (const rel of sourceFiles) {
  if (!tagged.includes(rel)) fail(`${rel} exists but index.html has no <script> tag for it`)
}
for (const rel of tagged) {
  if (/^(data|js)\//.test(rel) && !sourceFiles.includes(rel)) fail(`index.html loads ./${rel}, which is not in data/ or js/`)
}
if (!/vue\.global\.prod\.js/.test(html)) fail('index.html is not on the production Vue build')
for (const tag of html.match(/<script[^>]+src="[^"]+"[^>]*>/g) || []) {
  if (!/\bdefer\b|\basync\b/.test(tag)) fail(`a script tag is not deferred: ${tag.slice(0, 80)}`)
}

/* ---------- 5. character animations ---------- */
const gifs = fs
  .readdirSync(path.join(ROOT, 'img', 'characters'))
  .filter((f) => f.endsWith('.gif'))
  .map((f) => f.slice(0, -4))
const manifest = sandbox.window.vs.characterGifs || []
const missingFromManifest = gifs.filter((id) => !manifest.includes(id))
const staleInManifest = manifest.filter((id) => !gifs.includes(id))
if (missingFromManifest.length || staleInManifest.length) {
  fail(`data/character-gifs.js is out of date (run: node scripts/build-gif-manifest.js)` + (missingFromManifest.length ? ` — not listed: ${missingFromManifest.join(' ')}` : '') + (staleInManifest.length ? ` — listed but absent: ${staleInManifest.join(' ')}` : ''))
}

/* ---------- report ---------- */
const total = Object.keys(itemsById).length
console.log(`${collections.length} collections, ${total} items, ${spriteIds.size} sprite rules, ${gifs.length} animations`)
for (const note of notes) console.log('note: ' + note)
if (!problems.length) {
  console.log('OK — nothing broken')
  process.exit(0)
}
console.log(`\n${problems.length} problem(s):`)
for (const p of problems) console.log('  - ' + p)
process.exit(1)
