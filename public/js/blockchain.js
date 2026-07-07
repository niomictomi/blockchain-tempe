// js/blockchain.js — Contract interaction (simulation + real MetaMask)
'use strict';

// ── Simulation: deploy ───────────────────────────────────────────────────────

async function simDeploy() {
  await fakeDelay(800);
  log('Menghitung keccak256(bytecode)...', 'sim', 'DEPLOY');
  await fakeDelay(500);
  log('Menyebarkan bytecode ke validator nodes...', 'sim', 'DEPLOY');
  await fakeDelay(900);

  APP.CONTRACT_ADDRESS = fakeAddress();
  const block = nextSimBlock();
  const txH   = fakeTxHash();
  const gas   = fakeGas();

  log('✅ Kontrak di-deploy!', 'ok', 'DEPLOY');
  log('Alamat Kontrak : ' + APP.CONTRACT_ADDRESS, 'addr', 'DEPLOY');
  log('Tx Hash        : ' + txH,                  'hash', 'DEPLOY');
  log('Block #' + block + ' | Gas: ' + gas,        'info', 'DEPLOY');

  addBlock('DEPLOY', 'SecureDocTransfer', 'B#' + block, {
    txHash: txH, blockNum: block, gasUsed: gas,
    contractAddr: APP.CONTRACT_ADDRESS, from: APP.aliceAddress, miner: APP.aliceAddress,
  });
  return { contractAddress: APP.CONTRACT_ADDRESS, blockNumber: block, txHash: txH, gas };
}

// ── Simulation: register ─────────────────────────────────────────────────────

async function simRegister(params) {
  await fakeDelay(600);
  log('Spreading tx ke mempool...', 'sim', 'REGISTER');
  await fakeDelay(700);
  log('Validator menandatangani blok...', 'sim', 'REGISTER');
  await fakeDelay(800);

  const block = nextSimBlock();
  const txH   = fakeTxHash();
  const gas   = fakeGas();

  log('✅ Metadata terdaftar! Block #' + block, 'ok', 'REGISTER');
  log('Tx Hash    : ' + txH, 'hash', 'REGISTER');
  log('Pemilik    : ' + APP.aliceAddress + ' (Alice)', 'addr', 'REGISTER');
  log('Gas        : ' + gas, 'info', 'REGISTER');

  addBlock('REGISTER', params.docName, 'Alice', {
    txHash: txH, blockNum: block, gasUsed: gas,
    docName: params.docName, docHash: params.docHash,
    encryptedFileHash: params.encryptedFileHash,
    encryptedKeyHash: params.encryptedKeyHash,
    ivHash: params.ivHash,
    algorithm: params.algorithm,
    from: APP.aliceAddress, miner: APP.aliceAddress,
  });
  return { blockNumber: block, txHash: txH, gas };
}

// ── Simulation: transfer ─────────────────────────────────────────────────────

async function simTransfer(docHash, receiver) {
  await fakeDelay(600);
  log('Memvalidasi kepemilikan Alice...', 'sim', 'TRANSFER');
  await fakeDelay(500);
  log('Mengupdate owner state di semua nodes...', 'sim', 'TRANSFER');
  await fakeDelay(900);

  const block = nextSimBlock();
  const txH   = fakeTxHash();
  const gas   = fakeGas();

  log('✅ Transfer berhasil! Block #' + block, 'ok', 'TRANSFER');
  log('Dari   : ' + APP.aliceAddress + ' (Alice)', 'addr', 'TRANSFER');
  log('Kepada : ' + receiver + ' (Bob)',           'addr', 'TRANSFER');
  log('Tx Hash: ' + txH, 'hash', 'TRANSFER');

  addBlock('TRANSFER', docHash.substring(0, 10), 'Bob', {
    txHash: txH, blockNum: block, gasUsed: gas,
    docHash, from: APP.aliceAddress, to: receiver, miner: APP.aliceAddress,
  });
  return { blockNumber: block, txHash: txH, gas };
}

// ── Real MetaMask: deploy ────────────────────────────────────────────────────

async function realDeploy() {
  const factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, APP.signer);
  const deployTx = await factory.deploy();
  const txHash = deployTx.deploymentTransaction().hash;
  log('Deploy tx: ' + txHash, 'hash', 'DEPLOY');

  const deployed = await deployTx.waitForDeployment();
  APP.CONTRACT_ADDRESS = await deployed.getAddress();
  APP.contract = new ethers.Contract(APP.CONTRACT_ADDRESS, CONTRACT_ABI, APP.signer);
  const receipt = await APP.provider.getTransactionReceipt(txHash);

  log('✅ Deployed! Alamat: ' + APP.CONTRACT_ADDRESS, 'ok', 'DEPLOY');
  log('Block #' + receipt.blockNumber + ' | Gas: ' + receipt.gasUsed.toString(), 'info', 'DEPLOY');

  addBlock('DEPLOY', 'SecureDocTransfer', 'B#' + receipt.blockNumber, {
    txHash: receipt.hash, blockNum: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    contractAddr: APP.CONTRACT_ADDRESS, from: APP.aliceAddress, miner: APP.aliceAddress,
  });
  return { contractAddress: APP.CONTRACT_ADDRESS, blockNumber: receipt.blockNumber, txHash: receipt.hash };
}

// ── Real MetaMask: register ──────────────────────────────────────────────────

async function realRegister(params) {
  const tx = await APP.contract.registerDocument(
    params.docHash, params.docName,
    params.encryptedFileHash, params.encryptedKeyHash,
    params.ivHash, params.algorithm
  );
  log('Tx terkirim: ' + tx.hash, 'hash', 'REGISTER');
  const receipt = await tx.wait();

  log('✅ Terdaftar! Block #' + receipt.blockNumber, 'ok', 'REGISTER');
  log('Gas: ' + receipt.gasUsed.toString(), 'info', 'REGISTER');

  addBlock('REGISTER', params.docName, 'Alice', {
    txHash: receipt.hash, blockNum: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    docName: params.docName, docHash: params.docHash,
    encryptedFileHash: params.encryptedFileHash,
    from: APP.aliceAddress, miner: APP.aliceAddress,
  });
  return { blockNumber: receipt.blockNumber, txHash: receipt.hash };
}

// ── Real MetaMask: transfer ──────────────────────────────────────────────────

async function realTransfer(docHash, receiver) {
  const tx = await APP.contract.transferDocument(docHash, receiver);
  log('Tx: ' + tx.hash, 'hash', 'TRANSFER');
  const receipt = await tx.wait();

  log('✅ Transfer! Block #' + receipt.blockNumber, 'ok', 'TRANSFER');
  addBlock('TRANSFER', docHash.substring(0, 10), 'Bob', {
    txHash: receipt.hash, blockNum: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    docHash, from: APP.aliceAddress, to: receiver, miner: APP.aliceAddress,
  });
  return { blockNumber: receipt.blockNumber, txHash: receipt.hash };
}

// ── getDocument (sim + real) ─────────────────────────────────────────────────

const simLedger = new Map();  // docHash → metadata (sim mode only)

async function getDocumentMeta(docHash) {
  if (APP.SIM_MODE) {
    const d = simLedger.get(docHash);
    if (!d) throw new Error('Dokumen tidak ditemukan di sim ledger.');
    return d;
  }
  const [docName, owner, ts, encryptedFileHash, encryptedKeyHash, ivHash, algorithm] =
    await APP.contract.getDocument(docHash);
  return { docName, owner, timestamp: Number(ts), encryptedFileHash, encryptedKeyHash, ivHash, algorithm };
}
