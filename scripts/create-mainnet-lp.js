const { ethers } = require("ethers");
require("dotenv").config();

// Base mainnet Aerodrome LP creation
// Aerodrome is the #1 DEX on Base (Velodrome fork)
// We need to: approve USDC -> create pool -> add liquidity

const KORPO_ADDR = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const USDC_ADDR = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

// Aerodrome V2 Router on Base
const AERO_ROUTER = "0xd7684cc2e6b4a35d9b4c2b0a0438e89b6a3b6c08";
const AERO_FACTORY = "0x420dd3817318a2c1a6c71b74a4b7a3a9336b55e6";

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256) returns (bool)",
];

// Aerodrome Router ABI (simplified - addLiquidity)
const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, bool stable, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
];

// Aerodrome Factory ABI
const FACTORY_ABI = [
  "function getPool(address, address, bool) view returns (address)",
  "function createPool(address, address, bool) external returns (address)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Wallet:", wallet.address);

  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH:", ethers.formatEther(ethBal));

  // Check USDC balance
  const usdc = new ethers.Contract(USDC_ADDR, ERC20_ABI, provider);
  const usdcBal = await usdc.balanceOf(wallet.address);
  const usdcDecimals = await usdc.decimals();
  console.log("USDC:", ethers.formatUnits(usdcBal, usdcDecimals));

  // Check KORPO balance
  const korpo = new ethers.Contract(KORPO_ADDR, ERC20_ABI, provider);
  const korpoBal = await korpo.balanceOf(wallet.address);
  const korpoDecimals = await korpo.decimals();
  console.log("KORPO:", ethers.formatUnits(korpoBal, korpoDecimals));

  // Check if pool already exists
  const factory = new ethers.Contract(AERO_FACTORY, FACTORY_ABI, provider);
  let pool;
  try {
    pool = await factory.getPool(KORPO_ADDR, USDC_ADDR, false); // volatile pool
    console.log("Existing pool:", pool === ethers.ZeroAddress ? "NONE" : pool);
  } catch (e) {
    console.log("getPool error:", e.message.slice(0, 80));
  }

  // Strategy: We have 2.97 USDC and 100 KORPO
  // Price: 100 KORPO = ~2.97 USDC means 1 KORPO = ~0.0297 USDC
  // For a volatile pool we split 50/50
  
  const usdcAmount = ethers.parseUnits("2.00", usdcDecimals); // Use 2 USDC, keep some for gas
  const korpoAmount = ethers.parseEther("67"); // 67 KORPO (~2 USDC worth at 0.03 rate)
  // Actually let's be generous: 100 KORPO / 2.97 USDC ratio
  // If we provide 2 USDC, KORPO side = 2 / 2.97 * 100 = 67.3 KORPO
  
  console.log("\n--- LP Strategy ---");
  console.log("USDC to provide:", ethers.formatUnits(usdcAmount, usdcDecimals));
  console.log("KORPO to provide:", ethers.formatUnits(korpoAmount, korpoDecimals));
  console.log("Implied price: 1 KORPO =", (2.0 / 67.0).toFixed(4), "USDC");

  // Step 1: Approve USDC for router
  console.log("\n--- Step 1: Approve USDC ---");
  const usdcWithSigner = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet);
  const usdcAllowance = await usdcWithSigner.allowance(wallet.address, AERO_ROUTER);
  console.log("Current USDC allowance:", ethers.formatUnits(usdcAllowance, usdcDecimals));
  
  if (usdcAllowance < usdcAmount) {
    console.log("Approving USDC...");
    const approveTx = await usdcWithSigner.approve(AERO_ROUTER, usdcAmount);
    console.log("Approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("USDC approved!");
  }

  // Step 2: Approve KORPO for router
  console.log("\n--- Step 2: Approve KORPO ---");
  const korpoWithSigner = new ethers.Contract(KORPO_ADDR, ERC20_ABI, wallet);
  const korpoAllowance = await korpoWithSigner.allowance(wallet.address, AERO_ROUTER);
  console.log("Current KORPO allowance:", ethers.formatUnits(korpoAllowance, korpoDecimals));
  
  if (korpoAllowance < korpoAmount) {
    console.log("Approving KORPO...");
    const approveTx = await korpoWithSigner.approve(AERO_ROUTER, korpoAmount);
    console.log("Approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("KORPO approved!");
  }

  // Step 3: Create pool if it doesn't exist
  if (pool === ethers.ZeroAddress || !pool) {
    console.log("\n--- Step 3: Create Pool ---");
    const factoryWithSigner = new ethers.Contract(AERO_FACTORY, FACTORY_ABI, wallet);
    try {
      const createTx = await factoryWithSigner.createPool(KORPO_ADDR, USDC_ADDR, false, {
        gasLimit: 2000000n,
      });
      console.log("Create pool tx:", createTx.hash);
      await createTx.wait();
      console.log("Pool created!");
      
      pool = await factory.getPool(KORPO_ADDR, USDC_ADDR, false);
      console.log("Pool address:", pool);
    } catch (e) {
      console.log("Create pool error:", e.message.slice(0, 200));
    }
  }

  // Step 4: Add liquidity
  console.log("\n--- Step 4: Add Liquidity ---");
  const router = new ethers.Contract(AERO_ROUTER, ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 min
  
  try {
    const liqTx = await router.addLiquidity(
      KORPO_ADDR,
      USDC_ADDR,
      false, // volatile
      korpoAmount,
      usdcAmount,
      korpoAmount * 95n / 100n, // 5% slippage
      usdcAmount * 95n / 100n,
      wallet.address,
      deadline,
      { gasLimit: 500000n }
    );
    console.log("Add liquidity tx:", liqTx.hash);
    await liqTx.wait();
    console.log("Liquidity added!");
  } catch (e) {
    console.log("Add liquidity error:", e.message.slice(0, 300));
    
    // Fallback: try Uniswap V2 Router on Base
    console.log("\n--- Fallback: Uniswap V2 on Base ---");
    const UNI_ROUTER = "0x4752ba5dbc23f44d8782627628f1b25e3589e660";
    const UNI_FACTORY = "0x8909dc15e40173ff9fde8a7c6296e9a5a2e0291e";
    
    console.log("Trying Uniswap V2 Router...");
    
    const UNI_ROUTER_ABI = [
      "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
    ];
    
    // Approve for Uniswap
    const usdcAllowance2 = await usdcWithSigner.allowance(wallet.address, UNI_ROUTER);
    if (usdcAllowance2 < usdcAmount) {
      const a1 = await usdcWithSigner.approve(UNI_ROUTER, usdcAmount);
      await a1.wait();
      console.log("USDC approved for Uniswap");
    }
    const korpoAllowance2 = await korpoWithSigner.allowance(wallet.address, UNI_ROUTER);
    if (korpoAllowance2 < korpoAmount) {
      const a2 = await korpoWithSigner.approve(UNI_ROUTER, korpoAmount);
      await a2.wait();
      console.log("KORPO approved for Uniswap");
    }
    
    const uniRouter = new ethers.Contract(UNI_ROUTER, UNI_ROUTER_ABI, wallet);
    try {
      const liqTx2 = await uniRouter.addLiquidity(
        KORPO_ADDR,
        USDC_ADDR,
        korpoAmount,
        usdcAmount,
        korpoAmount * 95n / 100n,
        usdcAmount * 95n / 100n,
        wallet.address,
        deadline,
        { gasLimit: 500000n }
      );
      console.log("Uniswap LP tx:", liqTx2.hash);
      await liqTx2.wait();
      console.log("Uniswap LP created!");
    } catch (e2) {
      console.log("Uniswap LP error:", e2.message.slice(0, 300));
    }
  }

  // Final state
  console.log("\n--- Final State ---");
  const finalEth = await provider.getBalance(wallet.address);
  console.log("ETH:", ethers.formatEther(finalEth));
  console.log("USDC:", ethers.formatUnits(await usdc.balanceOf(wallet.address), usdcDecimals));
  console.log("KORPO:", ethers.formatUnits(await korpo.balanceOf(wallet.address), korpoDecimals));
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});