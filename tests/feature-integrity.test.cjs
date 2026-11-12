const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scripts = [
  'script-builder.js',
  'shorts-planner.js',
  'viral-research.js',
  'viral-content-pack.js'
];

test('all feature scripts exist and parse as JavaScript', () => {
  for (const file of scripts) {
    const fullPath = path.join(root, file);
    assert.ok(fs.existsSync(fullPath), file + ' should exist');
    const source = fs.readFileSync(fullPath, 'utf8');
    assert.ok(source.trim().length > 0, file + ' should not be empty');
    assert.doesNotThrow(() => new vm.Script(source, { filename: file }), file + ' should parse');
  }
});

test('index.html loads every feature script', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const file of scripts) {
    assert.ok(html.includes('src="./' + file + '"'), 'index.html should load ' + file);
  }
});

test('existing video production endpoint remains configured', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('workers.dev/produce'), 'video production endpoint should remain present');
});
