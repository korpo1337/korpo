const { ethers } = require("ethers");
require("dotenv").config();

// Add more KORPO/WETH liquidity to UniV3 on Base mainnet
// More liquidity = more likely DexScreener indexes the pair

const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WETH = "0x4200000000000000000000000000000000000006";
const NF_POS_MGR = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const SWAP_ROUTER = "0x2626664c2603336e57b63ce23ff376b3e35c6f3a";

const NF_ABI = [
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Wallet:", wallet.address);

  const wethC = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const korpoC = new ethers.Contract(KORPO, ERC20_ABI, wallet);

  const wethBal = await wethC.balanceOf(wallet.address);
  const korpoBal = await korpoC.balanceOf(wallet.address);
  console.log("WETH:", ethers.formatEther(wethBal), "KORPO:", ethers.formatEther(korpoBal));

  // We want to add ~0.002 WETH + proportional KORPO to existing LP
  // For full-range LP at 1% fee (10000), ticks are -887220 to 887220
  // Token order: KORPO < WETH alphabetically? No — "0xf970..." vs "0x4200..."
  // WETH (0x4200...) < KORPO (0xf970...) so token0=WETH, token1=KORPO

  const wethAmt = ethers.parseEther("0.002"); // Keep some for swaps
  const korpoAmt = ethers.parseEther("80"); // Keep 20 for swaps

  // Approve
  const wethAllow = await wethC.allowance(wallet.address, NF_POS_MGR);
  if (wethAllow < wethAmt) {
    console.log("Approving WETH...");
    const tx1 = await wethC.approve(NF_POS_MGR, wethAmt * 2n);
    await tx1.wait();
  }

  const korpoAllow = await korpoC.allowance(wallet.address, NF_POS_MGR);
  if (korpoAllow < korpoAmt) {
    console.log("Approving KORPO...");
    const tx2 = await korpoC.approve(NF_POS_MGR, korpoAmt * 2n);
    await tx2.wait();
  }

  // Mint new position — full range
  const nfMgr = new ethers.Contract(NF_POS_MGR, NF_ABI, wallet);

  console.log("Adding liquidity: 0.002 WETH + 80 KORPO...");
  try {
    const tx = await nfMgr.mint({
      token0: WETH,
      token1: KORPO,
      fee: 10000,
      tickLower: -887220,
      tickUpper: 887220,
      amount0Desired: wethAmt,
      amount1Desired: korpoAmt,
      amount0Min: 0n,
      amount1Min: 0n,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 600,
    }, { gasLimit: 1000000n, value: 0n });

    console.log("TX:", tx.hash);
    const receipt = await tx.wait();
    console.log(receipt.status === 1 ? "✅ LP added!" : "❌ LP failed");
  } catch (e) {
    console.log("LP mint failed:", e.message.slice(0, 300));
    // Fallback: do more swaps instead for volume
    console.log("\n↳ Fallback: aggressive swap volume instead");
    const router = new ethers.Contract(SWAP_ROUTER, [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
    ], wallet);

    for (let i = 0; i < 8; i++) {
      const dl = Math.floor(Date.now() / 1000) + 600;
      try {
        if (i % 2 === 0) {
          const tx = await router.exactInputSingle({
            tokenIn: WETH, tokenOut: KORPO, fee: 10000,
            recipient: wallet.address, deadline: dl,
            amountIn: ethers.parseEther("0.00005"), amountOutMinimum: amt / 50n  // 2% slippage, sqrtPriceLimitX96: 0n
          }, { gasLimit: 300000n });
          await tx.wait();
          console.log(`[${i + 1}/8] WETH→KORPO ✅`);
        } else {
          korpoBal_ = await korpoC.balanceOf(wallet.address);
          const sellAmt = korpoBal_ > ethers.parseEther("20") ? ethers.parseEther("20") : korpoBal_;
          const appOk = await korpoC.approve(SWAP_ROUTER, sellAmt * 10n);
          await appOk.wait();
          const tx = await router.exactInputSingle({
            tokenIn: KORPO, tokenOut: WETH, fee: 10000,
            recipient: wallet.address, deadline: dl,
            amountIn: sellAmt, amountOutMinimum: amt / 50n  // 2% slippage, sqrtPriceLimitX96: 0n
          }, { gasLimit: 300000n });
          await tx.wait();
          console.log(`[${i + 1}/8] KORPO→WETH ✅`);
        }
      } catch (e2) { console.log(`[${i + 1}/8] ❌`, e2.message.slice(0, 80)); }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const fWeth = await wethC.balanceOf(wallet.address);
  const fKorpo = await korpoC.balanceOf(wallet.address);
  console.log("\nFinal: WETH=" + ethers.formatEther(fWeth) + " KORPO=" + ethers.formatEther(fKorpo));
}

main().catch(e => console.error("FATAL:", e.message.slice(0, 300)));