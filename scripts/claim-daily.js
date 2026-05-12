const { ethers } = require("ethers");
require("dotenv").config();

// KORPO v2 daily claim script for Base mainnet
// Run this once per day to claim 100 KORPO

const KORPO_ADDR = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const artifact = require("/home/ubuntu/korpo-v2/artifacts/contracts/KORPO.sol/KORPO.json");
  const korpo = new ethers.Contract(KORPO_ADDR, artifact.abi, wallet);
  
  console.log("=== KORPO Daily Claim ===");
  console.log("Time:", new Date().toISOString());
  console.log("Wallet:", wallet.address);
  
  const canClaim = await korpo.canClaim(wallet.address);
  if (!canClaim) {
    const lastClaim = await korpo.lastClaimTime(wallet.address);
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(lastClaim) + 86400 - now;
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    console.log("Cannot claim yet. Next claim in:", hours + "h " + mins + "m");
    process.exit(0);
  }
  
  // Claim
  console.log("Claiming 100 KORPO...");
  const tx = await korpo.claim({ gasLimit: 200000 });
  console.log("Tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  
  // Verify balance
  const bal = await korpo.balanceOf(wallet.address);
  const totalClaimed = await korpo.totalClaimed();
  const remaining = await korpo.remainingSupply();
  console.log("KORPO balance:", ethers.formatEther(bal));
  console.log("Total claimed:", ethers.formatEther(totalClaimed));
  console.log("Remaining supply:", ethers.formatEther(remaining));
}

main().catch(e => {
  console.error("ERROR:", e.message);
  process.exit(1);
});