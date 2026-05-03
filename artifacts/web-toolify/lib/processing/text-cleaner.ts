/**
 * Text Cleaner — safe Unicode character-class construction.
 *
 * IMPORTANT: SCRIPT_RANGES stores raw character-class *contents* (no outer []).
 * They are injected directly into a single [^…] pattern to avoid the
 * "Lone quantifier brackets" error that occurs when a regex source containing
 * its own outer brackets is nested inside another character class.
 */

const SCRIPT_RANGES: Record<string, string> = {
  latin:      '\u0041-\u007A\u00C0-\u024F\u1E00-\u1EFF',
  arabic:     '\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF',
  hebrew:     '\u0590-\u05FF\uFB1D-\uFB4F',
  cyrillic:   '\u0400-\u04FF\u0500-\u052F',
  cjk:        '\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF',
  japanese:   '\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F',
  hangul:     '\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF',
  devanagari: '\u0900-\u097F\uA8E0-\uA8FF',
  bengali:    '\u0980-\u09FF',
  tamil:      '\u0B80-\u0BFF',
  telugu:     '\u0C00-\u0C7F',
  kannada:    '\u0C80-\u0CFF',
  malayalam:  '\u0D00-\u0D7F',
  gujarati:   '\u0A80-\u0AFF',
  gurmukhi:   '\u0A00-\u0A7F',
  oriya:      '\u0B00-\u0B7F',
  thai:       '\u0E00-\u0E7F',
  lao:        '\u0E80-\u0EFF',
  myanmar:    '\u1000-\u109F\uAA60-\uAA7F',
  khmer:      '\u1780-\u17FF\u19E0-\u19FF',
  georgian:   '\u10A0-\u10FF\u2D00-\u2D2F',
  armenian:   '\u0530-\u058F\uFB13-\uFB17',
  greek:      '\u0370-\u03FF\u1F00-\u1FFF',
  ethiopic:   '\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF',
  sinhala:    '\u0D80-\u0DFF',
  mongolian:  '\u1800-\u18AF',
  syriac:     '\u0700-\u074F',
  tibetan:    '\u0F00-\u0FFF',
}

/**
 * Universal characters always preserved regardless of language:
 * digits, whitespace, common punctuation, brackets.
 * Written as raw character-class content (no outer []).
 */
const UNIVERSAL_KEEP =
  '0-9' +
  '\\s\\r\\n\\t' +
  '.,!?;:\\-' +
  '()\\[\\]' +
  '\\/\\\\' +
  '\\u2013\\u2014' +          // en-dash, em-dash
  '\\u2018\\u2019' +          // curly apostrophes
  '\\u201C\\u201D' +          // curly double quotes
  '\'"' +                     // straight quotes
  '\\u00AB\\u00BB' +          // guillemets
  '@#%+&=_~|^*' +
  '\\uFEFF'                   // BOM / zero-width no-break space

const LANGUAGE_TO_SCRIPTS: Record<string, string[]> = {
  ara: ['arabic'],
  fas: ['arabic'],
  urd: ['arabic'],
  pus: ['arabic'],
  snd: ['arabic'],
  uig: ['arabic'],
  div: ['arabic'],
  heb: ['hebrew'],
  yid: ['hebrew'],
  rus: ['cyrillic'],
  ukr: ['cyrillic'],
  bul: ['cyrillic'],
  mkd: ['cyrillic'],
  bel: ['cyrillic'],
  srp: ['cyrillic'],
  kaz: ['cyrillic'],
  kir: ['cyrillic'],
  mon: ['cyrillic'],
  tat: ['cyrillic'],
  tgk: ['cyrillic'],
  uzb: ['cyrillic'],
  uzb_cyrl: ['cyrillic'],
  chi_sim: ['cjk'],
  chi_tra: ['cjk'],
  jpn: ['japanese'],
  jpn_vert: ['japanese'],
  kor: ['hangul', 'cjk'],
  kor_vert: ['hangul', 'cjk'],
  hin: ['devanagari'],
  mar: ['devanagari'],
  nep: ['devanagari'],
  san: ['devanagari'],
  ben: ['bengali'],
  asm: ['bengali'],
  tam: ['tamil'],
  tel: ['telugu'],
  kan: ['kannada'],
  mal: ['malayalam'],
  guj: ['gujarati'],
  pan: ['gurmukhi'],
  ori: ['oriya'],
  tha: ['thai'],
  lao: ['lao'],
  mya: ['myanmar'],
  khm: ['khmer'],
  kat: ['georgian'],
  hye: ['armenian'],
  ell: ['greek'],
  grc: ['greek'],
  amh: ['ethiopic'],
  tir: ['ethiopic'],
  sin: ['sinhala'],
  syr: ['syriac'],
}

/**
 * Builds a character-class negation pattern [^…] that rejects all
 * characters outside the given scripts plus universal safe characters.
 * All input is raw character-class content, never wrapped regex objects,
 * so no bracket-nesting issues can occur.
 */
function buildAllowPattern(scripts: string[]): RegExp {
  const parts: string[] = []
  for (const s of scripts) {
    const range = SCRIPT_RANGES[s]
    if (range) parts.push(range)
  }
  parts.push(UNIVERSAL_KEEP)
  // Safe: everything in `parts` is raw char-class content, no outer []
  return new RegExp(`[^${parts.join('')}]`, 'gu')
}

export function cleanOcrText(text: string, langCode: string): string {
  if (!text) return ''

  const primaryLang = langCode.split('+')[0].trim()
  const scripts = LANGUAGE_TO_SCRIPTS[primaryLang]

  let cleaned = text

  // 1. Remove replacement characters and invisible Unicode control chars
  cleaned = cleaned.replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
  cleaned = cleaned.replace(/[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2060-\u206F]/g, '')

  // 2. Script-aware noise removal (only when we have a known script mapping)
  if (scripts && scripts.length > 0) {
    const noisePattern = buildAllowPattern(scripts)
    cleaned = cleaned.replace(noisePattern, '')
  }

  // 3. Collapse runs of 3+ identical non-word characters (OCR duplication noise)
  cleaned = cleaned.replace(/([^\w\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF])\1{2,}/g, '$1')

  // 4. Normalize whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .trim()

  return cleaned
}
