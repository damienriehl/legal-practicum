/* Exercise validation timing and export guards without browser storage. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const H = require('../../app/hours/hours-core.js');
class Element {
  constructor() { this.listeners = {}; this.children = []; this.textContent = ''; this.className = ''; this.value = ''; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  appendChild(child) { this.children.push(child); return child; }
  remove() {}
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); }
  get firstChild() { return this.children[0]; }
  click() { if (this.listeners.click) this.listeners.click.call(this); }
  input(value) { this.value = value; this.listeners.input.call(this); }
}
const nodes = new Map();
const node = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
const mode = new Element();
mode.getAttribute = () => 'session';
const records = new Map();
const storage = {getItem: key => records.get(key) || null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key)};
let downloads = 0;
const document = {
  getElementById: node, querySelectorAll: () => [mode],
  createElement: () => new Element(), body: new Element(),
};
const context = {document, window: {HoursLog: H, sessionStorage: storage, confirm: () => true},
  setTimeout: fn => fn(), Blob, URL: {createObjectURL: () => { downloads++; return 'blob:synthetic'; }, revokeObjectURL: () => {}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../app/hours/hours.js'), 'utf8'), context);
mode.click();
assert.equal(node('validation').textContent, '');
node('next-week').click();
assert.equal(node('validation').textContent, '');
node('previous-week').click();
assert.equal(node('validation').textContent, '');
for (const id of ['export-json', 'export-csv', 'export-clear']) {
  node(id).click();
  assert.match(node('validation').textContent, /3 issue/);
  assert.equal(node('validation').className, 'error');
  assert.equal(downloads, 0);
  node('clear').click();
  assert.equal(node('validation').textContent, '');
  assert.equal(node('validation').className, '');
}
node('learner-id').input('learner-synthetic');
assert.match(node('validation').textContent, /2 issue/);
node('offering-id').input('offering-synthetic');
assert.equal(node('validation').textContent, 'Ready to export.');
node('add-entry').click();
node('export-json').click();
assert.equal(downloads, 0);
const entry = node('entries').children[0];
const grid = entry.children[1];
for (const [index, value] of [[1, 'Project'], [2, 'Matter'], [3, 'Drafting'], [4, '1'], [5, '1']]) {
  grid.children[index].children[0].input(value);
}
entry.children[2].children[0].input('Synthetic work narrative.');
assert.equal(node('validation').textContent, 'Ready to export.');
assert.equal(node('validation').className, '');
node('export-json').click();
assert.equal(downloads, 1);
node('next-week').click();
assert.equal(node('validation').className, '');
node('previous-week').click();
assert.equal(node('validation').textContent, 'Ready to export.');
console.log('PASS hours validation timing, recovery, navigation, clear, and export guards');
