const { ethers } = require("ethers");
require("dotenv").config();

// KORPO volume generation: alternate small swaps WETH<->KORPO
// This creates trading activity that DexScreener indexes

const KORPO_ADDR = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WETH_ADDR = "0x4200000000000000000000000000000000000006";
const SWAP_ROUTER = "0x2626664c2603336e57b63ce23ff376b3e35c6f3a";
const POSITION_MANAGER = "0x036cbdd5a6c0c6a7e6e7ac8ce401e8efb6d880d0";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
];

const SWAP_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const artifact = require("./artifacts/contracts/KORPO.sol/KORPO.json");
  const korpo = new ethers.Contract(KORPO_ADDR, artifact.abi, wallet);
  const weth = new ethers.Contract(WETH_ADDR, ERC20_ABI, wallet);
  const swapRouter = new ethers.Contract(SWAP_ROUTER, SWAP_ABI, wallet);
  
  // Try claim first
  const canClaim = await korpo.canClaim(wallet.address);
  if (canClaim) {
    console.log("Claiming 100 KORPO...");
    const claimTx = await korpo.claim({ gasLimit: 200000n });
    await claimTx.wait();
    console.log("✅ Claimed 100 KORPO");
  } else {
    console.log("Claim: not yet available");
  }
  
  const korpoBal = await korpo.balanceOf(wallet.address);
  const wethBal = await weth.balanceOf(wallet.address);
  console.log("KORPO:", ethers.formatEther(korpoBal));
  console.log("WETH:", ethers.formatEther(wethBal));
  
  // Alternate swap direction based on which we have more of
  const deadline = Math.floor(Date.now() / 1000) + 600;
  
  if (Number(ethers.formatEther(korpoBal)) >= 5) {
    // KORPO -> WETH swap
    console.log("Swapping 5 KORPO -> WETH...");
    await korpo.approve(SWAP_ROUTER, ethers.parseEther("5"));
    const tx = await swapRouter.exactInputSingle({
      tokenIn: KORPO_ADDR,
      tokenOut: WETH_ADDR,
      fee: 10000,
      recipient: wallet.address,
      deadline,
      amountIn: ethers.parseEther("5"),
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    }, { gasLimit: 500000n });
    await tx.wait();
    console.log("✅ Swap complete:", tx.hash);
  } else if (Number(ethers.formatEther(wethBal)) >= 0.00005) {
    // WETH -> KORPO swap
    console.log("Swapping 0.00005 WETH -> KORPO...");
    await weth.approve(SWAP_ROUTER, ethers.parseEther("0.0001"));
    const tx = await swapRouter.exactInputSingle({
      tokenIn: WETH_ADDR,
      tokenOut: KORPO_ADDR,
      fee: 10000,
      recipient: wallet.address,
      deadline,
      amountIn: ethers.parseEther("0.00005"),
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    }, { gasLimit: 500000n });
    await tx.wait();
    console.log("✅ Swap complete:", tx.hash);
  } else {
    console.log("Insufficient balance for swap");
  }
}

main().catch(e => {
  console.error("ERROR:", e.message);
  process.exit(1);
});