const { ethers } = require("ethers");
require("dotenv").config();

// Collect UniV3 LP fees — harvests accrued WETH/KORPO fees from our position
const POS_MGR = "0x036cbdd5a6c0c6a7e6e7ac8ce401e8efb6d880d0";
const WALLET = "0xAFe3A600e81ecfB0714e28Bff82c9944C4B7666d";

// We know our NFT token ID from the createAndMint TX.
// Since we can't read balanceOf via RPC (proxy bug), we try token IDs 1-5
const POS_MGR_ABI = [
  "function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)[]) external returns (uint256 amount0, uint256 amount1)",
  "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const pm = new ethers.Contract(POS_MGR, POS_MGR_ABI, signer);

  // Try to collect fees for our LP position
  // Token ID from our createAndMint was the first one
  // Let's try collecting with MAX uint128 for both amounts
  const MAX_UINT128 = "0xffffffffffffffffffffffffffffffff"; // 2^128 - 1

  // Try token IDs that could be ours (we created the pool, so likely 1 or low number)
  for (const tokenId of [1, 2, 3]) {
    try {
      console.log(`Attempting to collect fees for token ID ${tokenId}...`);
      
      const collectParams = [{
        tokenId: tokenId,
        recipient: WALLET,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128
      }];

      const tx = await pm.collect(collectParams, {
        gasLimit: 300000,
        maxFeePerGas: ethers.parseUnits("0.01", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei")
      });

      console.log(`TX sent for token ${tokenId}: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Collected fees! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);
      return; // Success, stop trying
    } catch (e) {
      const msg = e.message || String(e);
      if (msg.includes("not owner") || msg.includes("NP") || msg.includes("Invalid token")) {
        console.log(`Token ${tokenId}: not ours, trying next...`);
        continue;
      }
      console.log(`Token ${tokenId} error: ${msg.slice(0, 120)}`);
      // If it's a "caller is not the owner" type error, try next
      // If it's a gas/revert for other reasons, might be ours but we can't collect yet
      continue;
    }
  }
  
  console.log("Could not collect fees — may need to find correct token ID from Basescan TX history");
}

main().catch(console.error);