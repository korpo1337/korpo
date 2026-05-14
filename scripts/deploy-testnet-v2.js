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
  
  // Load compiled contract
  const artifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/KORPO.sol/KORPO.json", "utf8")
  );
  
  console.log("\n📦 Deploying KORPO v2 (with M-1 self-transfer fix)...");
  console.log("   Bytecode length:", artifact.bytecode.length);
  console.log("   First 10 chars:", artifact.bytecode.slice(0, 10));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  // Deploy with explicit gas limit (skip estimateGas which can fail)
  const korpo = await factory.deploy({
    gasLimit: 5000000n,  // 5M gas — plenty for deployment
  });
  await korpo.waitForDeployment();
  const address = await korpo.getAddress();
  
  console.log("\n✅ KORPO deployed to:", address);
  console.log("🔗 Explorer:", `https://sepolia.basescan.org/address/${address}`);
  
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
  
  // Test self-transfer (M-1 fix verification)
  console.log("\n🧪 Testing self-transfer (M-1 fix)...");
  const balBefore = await korpo.balanceOf(wallet.address);
  console.log("  Balance before:", ethers.formatEther(balBefore), "KORPO");
  
  if (balBefore >= ethers.parseEther("100")) {
    const selfTx = await korpo.transfer(wallet.address, ethers.parseEther("100"));
    console.log("  Self-transfer tx:", selfTx.hash);
    await selfTx.wait();
    const balAfter = await korpo.balanceOf(wallet.address);
    console.log("  Balance after:", ethers.formatEther(balAfter), "KORPO");
    if (balAfter.toString() === balBefore.toString()) {
      console.log("  ✅ M-1 FIX VERIFIED: Self-transfer does NOT burn tokens!");
    } else {
      console.log("  ❌ M-1 BUG: Self-transfer burned", ethers.formatEther(balBefore - balAfter), "KORPO");
    }
  }
  
  // Save deployment info
  const deployInfo = {
    network: "base-sepolia",
    chainId: 84532,
    address: address,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    m1_fix: true,
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
  
  fs.writeFileSync("./deployment-v2-m1fix.json", JSON.stringify(deployInfo, null, 2));
  console.log("\n📄 Deployment info saved to deployment-v2-m1fix.json");
}

main().catch(console.error);