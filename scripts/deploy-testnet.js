const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const RPC_URL = process.env.RPC_URL || "https://base-sepolia-rpc.publicnode.com";
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not set in .env");
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("📡 RPC:", RPC_URL);
  console.log("👛 Wallet:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ No ETH for gas! Get testnet ETH from a faucet.");
    process.exit(1);
  }

  // Load compiled contract
  const artifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/KORPO.sol/KORPO.json", "utf8")
  );
  
  console.log("\n📦 Deploying KORPO...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  // Estimate gas
  const deployTx = await factory.getDeployTransaction();
  const gasEstimate = await provider.estimateGas(deployTx);
  const feeData = await provider.getFeeData();
  const totalCost = gasEstimate * (feeData.gasPrice || 0n);
  console.log("⛽ Estimated gas:", gasEstimate.toString());
  console.log("💰 Estimated cost:", ethers.formatEther(totalCost), "ETH");
  
  // Deploy
  const korpo = await factory.deploy();
  await korpo.waitForDeployment();
  const address = await korpo.getAddress();
  
  console.log("\n✅ KORPO deployed to:", address);
  console.log("🔗 Explorer:", `https://sepolia.basescan.org/address/${address}`);
  
  // Wait for confirmations before verification
  console.log("\n⏳ Waiting for 5 confirmations...");
  const deployTxReceipt = await provider.getTransactionReceipt(korpo.deploymentTransaction().hash);
  let confs = await provider.getTransactionReceipt(korpo.deploymentTransaction().hash);
  // Just wait a bit for block explorer to index
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Verify on-chain state
  console.log("\n🔍 Verifying on-chain state...");
  const name = await korpo.name();
  const symbol = await korpo.symbol();
  const totalSupply = await korpo.totalSupply();
  const owner = await korpo.owner();
  const paused = await korpo.paused();
  const dailyClaim = await korpo.DAILY_CLAIM();
  const burnRate = await korpo.BURN_RATE();
  const remainingSupply = await korpo.remainingSupply();
  
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Total Supply:", ethers.formatEther(totalSupply));
  console.log("  Remaining Supply:", ethers.formatEther(remainingSupply));
  console.log("  Owner:", owner);
  console.log("  Paused:", paused);
  console.log("  Daily Claim:", ethers.formatEther(dailyClaim));
  console.log("  Burn Rate:", Number(burnRate) / 100 + "%");
  
  // Test claim
  console.log("\n🧪 Testing live claim...");
  const canClaim = await korpo.canClaim(wallet.address);
  console.log("  Can claim:", canClaim);
  
  if (canClaim) {
    const claimTx = await korpo.claim();
    console.log("  Claim tx:", claimTx.hash);
    await claimTx.wait();
    const bal = await korpo.balanceOf(wallet.address);
    console.log("  Balance after claim:", ethers.formatEther(bal), "KORPO");
  }
  
  // Test transfer with burn
  console.log("\n🧪 Testing live transfer with burn...");
  const randomAddr = ethers.Wallet.createRandom().address;
  const transferAmount = ethers.parseEther("50"); // Below burn threshold
  const transferTx = await korpo.transfer(randomAddr, transferAmount);
  console.log("  Transfer tx:", transferTx.hash);
  await transferTx.wait();
  console.log("  Recipient balance:", ethers.formatEther(await korpo.balanceOf(randomAddr)), "KORPO (no burn - below threshold)");
  
  // Save deployment info
  const deployInfo = {
    network: "base-sepolia",
    chainId: 84532,
    address: address,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    txHash: korpo.deploymentTransaction().hash,
    gasUsed: deployTxReceipt?.gasUsed?.toString() || "unknown",
    contract: {
      name: name,
      symbol: symbol,
      totalSupply: ethers.formatEther(totalSupply),
      dailyClaim: ethers.formatEther(dailyClaim),
      burnRate: Number(burnRate) / 10000 * 100 + "%",
      paused: paused,
      owner: owner,
    },
  };
  
  fs.writeFileSync("./deployment.json", JSON.stringify(deployInfo, null, 2));
  console.log("\n📄 Deployment info saved to deployment.json");
  
  console.log("\n🎯 NEXT STEPS:");
  console.log("  1. Verify contract on Basescan");
  console.log("  2. Run full on-chain test suite");
  console.log("  3. Test timelock pause/unpause");
  console.log("  4. Test with multiple wallets");
  console.log("  5. Document all results");
}

main().catch(console.error);