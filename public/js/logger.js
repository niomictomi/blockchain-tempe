// js/logger.js — Log management + export to file
'use strict';

const LOG_ENTRIES = [];  // { ts, msg, type, step }

function logRecord(msg, type, step) {
  LOG_ENTRIES.push({ ts: new Date().toISOString(), msg, type: type||'info', step: step||'' });
}

function exportLogs() {
  const session = {
    exportedAt: new Date().toISOString(),
    mode: APP.SIM_MODE ? 'SIMULATION' : 'REAL (MetaMask)',
    alice: APP.aliceAddress || '-',
    bob:   APP.bobAddress   || '-',
    contract: APP.CONTRACT_ADDRESS || '-',
    totalBlocks: APP.blockRegistry.length,
    totalTx: APP.txTotal,
  };

  const header = [
    '='.repeat(70),
    ' SECURE DOCUMENT TRANSFER — SESSION LOG',
    ' Exported: ' + session.exportedAt,
    ' Mode    : ' + session.mode,
    ' Alice   : ' + session.alice,
    ' Bob     : ' + session.bob,
    ' Contract: ' + session.contract,
    ' Blocks  : ' + session.totalBlocks + '  |  Transactions: ' + session.totalTx,
    '='.repeat(70),
    ''
  ].join('\n');

  const lines = LOG_ENTRIES.map(e =>
    '[' + e.ts.replace('T',' ').replace('Z','') + ']' +
    (e.step ? ' ['+e.step+']' : '') +
    ' [' + (e.type||'info').toUpperCase().padEnd(5) + '] ' + e.msg
  );

  const blockSection = [
    '',
    '='.repeat(70),
    ' BLOCK REGISTRY',
    '='.repeat(70),
    ...APP.blockRegistry.map(b =>
      'Block #' + b.num + ' (' + b.type + ')' +
      '\n  blockHash : ' + (b.blockHash||'-') +
      '\n  prevHash  : ' + (b.prevHash||'-') +
      '\n  txHash    : ' + (b.txHash||'-') +
      '\n  gasUsed   : ' + (b.gasUsed||'0') +
      '\n  timestamp : ' + (b.timestamp||'-') +
      (b.docHash ? '\n  docHash   : ' + b.docHash : '') +
      (b.from    ? '\n  from      : ' + b.from    : '') +
      (b.to      ? '\n  to        : ' + b.to      : '')
    )
  ];

  const content = header + lines.join('\n') + '\n' + blockSection.join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'blockchain-session-' + Date.now() + '.log';
  a.click();
  URL.revokeObjectURL(url);
}
