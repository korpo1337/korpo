#!/usr/bin/env node
/**
 * KORPO Daily Operations Manager
 * Runs every 6 hours via cron:
 * - Claim KORPO tokens
 * - Check pool status
 * - Generate status report
 * 
 * Usage: node scripts/korpo-ops.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const WALLET = "0xAFe3A600e81ecfB0714e28Bff82c9944C4B7666d";
const KORPO = "0xF970c93D00de94786f6fdabbc63180da1d981bc7";
const UNISWAP_V3_POOL = "0x588Cc334d86C40fF16b8714f1Ff8bd25993CFa9e";

const KORPO_ABI = [
  "function claim() external",
  "function canClaim(address) view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function totalClaimed() view returns (uint256)",
  "function uniqueClaimers() view returns (uint256)",
  "function remainingSupply() view returns (uint256)",
  "function totalBurned() view returns (uint256)",
  "function DAILY_CLAIM() view returns (uint256)",
  "function nextClaimTime(address) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const korpo = new ethers.Contract(KORPO, KORPO_ABI, wallet);

  console.log("=== KORPO Daily Ops ===");
  console.log("Time:", new Date().toISOString());
  
  const ethBal = await provider.getBalance(WALLET);
  const korpoBal = await korpo.balanceOf(WALLET);
  const canClaim = await korpo.canClaim(WALLET);
  const totalClaimed = await korpo.totalClaimed();
  const uniqueClaimers = await korpo.uniqueClaimers();
  const remaining = await korpo.remainingSupply();
  const burned = await korpo.totalBurned();
  const dailyClaim = await korpo.DAILY_CLAIM();

  console.log("ETH:", ethers.formatEther(ethBal));
  console.log("KORPO:", ethers.formatEther(korpoBal));
  console.log("Can claim:", canClaim);
  console.log("Total claimed:", ethers.formatEther(totalClaimed));
  console.log("Unique claimers:", uniqueClaimers.toString());
  console.log("Remaining:", ethers.formatEther(remaining));
  console.log("Burned:", ethers.formatEther(burned));
  console.log("Daily claim amount:", ethers.formatEther(dailyClaim));

  if (canClaim) {
    console.log("\n CLAIMING KORPO...");
    const gasEst = await korpo.claim.estimateGas({ from: WALLET });
    const gasPrice = await provider.getGasPrice();
    const cost = gasPrice * (gasEst + 10000n);
    console.log("Gas estimate:", gasEst.toString(), "| Cost:", ethers.formatEther(cost), "ETH");

    if (ethBal > cost) {
      const tx = await korpo.claim({ gasLimit: gasEst + 20000n });
      console.log("TX:", tx.hash);
      const receipt = await tx.wait();
      console.log("Claimed! Gas used:", receipt.gasUsed.toString());
      
      const newBal = await korpo.balanceOf(WALLET);
      console.log("New KORPO balance:", ethers.formatEther(newBal));
    } else {
      console.log("WARNING: Not enough ETH for gas!");
    }
  } else {
    console.log("No claim available yet");
  }

  console.log("\n=== Done ===");
}

main().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});