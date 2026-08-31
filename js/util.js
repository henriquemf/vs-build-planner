/* Shared constants and small helpers. Loaded first; everything else builds on it. */
window.VSP = window.VSP || {}
;(function (VSP) {
  'use strict'

  /* Every DLC flag an item can carry, in release order.
     Supporting a new DLC means: add its flag here, add a `.dlcN` colour to css/app.css
     and a toggle button to index.html. Nothing else in the app hard-codes a DLC. */
  VSP.DLC_FLAGS = ['dlc1', 'dlc2', 'dlc3', 'dlc4', 'dlc5', 'dlc6', 'dlc7', 'dlc8']

  /* No item carries more than one flag, so the DLC is a single class name we can
     precompute once instead of re-deriving eight bindings per item per render. */
  VSP.dlcClassOf = function dlcClassOf(item) {
    return VSP.DLC_FLAGS.find((flag) => item[flag]) || ''
  }

  VSP.isVisibleWith = function isVisibleWith(item, config) {
    return !item.dlcClass || config[item.dlcClass]
  }

  VSP.toRoman = function toRoman(number) {
    const roman = { X: 10, IX: 9, V: 5, IV: 4, I: 1 }
    let result = ''
    for (const numeral of Object.keys(roman)) {
      const q = Math.floor(number / roman[numeral])
      number -= q * roman[numeral]
      result += numeral.repeat(q)
    }
    return result || 'O'
  }

  /* Flash a button green (ok) or red (failed) for 200ms. */
  VSP.highlightElement = function highlightElement(target, color = '#3c3') {
    if (!target) return
    target.style.color = color
    setTimeout(() => {
      target.style.color = ''
    }, 200)
  }

  /* Wrap a clipboard/download promise so the button reports the outcome. */
  VSP.reportOn = function reportOn(target, promise) {
    return Promise.resolve(promise).then(
      () => VSP.highlightElement(target, '#3c3'),
      () => VSP.highlightElement(target, '#c33')
    )
  }
})(window.VSP)
