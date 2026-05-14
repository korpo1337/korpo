const { ethers } = require("ethers");
require("dotenv").config();

// Uniswap V2 LP creation on Base mainnet
const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const WETH = "0x4200000000000000000000000000000000000006";

// Uniswap V2 on Base
const UNI_FACTORY = "0x8909dc15e40173ff9fde8a7c6296e9a5a2e0291e";
const UNI_ROUTER = "0x4752ba5dbc23f44d8782627628f1b25e3589e660";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const FACTORY_ABI = [
  "function getPair(address, address) view returns (address)",
  "function createPair(address, address) external returns (address)",
];

const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Wallet:", wallet.address);

  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH:", ethers.formatEther(ethBal));

  const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
  const korpo = new ethers.Contract(KORPO, ERC20_ABI, provider);
  
  const usdcBal = await usdc.balanceOf(wallet.address);
  const korpoBal = await korpo.balanceOf(wallet.address);
  console.log("USDC:", ethers.formatUnits(usdcBal, 6));
  console.log("KORPO:", ethers.formatEther(korpoBal));

  // Check if pair exists
  const factory = new ethers.Contract(UNI_FACTORY, FACTORY_ABI, provider);
  let pairAddr;
  try {
    pairAddr = await factory.getPair(KORPO, USDC);
    console.log("Existing KORPO/USDC pair:", pairAddr === ethers.ZeroAddress ? "NONE" : pairAddr);
  } catch (e) {
    console.log("getPair error:", e.message.slice(0, 100));
  }

  // Amounts to provide
  // We have 2.97 USDC and 100 KORPO
  // Create initial price: 1 KORPO = 0.01 USDC (cheap entry, attractive)
  // So 100 KORPO pairs with 1 USDC
  const usdcAmount = ethers.parseUnits("1.0", 6); // 1 USDC
  const korpoAmount = ethers.parseEther("100");   // 100 KORPO
  // This sets price at 1 KORPO = 0.01 USDC = $0.01
  
  console.log("\n--- LP Setup ---");
  console.log("USDC:", ethers.formatUnits(usdcAmount, 6));
  console.log("KORPO:", ethers.formatEther(korpoAmount));
  console.log("Initial price: 1 KORPO = $0.01");

  // Approve USDC
  const usdcSigner = new ethers.Contract(USDC, ERC20_ABI, wallet);
  console.log("\nApproving USDC...");
  const usdcAppTx = await usdcSigner.approve(UNI_ROUTER, usdcAmount);
  console.log("USDC approve tx:", usdcAppTx.hash);
  await usdcAppTx.wait();

  // Approve KORPO
  const korpoSigner = new ethers.Contract(KORPO, ERC20_ABI, wallet);
  console.log("Approving KORPO...");
  const korpoAppTx = await korpoSigner.approve(UNI_ROUTER, korpoAmount);
  console.log("KORPO approve tx:", korpoAppTx.hash);
  await korpoAppTx.wait();

  // Add liquidity via Uniswap V2 Router (auto-creates pair)
  console.log("\nAdding liquidity...");
  const router = new ethers.Contract(UNI_ROUTER, ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 600;

  try {
    const liqTx = await router.addLiquidity(
      KORPO,
      USDC,
      korpoAmount,
      usdcAmount,
      0n, // accept any amount (first LP)
      0n,
      wallet.address,
      deadline,
      { gasLimit: 500000n }
    );
    console.log("Add liquidity tx:", liqTx.hash);
    const receipt = await liqTx.wait();
    console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block:", receipt.blockNumber);
  } catch (e) {
    console.log("Add liquidity FAILED:", e.message.slice(0, 300));
    
    // Try with KORPO/WETH instead
    console.log("\nTrying KORPO/WETH pool...");
    const wethAmount = ethers.parseEther("0.0004"); // ~$0.93 worth
    const korpoForWeth = ethers.parseEther("93"); // 93 KORPO
    
    // Need WETH first - wrap ETH
    const WETH_ABI = [
      "function deposit() payable",
      "function balanceOf(address) view returns (uint256)",
      "function approve(address, uint256) returns (bool)",
    ];
    const weth = new ethers.Contract(WETH, WETH_ABI, wallet);
    console.log("Wrapping ETH...");
    const wrapTx = await weth.deposit({ value: ethers.parseEther("0.0004"), gasLimit: 100000n });
    await wrapTx.wait();
    console.log("WETH wrapped!");
    
    // Approve WETH
    await weth.approve(UNI_ROUTER, wethAmount);
    console.log("WETH approved");
    
    // Add KORPO/WETH LP
    try {
      const liqTx2 = await router.addLiquidity(
        KORPO,
        WETH,
        korpoForWeth,
        wethAmount,
        0n, 0n,
        wallet.address,
        deadline,
        { gasLimit: 500000n }
      );
      console.log("KORPO/WETH LP tx:", liqTx2.hash);
      const r = await liqTx2.wait();
      console.log("Status:", r.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    } catch (e2) {
      console.log("KORPO/WETH also failed:", e2.message.slice(0, 200));
    }
  }

  // Final state
  console.log("\n--- Final State ---");
  const fEth = await provider.getBalance(wallet.address);
  const fUsdc = await usdc.balanceOf(wallet.address);
  const fKorpo = await korpo.balanceOf(wallet.address);
  console.log("ETH:", ethers.formatEther(fEth));
  console.log("USDC:", ethers.formatUnits(fUsdc, 6));
  console.log("KORPO:", ethers.formatEther(fKorpo));
  
  // Check if pair now exists
  try {
    const newPair = await factory.getPair(KORPO, USDC);
    console.log("KORPO/USDC pair:", newPair === ethers.ZeroAddress ? "still none" : newPair);
  } catch(e) {}
  try {
    const wethPair = await factory.getPair(KORPO, WETH);
    console.log("KORPO/WETH pair:", wethPair === ethers.ZeroAddress ? "still none" : wethPair);
  } catch(e) {}
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});