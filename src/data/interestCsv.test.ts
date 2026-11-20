import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { buildInterestCsvFilename, escapeCsvCell, serializeInterestMapCsv } from './interestCsv.ts'

/** Minimal RFC 4180 CSV parser to verify round-trip spreadsheet compatibility. */
function parseCsv(content: string): string[][] {
  const text = content.startsWith('\uFEFF') ? content.slice(1) : content
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i += 1
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

describe('interestCsv (#94)', () => {
  test('encodes UTF-8 BOM, preserves Cyrillic/Kazakh, commas, quotes, newlines, exact order, and two columns only', () => {
    const topics = [
      { topic: 'Қазақша, Бэкенд', count: 14 },
      { topic: 'AI "Agents"', count: 9 },
      { topic: 'Платформа\nSRE', count: 4 },
    ]
    const csv = serializeInterestMapCsv(topics, { topic: 'Тема', participants: 'Участников' })

    assert.ok(csv.startsWith('\uFEFF'), 'CSV should start with UTF-8 BOM for spreadsheet Cyrillic compatibility')
    const rows = parseCsv(csv)
    assert.deepEqual(rows, [
      ['Тема', 'Участников'],
      ['Қазақша, Бэкенд', '14'],
      ['AI "Agents"', '9'],
      ['Платформа\nSRE', '4'],
    ])
    for (const row of rows) {
      assert.equal(row.length, 2)
    }
  })

  test('neutralizes spreadsheet formula prefixes so values stay plain text', () => {
    const dangerous = [
      '=SUM(A1:A2)',
      '+cmd|\' /C calc\'!A0',
      '-2+3',
      '@HYPERLINK("https://evil.test")',
      '\t=1+1',
      ' =1+1',
    ]

    for (const raw of dangerous) {
      const escaped = escapeCsvCell(raw)
      const parsed = parseCsv(`${escaped},1\r\n`)[0][0]
      assert.ok(parsed.startsWith("'"), `Expected formula-like value ${JSON.stringify(raw)} to be quoted as text`)
      assert.equal(parsed.slice(1), raw)
    }
  })

  test('handles empty state and produces event-scoped exports and filenames', () => {
    const emptyCsv = serializeInterestMapCsv([], { topic: 'Topic', participants: 'Participants' })
    assert.deepEqual(parseCsv(emptyCsv), [['Topic', 'Participants']])

    const eventACsv = serializeInterestMapCsv([{ topic: 'Go', count: 7 }], { topic: 'Тема', participants: 'Участников' })
    const eventBCsv = serializeInterestMapCsv([{ topic: 'Design', count: 3 }], { topic: 'Тема', participants: 'Участников' })
    assert.doesNotMatch(eventBCsv, /Go/)
    assert.match(eventACsv, /Go,7/)
    assert.equal(buildInterestCsvFilename('Qazaq IT Meetup #1', 'evt-1'), 'tanys-interests-qazaq-it-meetup-1.csv')
    assert.equal(buildInterestCsvFilename('   ', 'evt-2'), 'tanys-interests-evt-2.csv')
  })
})
