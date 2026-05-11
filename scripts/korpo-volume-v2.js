const { ethers } = require("ethers");
require("dotenv").config();

// KORPO Volume Generator v2 — aggressive mode for DexScreener indexing
// Does multiple swap rounds in one execution to build up trading volume

const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WETH = "0x4200000000000000000000000000000000000006";
const SWAP_ROUTER = "0x2626664c2603336e57b63ce23ff376b3e35c6f3a";
const ROUNDS = 4; // 4 swap rounds per execution

const SWAP_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
  "function multicall(bytes[] data) external payable returns (bytes[] results)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(SWAP_ROUTER, SWAP_ABI, wallet);
  const korpoContract = new ethers.Contract(KORPO, ERC20_ABI, wallet);
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
  
  let wethBal = await wethContract.balanceOf(wallet.address);
  let korpoBal = await korpoContract.balanceOf(wallet.address);
  console.log(`Start: WETH=${ethers.formatEther(wethBal)} KORPO=${ethers.formatEther(korpoBal)}`);

  for (let i = 0; i < ROUNDS; i++) {
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    try {
      if (i % 2 === 0) {
        // Swap WETH -> KORPO
        const amt = wethBal > ethers.parseEther("0.0002") ? ethers.parseEther("0.0001") : ethers.parseEther("0.00005");
        console.log(`\n[${i+1}/${ROUNDS}] WETH→KORPO ${ethers.formatEther(amt)}`);
        const tx = await router.exactInputSingle({
          tokenIn: WETH, tokenOut: KORPO, fee: 10000,
          recipient: wallet.address, deadline,
          amountIn: amt, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n
        }, { gasLimit: 300000n });
        await tx.wait();
        console.log("✅", tx.hash.slice(0,10) + "...");
      } else {
        // Swap KORPO -> WETH
        korpoBal = await korpoContract.balanceOf(wallet.address);
        if (korpoBal > ethers.parseEther("50")) {
          const amt = ethers.parseEther("50");
          console.log(`\n[${i+1}/${ROUNDS}] KORPO→WETH ${ethers.formatEther(amt)}`);
          // Approve KORPO for router
          const allowance = await new ethers.Contract(KORPO, ["function allowance(address,address)view returns(uint256)"], wallet).allowance(wallet.address, SWAP_ROUTER);
          if (allowance < amt) {
            const approveTx = await korpoContract.approve(SWAP_ROUTER, amt * 10n);
            await approveTx.wait();
          }
          const tx = await router.exactInputSingle({
            tokenIn: KORPO, tokenOut: WETH, fee: 10000,
            recipient: wallet.address, deadline,
            amountIn: amt, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n
          }, { gasLimit: 300000n });
          await tx.wait();
          console.log("✅", tx.hash.slice(0,10) + "...");
        } else {
          console.log(`\n[${i+1}/${ROUNDS}] Skip KORPO→WETH (insufficient balance)`);
        }
      }
      wethBal = await wethContract.balanceOf(wallet.address);
    } catch (e) {
      console.log(`❌ Round ${i+1} failed:`, e.message.slice(0, 120));
    }
    // Small delay between rounds to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  // Also try to claim if possible
  try {
    const korpoFull = new ethers.Contract(KORPO, ["function canClaim(address)view returns(bool)", "function claim()"], wallet);
    if (await korpoFull.canClaim(wallet.address)) {
      console.log("\nClaiming daily UBI...");
      const claimTx = await korpoFull.claim({ gasLimit: 500000n });
      await claimTx.wait();
      console.log("✅ Claimed 100 KORPO");
    }
  } catch (e) { /* can't claim yet, that's fine */ }

  // Final stats
  const finalEth = await provider.getBalance(wallet.address);
  const finalWeth = await wethContract.balanceOf(wallet.address);
  const finalKorpo = await korpoContract.balanceOf(wallet.address);
  console.log(`\nFinal: ETH=${ethers.formatEther(finalEth)} WETH=${ethers.formatEther(finalWeth)} KORPO=${ethers.formatEther(finalKorpo)}`);
}

main().catch(e => console.error("FATAL:", e.message.slice(0, 200)));