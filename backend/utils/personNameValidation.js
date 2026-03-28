/** Student / person display names: letters (any language) and spaces between words only. */

export const PERSON_NAME_MIN = 3
export const PERSON_NAME_MAX = 100

const WORDS_LETTERS_ONLY = /^[\p{L}]+(?: [\p{L}]+)*$/u

/**
 * @param {string} name - already trimmed / normalized (single spaces)
 */
export function validatePersonNameNormalized(name) {
  if (!name) {
    return { ok: false, message: 'Student name is required.', value: name }
  }
  if (/\d/.test(name)) {
    return { ok: false, message: 'Student name cannot contain numbers.', value: name }
  }
  if (/[^\p{L} ]/u.test(name)) {
    return {
      ok: false,
      message: 'Student name can only contain letters and spaces (no numbers or symbols).',
      value: name,
    }
  }
  if (name.length < PERSON_NAME_MIN) {
    return {
      ok: false,
      message: `Student name must be at least ${PERSON_NAME_MIN} characters.`,
      value: name,
    }
  }
  if (name.length > PERSON_NAME_MAX) {
    return {
      ok: false,
      message: `Student name must be at most ${PERSON_NAME_MAX} characters.`,
      value: name,
    }
  }
  if (!WORDS_LETTERS_ONLY.test(name)) {
    return {
      ok: false,
      message: 'Use letters and spaces between words only.',
      value: name,
    }
  }
  return { ok: true, value: name }
}
