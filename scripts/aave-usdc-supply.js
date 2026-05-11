const { ethers } = require("ethers");
require("dotenv").config();

// Aave V3 USDC supply on Base mainnet
// Strategy: Just send the TX - public RPC can't read proxy contracts but TXs work fine

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const AAVE_POOL = "0x13a74610ad9263d02d39e2a5003e2778c7a3a7aa";
const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function allowance(address, address) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Wallet:", wallet.address);

  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet);
  const bal = await usdc.balanceOf(wallet.address);
  const dec = await usdc.decimals();
  console.log("USDC balance:", ethers.formatUnits(bal, dec));

  // Supply 2 USDC to Aave (keep 0.97 for gas/other uses)
  const supplyAmt = ethers.parseUnits("2.0", dec);

  // Approve
  console.log("Approving USDC for Aave Pool...");
  const approveTx = await usdc.approve(AAVE_POOL, supplyAmt);
  console.log("Approve tx:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approved");

  // Supply
  console.log("Supplying 2 USDC to Aave V3...");
  const aavePool = new ethers.Contract(AAVE_POOL, AAVE_POOL_ABI, wallet);
  try {
    const supplyTx = await aavePool.supply(USDC, supplyAmt, wallet.address, 0, { gasLimit: 500000n });
    console.log("Supply tx:", supplyTx.hash);
    const receipt = await supplyTx.wait();
    console.log("Supply:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  } catch (e) {
    console.log("Aave supply failed:", e.message.slice(0, 300));
    console.log("\n↳ Falling back: swap USDC for more KORPO volume");
    
    // Fallback: buy KORPO with USDC via Uniswap V3
    const SWAP_ROUTER = "0x2626664c2603336e57b63ce23ff376b3e35c6f3a";
    const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
    const WETH = "0x4200000000000000000000000000000000000006";
    
    // Approve USDC for swap router
    const swapApprove = await usdc.approve(SWAP_ROUTER, ethers.parseUnits("1.0", dec));
    console.log("Swap approve:", swapApprove.hash);
    await swapApprove.wait();
    
    // Multi-hop swap: USDC -> WETH -> KORPO
    const swapRouter = new ethers.Contract(SWAP_ROUTER, [
      "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)"
    ], wallet);
    
    const path = ethers.solidityPacked(
      ["address", "uint24", "address", "uint24", "address"],
      [USDC, 500, WETH, 10000, KORPO]
    );
    
    const swapTx = await swapRouter.exactInput({
      path,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 600,
      amountIn: ethers.parseUnits("1.0", dec),
      amountOutMinimum: 0n,
    }, { gasLimit: 500000n });
    console.log("Swap tx:", swapTx.hash);
    const receipt2 = await swapTx.wait();
    console.log("Swap:", receipt2.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  }

  // Final balances
  const fEth = await provider.getBalance(wallet.address);
  const fUsdc = await usdc.balanceOf(wallet.address);
  console.log("\nFinal — ETH:", ethers.formatEther(fEth), "| USDC:", ethers.formatUnits(fUsdc, dec));
}

main().catch(e => console.error("FATAL:", e.message));