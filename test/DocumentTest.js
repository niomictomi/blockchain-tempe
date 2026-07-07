const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SecureDocumentTransfer", function () {
  let contract;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const SecureDocumentTransfer = await ethers.getContractFactory("SecureDocumentTransfer");
    contract = await SecureDocumentTransfer.deploy();
  });

  it("Harus bisa mendaftarkan dokumen baru", async function () {
    const docHash = "hash_dokumen_rahasia_123";
    await contract.connect(alice).registerDocument(docHash, "Ijazah.pdf");

    const [name, currentOwner] = await contract.getDocument(docHash);
    expect(name).to.equal("Ijazah.pdf");
    expect(currentOwner).to.equal(alice.address);
  });

  it("Harus bisa mentransfer kepemilikan dokumen", async function () {
    const docHash = "hash_dokumen_rahasia_123";
    await contract.connect(alice).registerDocument(docHash, "Ijazah.pdf");
    
    // Transfer dari Alice ke Bob
    await contract.connect(alice).transferDocument(docHash, bob.address);

    const [, currentOwner] = await contract.getDocument(docHash);
    expect(currentOwner).to.equal(bob.address);
  });
});
