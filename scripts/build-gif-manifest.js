/* Lists the character walk animations that actually exist, into data/character-gifs.js.
   The app preloads only these, so characters without one are never requested.
   Run after adding or removing anything in img/characters/:  node scripts/build-gif-manifest.js */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const GIF_DIR = path.join(ROOT, 'img', 'characters')
const OUT = path.join(ROOT, 'data', 'character-gifs.js')

const ids = fs
  .readdirSync(GIF_DIR)
  .filter((file) => file.endsWith('.gif'))
  .map((file) => file.slice(0, -4))
  .sort()

const contents = [
  '/* Characters that have a walk animation in img/characters/<id>.gif.',
  '   Regenerate with: node scripts/build-gif-manifest.js */',
  'window.vs = window.vs || {}',
  'window.vs.characterGifs = [',
  ...ids.map((id) => `  '${id}',`),
  ']',
  '',
].join('\n')

fs.writeFileSync(OUT, contents)
console.log(`data/character-gifs.js: ${ids.length} animations`)

/* Report characters still waiting for one, if the dataset is loadable. */
try {
  global.window = {}
  for (const file of fs.readdirSync(path.join(ROOT, 'data'))) require(path.join(ROOT, 'data', file))
  const have = new Set(ids)
  const missing = window.vs.characters.filter((character) => !have.has(character.id))
  if (missing.length) console.log(`${missing.length} character(s) have no animation yet: ${missing.map((c) => c.id).join(' ')}`)
} catch (error) {
  console.log('(could not cross-check against data/:', error.message + ')')
}
