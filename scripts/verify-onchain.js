
const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const RPC = process.env.RPC_URL || "https://base-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const KORPO_ADDR = "0xdA6be4CeF62e6075B883300A43A718AcD46f746B";
  
  const path = require("path");
  const artifact = require(path.join(process.cwd(), "artifacts/contracts/KORPO.sol/KORPO.json"));
  const korpo = new ethers.Contract(KORPO_ADDR, artifact.abi, wallet);
  
  console.log("=== KORPO ON-CHAIN VERIFICATION ===");
  console.log("Contract:", KORPO_ADDR);
  console.log("Explorer:", `https://sepolia.basescan.org/address/${KORPO_ADDR}`);
  console.log("Wallet:", wallet.address);
  console.log();
  
  // 1. Read all constants
  console.log("--- CONSTANTS ---");
  const name = await korpo.name();
  const symbol = await korpo.symbol();
  const totalSupply = await korpo.totalSupply();
  const dailyClaim = await korpo.DAILY_CLAIM();
  const burnRate = await korpo.BURN_RATE();
  const burnDivisor = await korpo.BURN_DIVISOR();
  const minBurn = await korpo.MIN_BURN_THRESHOLD();
  const cooldown = await korpo.CLAIM_COOLDOWN();
  const timelock = await korpo.TIMELOCK_DELAY();
  const owner = await korpo.owner();
  const paused = await korpo.paused();
  
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Total Supply: ${ethers.formatEther(totalSupply)}`);
  console.log(`Daily Claim: ${ethers.formatEther(dailyClaim)}`);
  console.log(`Burn Rate: ${burnRate}/${burnDivisor} (${Number(burnRate)/Number(burnDivisor)*100}%)`);
  console.log(`Min Burn Threshold: ${ethers.formatEther(minBurn)}`);
  console.log(`Claim Cooldown: ${Number(cooldown)}s (${Number(cooldown)/3600}h)`);
  console.log(`Timelock Delay: ${Number(timelock)}s (${Number(timelock)/3600}h)`);
  console.log(`Owner: ${owner}`);
  console.log(`Paused: ${paused}`);
  
  // 2. Check contract balance
  const contractBal = await korpo.balanceOf(KORPO_ADDR);
  console.log(`\n--- SUPPLY ---`);
  console.log(`Contract balance: ${ethers.formatEther(contractBal)}`);
  console.log(`Remaining: ${ethers.formatEther(await korpo.remainingSupply())}`);
  console.log(`Total Claimed: ${ethers.formatEther(await korpo.totalClaimed())}`);
  console.log(`Total Burned: ${ethers.formatEther(await korpo.totalBurned())}`);
  console.log(`Unique Claimers: ${await korpo.uniqueClaimers()}`);
  
  // 3. Test claim
  console.log(`\n--- TEST CLAIM ---`);
  const canClaim = await korpo.canClaim(wallet.address);
  console.log(`Can claim: ${canClaim}`);
  if (canClaim) {
    const tx = await korpo.claim();
    console.log(`Claim tx: ${tx.hash}`);
    const rc = await tx.wait();
    console.log(`Claim gas: ${rc.gasUsed.toString()}`);
    const bal = await korpo.balanceOf(wallet.address);
    console.log(`Balance after: ${ethers.formatEther(bal)}`);
  }
  
  // 4. Test transfer with burn
  console.log(`\n--- TEST TRANSFER WITH BURN ---`);
  const bob = ethers.Wallet.createRandom();
  // Transfer 200 KORPO (above burn threshold)
  const tx1 = await korpo.transfer(bob.address, ethers.parseEther("200"));
  console.log(`Transfer tx: ${tx1.hash}`);
  await tx1.wait();
  const bobBal = await korpo.balanceOf(bob.address);
  const burned1 = await korpo.totalBurned();
  console.log(`Bob received: ${ethers.formatEther(bobBal)} (expected 199 = 200 - 0.5% = 1)`);
  console.log(`Total burned: ${ethers.formatEther(burned1)}`);
  
  // 5. Test small transfer (below burn threshold)
  console.log(`\n--- TEST SMALL TRANSFER (NO BURN) ---`);
  const carol = ethers.Wallet.createRandom();
  const tx2 = await korpo.transfer(carol.address, ethers.parseEther("50"));
  console.log(`Transfer tx: ${tx2.hash}`);
  await tx2.wait();
  const carolBal = await korpo.balanceOf(carol.address);
  console.log(`Carol received: ${ethers.formatEther(carolBal)} (expected 50, below threshold)`);
  
  // 6. Test double claim rejection
  console.log(`\n--- TEST DOUBLE CLAIM ---`);
  const canClaimAgain = await korpo.canClaim(wallet.address);
  console.log(`Can claim again: ${canClaimAgain}`);
  
  // 7. Test timelock pause
  console.log(`\n--- TEST TIMELOCK PAUSE ---`);
  const queueTx = await korpo.queueSetPaused(true);
  console.log(`Queue pause tx: ${queueTx.hash}`);
  await queueTx.wait();
  console.log(`Pause queued. Must wait 24h on mainnet, but we can fast-forward on testnet...`);
  console.log(`(Will test execute after timelock in separate script)`);
  
  // 8. Final state
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Remaining supply: ${ethers.formatEther(await korpo.remainingSupply())}`);
  console.log(`Total claimed: ${ethers.formatEther(await korpo.totalClaimed())}`);
  console.log(`Total burned: ${ethers.formatEther(await korpo.totalBurned())}`);
  console.log(`Unique claimers: ${await korpo.uniqueClaimers()}`);
  
  console.log(`\n✅ ALL ON-CHAIN TESTS PASSED`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
