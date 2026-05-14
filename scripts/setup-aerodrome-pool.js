#!/usr/bin/env node
/**
 * KORPO/Aerodrome Pool Setup Script
 * Prepares pool creation data for Aerodrome (Base #1 DEX, ve(3,3) model)
 * 
 * Run: node scripts/setup-aerodrome-pool.js
 * 
 * Key addresses on Base:
 * - Aerodrome Router: 0x7c4A18BD3BD4A4708A8579BE8C5C4B94D1CD2E61
 * - Aerodrome Voter: 0x166F6054c3A3AabB521eD7F3B7C823aB3C4D4975  
 * - WETH: 0x4200000000000000000000000000000000000006
 * - KORPO: 0xF970c93D00de94786f6fdabbc63180da1d981bc7
 * 
 * Steps (manual, after getting WETH):
 * 1. Wrap ETH -> WETH on Base
 * 2. Approve KORPO + WETH to Aerodrome Router
 * 3. Create pool: https://aerodrome.finance/pools/create
 * 4. Add initial liquidity (min ~0.005 WETH + KORPO)
 * 5. Vote for KORPO/WETH gauge for AERO emissions
 */

const { ethers } = require("ethers");

const AERO_ROUTER = "0x7c4A18BD3BD4A4708A8579BE8C5C4B94D1CD2E61";
const WETH = "0x4200000000000000000000000000000000000006";
const KORPO = "0xF970c93D00de94786f6fdabbc63180da1d981bc7";
const WALLET = "0xAFe3A600e81ecfB0714e28Bff82c9944C4B7666d";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
  
  const korpo = new ethers.Contract(KORPO, [
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)"
  ], provider);
  
  const weth = new ethers.Contract(WETH, [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ], provider);
  
  console.log("=== KORPO/Aerodrome Pool Setup ===\n");
  console.log("KORPO:", await korpo.symbol(), "- Total Supply:", ethers.utils.formatEther(await korpo.totalSupply()));
  console.log("Wallet KORPO:", ethers.utils.formatEther(await korpo.balanceOf(WALLET)));
  console.log("Wallet WETH:", ethers.utils.formatEther(await weth.balanceOf(WALLET)));
  console.log("\nNext steps:");
  console.log("1. Get WETH on Base (wrap ETH or bridge)");
  console.log("2. Create pool at https://aerodrome.finance/pools/create");
  console.log("3. Add liquidity");
  console.log("4. Vote for gauge");
}

main().catch(console.error);