import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fmtZAR, taxYearStart, CATEGORIES, CATEGORY_BY_ID, GROUP_BY_ID } from '../shared/domain.ts'

test('money formatting', () => {
  assert.equal(fmtZAR(-1302.84), '-R1,302.84')
  assert.equal(fmtZAR(10000), 'R10,000.00')
  assert.equal(fmtZAR(10000, { sign: true }), '+R10,000.00')
})

test('SA tax year starts 1 March', () => {
  assert.equal(taxYearStart(new Date('2026-02-10')), '2025-03-01')
  assert.equal(taxYearStart(new Date('2026-03-01')), '2026-03-01')
})

test('every category points at a real group and ids are unique', () => {
  for (const c of CATEGORIES) assert.ok(GROUP_BY_ID[c.group], c.name)
  assert.equal(Object.keys(CATEGORY_BY_ID).length, CATEGORIES.length)
})
