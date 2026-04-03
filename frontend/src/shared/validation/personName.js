/** Same rules as backend/utils/personNameValidation.js */

export const PERSON_NAME_MIN = 3
export const PERSON_NAME_MAX = 100

const WORDS_LETTERS_ONLY = /^[\p{L}]+(?: [\p{L}]+)*$/u

export function normalizePersonNameInput(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * @returns {string|undefined} Error message, or undefined if valid / empty (unless blur).
 */
export function getPersonNameError(raw, { blur = false } = {}) {
  const name = normalizePersonNameInput(raw)
  if (!name) return blur ? 'Student name is required.' : undefined
  if (/\d/.test(name)) return 'Student name cannot contain numbers.'
  if (/[^\p{L} ]/u.test(name)) {
    return 'Student name can only contain letters and spaces (no numbers or symbols).'
  }
  if (name.length < PERSON_NAME_MIN) {
    return `Student name must be at least ${PERSON_NAME_MIN} characters.`
  }
  if (name.length > PERSON_NAME_MAX) {
    return `Student name must be at most ${PERSON_NAME_MAX} characters.`
  }
  if (!WORDS_LETTERS_ONLY.test(name)) {
    return 'Use letters and spaces between words only.'
  }
  return undefined
}
