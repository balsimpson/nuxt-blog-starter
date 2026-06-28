import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAccessAdminPath,
  getAllowedPages,
  isUserRole,
  normalizeEmail
} from '../shared/admin-access.ts'

test('normalizes invitation email addresses', () => {
  assert.equal(normalizeEmail('  Editor@Example.COM '), 'editor@example.com')
})

test('accepts only configured roles', () => {
  assert.equal(isUserRole('viewer'), true)
  assert.equal(isUserRole('editor'), true)
  assert.equal(isUserRole('admin'), true)
  assert.equal(isUserRole('owner'), false)
})

test('derives page access from the assigned role', () => {
  assert.deepEqual(getAllowedPages('viewer'), ['/admin'])
  assert.equal(getAllowedPages('editor').includes('/admin/editor'), true)
  assert.equal(getAllowedPages('editor').includes('/admin/users'), false)
  assert.equal(getAllowedPages('admin').includes('/admin/users'), true)
})

test('does not let the admin root grant every nested route', () => {
  assert.equal(canAccessAdminPath({
    role: 'viewer',
    allowedPages: getAllowedPages('viewer')
  }, '/admin'), true)
  assert.equal(canAccessAdminPath({
    role: 'viewer',
    allowedPages: getAllowedPages('viewer')
  }, '/admin/editor'), false)
})
