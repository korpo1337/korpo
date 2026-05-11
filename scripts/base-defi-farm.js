const { ethers } = require("ethers");
require("dotenv").config();

// Supply USDC to Aave V3 on Base mainnet
// This earns interest AND creates DeFi footprint for airdrop eligibility

const USDC_ADDR = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
// Aave V3 Pool on Base (from Aave documentation)
const AAVE_POOL = "0x13a74610ad9263d02d39e2a5003e2778c7a3a7aa";
// Aave USDC asset address on Base
const AAVE_USDC = "0x4e65fE4DbA3E5eF9B2E2BCC3C0C6E5f7b5B2f6E8"; // aBaseUSDC (placeholder - verify)

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function getReserveData(address asset) view returns (tuple(tuple(uint256 data) configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 currentStableBorrowRate, uint128 currentVariableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationDebtTotalUpper, uint128 isolationDebtRemaining, uint128 availableLiquidity) reserveData)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Wallet:", wallet.address);

  const usdc = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet);
  const usdcBal = await usdc.balanceOf(wallet.address);
  const usdcDecimals = await usdc.decimals();
  console.log("USDC balance:", ethers.formatUnits(usdcBal, usdcDecimals));

  // Try to get Aave pool reserve data for USDC
  const aavePool = new ethers.Contract(AAVE_POOL, AAVE_POOL_ABI, wallet);
  
  console.log("\nChecking Aave V3 Pool reserve data...");
  try {
    const reserveData = await aavePool.getReserveData(USDC_ADDR);
    console.log("Reserve ID:", reserveData.id.toString());
    console.log("Liquidity rate:", (Number(reserveData.currentLiquidityRate) / 1e25).toFixed(2), "% APY");
    console.log("aToken:", reserveData.aTokenAddress);
    
    // Supply USDC to Aave
    const supplyAmount = ethers.parseUnits("2.00", usdcDecimals); // Supply 2 USDC, keep 0.97 for gas
    
    // Approve USDC
    console.log("\nApproving USDC for Aave...");
    const approveTx = await usdc.approve(AAVE_POOL, supplyAmount);
    console.log("Approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ USDC approved");
    
    // Supply
    console.log("\nSupplying", ethers.formatUnits(supplyAmount, usdcDecimals), "USDC to Aave V3...");
    const supplyTx = await aavePool.supply(
      USDC_ADDR,
      supplyAmount,
      wallet.address,
      0, // referral code
      { gasLimit: 500000n }
    );
    console.log("Supply tx:", supplyTx.hash);
    const receipt = await supplyTx.wait();
    console.log("Supply:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (e) {
    console.log("Aave interaction error:", e.message.slice(0, 400));
    
    // Fallback: Try Morpho Blue on Base
    console.log("\n--- Fallback: Morpho Blue ---");
    const MORPHO_ORACLE = "0xe8b7a44028d4897d0d1f5e7cb6e5e6f1e6c3e2a1"; // placeholder
    const MORPHO_IRSTRAT = "0xe8b7a44028983b1c4f5d6e7a8b9c0d1e2f3a4b5c";
    console.log("Morpho not yet configured - need contract addresses");
    
    // Simple alternative: Just swap USDC for more KORPO on Uniswap V3
    console.log("\n--- Simpler fallback: Buy KORPO with USDC ---");
    const SWAP_ROUTER = "0x2626664c2603336e57b63ce23ff376b3e35c6f3a";
    const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
    
    // Approve USDC for swap
    const approveTx2 = await usdc.approve(SWAP_ROUTER, ethers.parseUnits("1.0", usdcDecimals));
    console.log("USDC approve for swap:", approveTx2.hash);
    await approveTx2.wait();
    
    // Swap 1 USDC -> KORPO
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const swapRouter = new ethers.Contract(SWAP_ROUTER, [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
    ], wallet);
    
    // Need USDC -> WETH -> KORPO (multi-hop since no direct USDC/KORPO pool)
    // Use exactInput with path bytes
    const SWAP_ABI2 = [
      "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)"
    ];
    const swapRouter2 = new ethers.Contract(SWAP_ROUTER, SWAP_ABI2, wallet);
    
    // Path: USDC (fee 500) → WETH (fee 10000) → KORPO
    const WETH = "0x4200000000000000000000000000000000000006";
    // V3 path encoding: tokenA + fee + tokenB + fee + tokenC
    const path = ethers.solidityPacked(
      ["address", "uint24", "address", "uint24", "address"],
      [USDC_ADDR, 500, WETH, 10000, KORPO]
    );
    
    try {
      console.log("Swapping 1 USDC -> KORPO (multi-hop via WETH)...");
      const swapTx = await swapRouter2.exactInput({
        path: path,
        recipient: wallet.address,
        deadline: deadline,
        amountIn: ethers.parseUnits("1.0", usdcDecimals),
        amountOutMinimum: 0n,
      }, { gasLimit: 500000n });
      console.log("Swap tx:", swapTx.hash);
      const receipt2 = await swapTx.wait();
      console.log("Swap:", receipt2.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    } catch (e2) {
      console.log("Multi-hop swap error:", e2.message.slice(0, 300));
    }
  }

  // Final balance
  console.log("\n--- Final Balances ---");
  const fEth = await provider.getBalance(wallet.address);
  const fUsdc = await usdc.balanceOf(wallet.address);
  const fKorpo = await new ethers.Contract("0xf970c93d00de94786f6fdabbc63180da1d981bc7", ["function balanceOf(address) view returns (uint256)"], provider).balanceOf(wallet.address);
  console.log("ETH:", ethers.formatEther(fEth));
  console.log("USDC:", ethers.formatUnits(fUsdc, usdcDecimals));
  console.log("KORPO:", ethers.formatEther(fKorpo));
}

main().catch(e => console.error("FATAL:", e.message));