// js/simulation.js — Fake blockchain simulation helpers
'use strict';

function fakeDelay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fakeTxHash() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return '0x' + Array.from(a).map(b => b.toString(16).padStart(2,'0')).join('');
}

function fakeAddress() {
  const a = new Uint8Array(20);
  crypto.getRandomValues(a);
  return '0x' + Array.from(a).map(b => b.toString(16).padStart(2,'0')).join('');
}

function nextSimBlock() {
  APP.simFakeBlockNum += Math.floor(Math.random() * 3) + 1;
  return APP.simFakeBlockNum;
}

function fakeGas() {
  return (Math.floor(Math.random() * 80000) + 120000).toString();
}
