
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
  
  console.log("=== KORPO ON-CHAIN VERIFICATION v2 ===\n");
  
  // Current state
  const myBal = await korpo.balanceOf(wallet.address);
  const totalBurned = await korpo.totalBurned();
  const totalClaimed = await korpo.totalClaimed();
  console.log(`My balance: ${ethers.formatEther(myBal)}`);
  console.log(`Total claimed: ${ethers.formatEther(totalClaimed)}`);
  console.log(`Total burned: ${ethers.formatEther(totalBurned)}`);
  
  // Test transfer with burn (200 KORPO - within balance since we have 100 already)
  // Actually we only have 100 KORPO. Transfer 50 (below threshold = no burn)
  console.log("\n--- Small transfer (50 KORPO, below threshold, no burn) ---");
  const alice = "0x1234567890123456789012345678901234567890";
  const tx1 = await korpo.transfer(alice, ethers.parseEther("50"));
  console.log(`Tx: ${tx1.hash}`);
  await tx1.wait();
  console.log(`Alice balance: ${ethers.formatEther(await korpo.balanceOf(alice))}`);
  console.log(`My balance: ${ethers.formatEther(await korpo.balanceOf(wallet.address))}`);
  console.log(`Total burned: ${ethers.formatEther(await korpo.totalBurned())} (should be 0)`);

  // Transfer above threshold now
  // We have ~50 left. Transfer to contract so it's above threshold
  console.log("\n--- Transfer above threshold (to contract, should burn 0.5%) ---");
  const tx2 = await korpo.transfer(KORPO_ADDR, ethers.parseEther("20"));
  console.log(`Tx: ${tx2.hash}`);
  const rc2 = await tx2.wait();
  console.log(`Gas used: ${rc2.gasUsed.toString()}`);
  const newBal = await korpo.balanceOf(wallet.address);
  const burnedAfter = await korpo.totalBurned();
  console.log(`My balance after: ${ethers.formatEther(newBal)}`);
  console.log(`Total burned: ${ethers.formatEther(burnedAfter)} (should be 0.1 = 0.5% of 20)`);
  
  // Test canClaim after already claimed
  const canClaim2 = await korpo.canClaim(wallet.address);
  console.log(`\nCan claim again today: ${canClaim2} (should be false)`);
  
  // Test remaining supply
  console.log(`\nRemaining supply: ${ethers.formatEther(await korpo.remainingSupply())}`);
  console.log(`Unique claimers: ${await korpo.uniqueClaimers()}`);
  
  // Test nextClaimTime  
  const nextClaim = await korpo.nextClaimTime(wallet.address);
  console.log(`Next claim time: ${nextClaim.toString()} (${new Date(Number(nextClaim)*1000).toISOString()})`);
  
  // Test timelock queue
  console.log("\n--- Timelock pause queue ---");
  const queueTx = await korpo.queueSetPaused(true);
  console.log(`Queue pause tx: ${queueTx.hash}`);
  await queueTx.wait();
  const queuedAction = await korpo.timelockQueued(await keccak256("0x8456cb62"));
  console.log(`Pause action queued: ${queuedAction}`);
  
  // Final summary
  console.log("\n=== FINAL STATE ===");
  console.log(`Contract: ${KORPO_ADDR}`);
  console.log(`Remaining: ${ethers.formatEther(await korpo.remainingSupply())}`);
  console.log(`Claimed: ${ethers.formatEther(await korpo.totalClaimed())}`);
  console.log(`Burned: ${ethers.formatEther(await korpo.totalBurned())}`);
  console.log(`Claimers: ${await korpo.uniqueClaimers()}`);
  console.log(`Owner: ${await korpo.owner()}`);
  console.log(`Paused: ${await korpo.paused()}`);
  console.log("\n✅ ON-CHAIN VERIFICATION COMPLETE");
}

// Need keccak256
const { keccak256 } = require("ethers");
// Actually ethers v6 has it differently
async function keccak256(sig) {
  return ethers.keccak256(ethers.toUtf8Bytes(sig));
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
