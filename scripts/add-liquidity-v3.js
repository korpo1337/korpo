#!/usr/bin/env node
/**
 * KORPO Launch Script - Add liquidity to existing Uniswap V3 pool
 * 
 * Pool: 0x588Cc334d86C40fF16b8714f1Ff8bd25993CFa9e (KORPO/WETH, 1% fee)
 * 
 * This script:
 * 1. Wraps ETH to WETH
 * 2. Approves WETH + KORPO to PositionManager
 * 3. Mints a concentrated liquidity position in the existing pool
 * 
 * RUN: node scripts/add-liquidity-v3.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WETH = "0x4200000000000000000000000000000000000006";
const POSITION_MANAGER = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const POOL = "0x588Cc334d86C40fF16b8714f1Ff8bd25993CFa9e";
const FEE = 10000; // 1%

// Concentrated liquidity: narrow range for max capital efficiency
const TICK_LOWER = -887200;
const TICK_UPPER = 887200;

const WETH_TO_WRAP = ethers.parseEther("0.0005"); // Tiny but enough
const KORPO_TO_ADD = ethers.parseEther("100"); // 100 KORPO

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

const WETH_ABI = [
  "function deposit() payable",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

const PM_ABI = [
  "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
];

async function main() {
  console.log("=== KORPO Liquidity Addition ===");
  console.log("Wallet:", wallet.address);

  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH:", ethers.formatEther(ethBal));

  if (ethBal < ethers.parseEther("0.0006")) {
    throw new Error(`Need at least 0.0006 ETH. Have: ${ethers.formatEther(ethBal)}`);
  }

  const korpo = new ethers.Contract(KORPO, ERC20_ABI, wallet);
  const weth = new ethers.Contract(WETH, WETH_ABI, wallet);
  const pm = new ethers.Contract(POSITION_MANAGER, PM_ABI, wallet);

  const korpoBal = await korpo.balanceOf(wallet.address);
  console.log("KORPO:", ethers.formatEther(korpoBal));

  // Wrap ETH to WETH
  const wethBal = await weth.balanceOf(wallet.address);
  console.log("WETH:", ethers.formatEther(wethBal));

  if (wethBal < WETH_TO_WRAP) {
    const toWrap = WETH_TO_WRAP - wethBal;
    console.log("Wrapping", ethers.formatEther(toWrap), "ETH to WETH...");
    const wrapTx = await weth.deposit({ value: toWrap, gasLimit: 100000n });
    console.log("Wrap TX:", wrapTx.hash);
    await wrapTx.wait();
    console.log("Wrapped!");
  }

  // Approve
  const wethAllowance = await weth.allowance(wallet.address, POSITION_MANAGER);
  if (wethAllowance < WETH_TO_WRAP) {
    console.log("Approving WETH...");
    const approveTx = await weth.approve(POSITION_MANAGER, WETH_TO_WRAP);
    await approveTx.wait();
    console.log("WETH approved!");
  }

  const korpoAllowance = await korpo.allowance(wallet.address, POSITION_MANAGER);
  if (korpoAllowance < KORPO_TO_ADD) {
    console.log("Approving KORPO...");
    const approveTx = await korpo.approve(POSITION_MANAGER, KORPO_TO_ADD);
    await approveTx.wait();
    console.log("KORPO approved!");
  }

  // Mint position
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

  const mintParams = {
    token0: WETH,  // WETH is token0 (lower address)
    token1: KORPO, // KORPO is token1
    fee: FEE,
    tickLower: TICK_LOWER,
    tickUpper: TICK_UPPER,
    amount0Desired: WETH_TO_WRAP,
    amount1Desired: KORPO_TO_ADD,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: wallet.address,
    deadline,
  };

  console.log("Minting LP position...");
  const mintTx = await pm.mint(mintParams, { gasLimit: 900000n });
  console.log("Mint TX:", mintTx.hash);
  const receipt = await mintTx.wait();
  console.log("Mint confirmed! Gas used:", receipt.gasUsed.toString());
  console.log("DONE! Liquidity added to KORPO/WETH pool.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});