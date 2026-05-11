#!/usr/bin/env node
const { ethers } = require("ethers");
require("dotenv").config();

// Daily KORPO status report
const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WALLET = "0xAFe3A600e81ecfB0714e28Bff82c9944C4B7666d";

const ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function remainingSupply() view returns (uint256)",
  "function totalClaimed() view returns (uint256)",
  "function canClaim(address) view returns (bool)",
  "function lastClaimTime(address) view returns (uint256)"
];

async function main() {
  const p = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const k = new ethers.Contract(KORPO, ABI, p);

  let bal, rem, claimed, canCl, lastCl;
  try {
    [bal, rem, claimed, canCl, lastCl] = await Promise.all([
      k.balanceOf(WALLET),
      k.remainingSupply(),
      k.totalClaimed(),
      k.canClaim(WALLET),
      k.lastClaimTime(WALLET)
    ]);
  } catch (e) {
    console.log("⚠️ RPC rate limited - skipping report");
    return;
  }

  const ethBal = await p.getBalance(WALLET).catch(() => null);
  const holders = Math.round(Number(ethers.formatEther(claimed)) / 100);

  const report = [
    `📊 KORPO Daily Report`,
    ``,
    `🏦 Contract: 0xF970c93D`,
    `💰 Remaining: ${Number(ethers.formatEther(rem)).toLocaleString()} KORPO`,
    `📈 Total Claimed: ${Number(ethers.formatEther(claimed)).toLocaleString()} KORPO`,
    `👥 ~Holders: ${Math.max(1, Math.round(holders))}`,
    `🔑 Your Balance: ${Number(ethers.formatEther(bal)).toFixed(2)} KORPO`,
    `${canCl ? '✅ Claim available!' : '⏳ 24h cooldown'}`,
    `⛽ ETH: ${ethBal ? Number(ethers.formatEther(ethBal)).toFixed(6) : 'N/A'}`,
    `🌐 korpo.pro | Uniswap V3 | Base ⬛`,
  ].join('\n');

  console.log(report);
}

main().catch(() => console.log("Report failed"));