const hre = require("hardhat");

async function main() {
  console.log("Memulai deployment smart contract...");

  // Mengambil contract factory
  const SecureDocumentTransfer = await hre.ethers.getContractFactory("SecureDocumentTransfer");
  
  // Deploy contract
  const contract = await SecureDocumentTransfer.deploy();
  await contract.waitForDeployment();

  console.log(`Smart Contract berhasil dideploy ke alamat: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
