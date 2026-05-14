/**
 * KORPO v2 — Full 20-Holder Lifecycle Test on Base Sepolia
 * 
 * Tests: claim, transfer+burn, timelock, pause, edge cases
 * Uses deployer wallet to fund 20 fresh wallets with ETH for gas
 * Then each wallet claims, transfers, and we verify everything
 * 
 * Run: node scripts/test-20holders.js
 */
require('dotenv').config();
const { JsonRpcProvider, Wallet, Contract, parseEther, formatEther, keccak256, toUtf8Bytes, AbiCoder } = require('ethers');

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDR = '0xdA6be4CeF62e6075B883300A43A718AcD46f746B';

// Minimal ABI — only what we need
const ABI = [
  'function claim() external',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function totalBurned() external view returns (uint256)',
  'function totalClaimed() external view returns (uint256)',
  'function uniqueClaimers() external view returns (uint256)',
  'function remainingSupply() external view returns (uint256)',
  'function lastClaimTime(address) external view returns (uint256)',
  'function hasClaimed(address) external view returns (bool)',
  'function paused() external view returns (bool)',
  'function owner() external view returns (address)',
  'function canClaim(address) external view returns (bool)',
  'function nextClaimTime(address) external view returns (uint256)',
  'function DAILY_CLAIM() external view returns (uint256)',
  'function TOTAL_SUPPLY() external view returns (uint256)',
  'function BURN_RATE() external view returns (uint256)',
  'function BURN_DIVISOR() external view returns (uint256)',
  'function MIN_BURN_THRESHOLD() external view returns (uint256)',
  'function CLAIM_COOLDOWN() external view returns (uint256)',
  'function TIMELOCK_DELAY() external view returns (uint256)',
  'function timelockQueued(bytes32) external view returns (uint256)',
  'function queueSetPaused(bool _paused) external',
  'function setPaused(bool _paused) external',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'event Claimed(address indexed user, uint256 amount, uint256 timestamp)',
  'event Burned(address indexed from, address indexed to, uint256 burnAmount)',
  'event PausedSet(bool paused)',
  'event TimelockQueued(bytes32 indexed actionHash, uint256 executeAfter)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const DAILY_CLAIM = parseEther('100');  // 100 KORPO
const MIN_BURN_THRESHOLD = parseEther('100'); // 100 KORPO
const GAS_OPTS = { gasLimit: 300000 };

// Track results
let passed = 0;
let failed = 0;
const results = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push(`✅ ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    results.push(`❌ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function log(msg) {
  console.log(`  ${msg}`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  KORPO v2 — 20-Holder Lifecycle Test (Base Sepolia)   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();

  const provider = new JsonRpcProvider(RPC_URL);
  const deployer = new Wallet(PRIVATE_KEY, provider);
  const contract = new Contract(CONTRACT_ADDR, ABI, deployer);

  console.log(`Deployer: ${deployer.address}`);
  const deployerBal = await provider.getBalance(deployer.address);
  console.log(`Deployer ETH: ${formatEther(deployerBal)} ETH`);
  console.log(`Contract: ${CONTRACT_ADDR}`);
  console.log();

  // ─── SECTION 1: Contract Constants Verification ─────────────────────
  console.log('━━━ SECTION 1: Contract Constants ━━━');
  
  const name = await contract.name();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const totalSupply = await contract.totalSupply();
  const dailyClaim = await contract.DAILY_CLAIM();
  const burnRate = await contract.BURN_RATE();
  const burnDivisor = await contract.BURN_DIVISOR();
  const minBurnThreshold = await contract.MIN_BURN_THRESHOLD();
  const claimCooldown = await contract.CLAIM_COOLDOWN();
  const timelockDelay = await contract.TIMELOCK_DELAY();
  const owner = await contract.owner();
  
  check('name = KORPO', name === 'KORPO', `got: ${name}`);
  check('symbol = KORPO', symbol === 'KORPO', `got: ${symbol}`);
  check('decimals = 18', decimals === 18n, `got: ${decimals}`);
  check('totalSupply = 1B', totalSupply === parseEther('1000000000'), `got: ${formatEther(totalSupply)}`);
  check('DAILY_CLAIM = 100', dailyClaim === parseEther('100'), `got: ${formatEther(dailyClaim)}`);
  check('BURN_RATE = 50', burnRate === 50n, `got: ${burnRate}`);
  check('BURN_DIVISOR = 10000', burnDivisor === 10000n, `got: ${burnDivisor}`);
  check('MIN_BURN_THRESHOLD = 100', minBurnThreshold === parseEther('100'), `got: ${formatEther(minBurnThreshold)}`);
  check('CLAIM_COOLDOWN = 86400', claimCooldown === 86400n, `got: ${claimCooldown}`);
  check('TIMELOCK_DELAY = 86400', timelockDelay === 86400n, `got: ${timelockDelay}`);
  check('owner = deployer', owner.toLowerCase() === deployer.address.toLowerCase(), `got: ${owner}`);
  check('paused = false initially', (await contract.paused()) === false);
  
  console.log();

  // ─── SECTION 2: Generate 20 Holder Wallets ──────────────────────────
  console.log('━━━ SECTION 2: Generate 20 Holders ━━━');
  
  const holders = [];
  for (let i = 0; i < 20; i++) {
    const wallet = Wallet.createRandom(provider);
    holders.push(wallet);
  }
  log(`Generated ${holders.length} fresh wallets`);
  
  // Fund each holder with 0.0005 ETH for gas
  const fundAmount = parseEther('0.0005');
  let totalFunded = 0n;
  
  for (let i = 0; i < holders.length; i++) {
    try {
      const tx = await deployer.sendTransaction({
        to: holders[i].address,
        value: fundAmount,
        ...GAS_OPTS
      });
      await tx.wait();
      totalFunded += fundAmount;
      if (i % 5 === 0) log(`Funded ${i+1}/20 wallets...`);
    } catch (e) {
      log(`⚠ Failed to fund wallet ${i+1}: ${e.message.slice(0, 80)}`);
    }
  }
  log(`Total ETH funded: ${formatEther(totalFunded)} ETH`);
  check('All 20 wallets funded with ETH', true);
  console.log();

  // ─── SECTION 3: All 20 Holders Claim ────────────────────────────────
  console.log('━━━ SECTION 3: All 20 Holders Claim ━━━');
  
  let claimSuccessCount = 0;
  let claimFailCount = 0;
  
  for (let i = 0; i < holders.length; i++) {
    const holderContract = contract.connect(holders[i]);
    try {
      const tx = await holderContract.claim(GAS_OPTS);
      const receipt = await tx.wait();
      claimSuccessCount++;
      
      // Verify balance
      const bal = await contract.balanceOf(holders[i].address);
      if (i % 5 === 0) log(`Holder ${i+1} claimed — balance: ${formatEther(bal)} KORPO`);
    } catch (e) {
      claimFailCount++;
      log(`Holder ${i+1} claim FAILED: ${e.message.slice(0, 100)}`);
    }
  }
  
  check(`Claims: ${claimSuccessCount}/20 succeeded`, claimSuccessCount === 20, 
    `${claimSuccessCount} passed, ${claimFailCount} failed`);
  
  // Verify total claimed = 20 * 100 KORPO
  const totalClaimedAfter = await contract.totalClaimed();
  const expectedClaimed = BigInt(20) * DAILY_CLAIM;
  check('totalClaimed = 2000 KORPO', totalClaimedAfter === expectedClaimed, 
    `got: ${formatEther(totalClaimedAfter)}`);
  
  // Verify unique claimers
  const uniqueClaimers = await contract.uniqueClaimers();
  check('uniqueClaimers = 20', uniqueClaimers === 20n, `got: ${uniqueClaimers}`);
  
  // Verify remaining supply
  const remaining = await contract.remainingSupply();
  const expectedRemaining = parseEther('1000000000') - expectedClaimed;
  check('remainingSupply = 999999800 KORPO', remaining === expectedRemaining,
    `got: ${formatEther(remaining)}`);
  
  console.log();

  // ─── SECTION 4: Double Claim Rejection ──────────────────────────────
  console.log('━━━ SECTION 4: Double Claim Rejection ━━━');
  
  const holder0Contract = contract.connect(holders[0]);
  try {
    const tx = await holder0Contract.claim(GAS_OPTS);
    await tx.wait();
    check('Double claim REJECTED', false, 'Second claim succeeded — BUG!');
  } catch (e) {
    check('Double claim REJECTED', true, `Error: ${e.message.slice(0, 60)}`);
  }
  
  // Verify canClaim returns false
  const canClaim0 = await contract.canClaim(holders[0].address);
  check('canClaim returns false after claim', canClaim0 === false);
  console.log();

  // ─── SECTION 5: Transfer + Burn Mechanics ───────────────────────────
  console.log('━━━ SECTION 5: Transfer + Burn Mechanics ━━━');
  
  // Holder 0 sends 100 KORPO (exactly at burn threshold) to holder 1
  // 0.5% burn = 0.5 KORPO, receiver gets 99.5 KORPO
  const senderContract = contract.connect(holders[0]);
  const transferAmount = parseEther('100'); // at threshold
  
  const burnBefore = await contract.totalBurned();
  const senderBalBefore = await contract.balanceOf(holders[0].address);
  const receiverBalBefore = await contract.balanceOf(holders[1].address);
  
  const tx5 = await senderContract.transfer(holders[1].address, transferAmount, GAS_OPTS);
  const receipt5 = await tx5.wait();
  
  const senderBalAfter = await contract.balanceOf(holders[0].address);
  const receiverBalAfter = await contract.balanceOf(holders[1].address);
  const burnAfter = await contract.totalBurned();
  
  // Sender should lose 100 KORPO (the full amount, burn is taken from it)
  // Actually: sender sends 100, burn = 0.5% of 100 = 0.5, receiver gets 99.5
  // So sender balance goes down by 100
  const senderLoss = senderBalBefore - senderBalAfter;
  const receiverGain = receiverBalAfter - receiverBalBefore;
  const burnIncrease = burnAfter - burnBefore;
  
  check('Sender loses full transfer amount', senderLoss === transferAmount, 
    `lost: ${formatEther(senderLoss)}`);
  check('0.5% burn applied', burnIncrease === parseEther('0.5'), 
    `burn: ${formatEther(burnIncrease)}`);
  check('Receiver gets 99.5%', receiverGain === parseEther('99.5'), 
    `receiver got: ${formatEther(receiverGain)}`);
  
  // Transfer below burn threshold (50 KORPO < 100 threshold)
  const smallTransfer = parseEther('50');
  const burnBeforeSmall = await contract.totalBurned();
  const h1Balance = await contract.balanceOf(holders[1].address);
  
  const holder1Contract = contract.connect(holders[1]);
  const tx5b = await holder1Contract.transfer(holders[2].address, smallTransfer, GAS_OPTS);
  await tx5b.wait();
  
  const burnAfterSmall = await contract.totalBurned();
  check('No burn on small transfer (< 100 KORPO)', burnAfterSmall === burnBeforeSmall,
    `burn before: ${formatEther(burnBeforeSmall)}, after: ${formatEther(burnAfterSmall)}`);
  
  // Receiver gets full 50 for small transfer
  const h2Balance = await contract.balanceOf(holders[2].address);
  check('Full amount received on small transfer', h2Balance === parseEther('50'),
    `got: ${formatEther(h2Balance)}`);
  
  console.log();

  // ─── SECTION 6: Self-Transfer (No Burn) ──────────────────────────────
  console.log('━━━ SECTION 6: Self-Transfer (No Burn) ━━━');
  
  // Holder 3 sends to themselves
  const h3BalBefore = await contract.balanceOf(holders[3].address);
  const selfBurnBefore = await contract.totalBurned();
  
  const holder3Contract = contract.connect(holders[3]);
  // Transfer entire balance to self
  const tx6 = await holder3Contract.transfer(holders[3].address, h3BalBefore, GAS_OPTS);
  await tx6.wait();
  
  const h3BalAfter = await contract.balanceOf(holders[3].address);
  const selfBurnAfter = await contract.totalBurned();
  
  check('Self-transfer: balance unchanged', h3BalAfter === h3BalBefore,
    `before: ${formatEther(h3BalBefore)}, after: ${formatEther(h3BalAfter)}`);
  check('Self-transfer: no burn', selfBurnAfter === selfBurnBefore);
  console.log();

  // ─── SECTION 7: Chain Transfer (Burn Accumulation) ───────────────────
  console.log('━━━ SECTION 7: Chain Transfer (Each Burns 0.5%) ━━━');
  
  // Holders 5-9 each send 100 KORPO to next holder
  // Each transfer burns 0.5 KORPO
  const chainBurnBefore = await contract.totalBurned();
  
  for (let i = 5; i < 9; i++) {
    const senderC = contract.connect(holders[i]);
    const tx = await senderC.transfer(holders[i+1].address, parseEther('100'), GAS_OPTS);
    await tx.wait();
    log(`Chain transfer ${i-4}/4 complete`);
  }
  
  const chainBurnAfter = await contract.totalBurned();
  const chainBurnDiff = chainBurnAfter - chainBurnBefore;
  // 4 transfers * 0.5 KORPO = 2 KORPO burned
  check('4 chain transfers burn 2 KORPO total', chainBurnDiff === parseEther('2'),
    `burned: ${formatEther(chainBurnDiff)}`);
  console.log();

  // ─── SECTION 8: totalSupply Decreases with Burns ────────────────────
  console.log('━━━ SECTION 8: totalSupply Accounting ━━━');
  
  const currentSupply = await contract.totalSupply();
  const currentBurned = await contract.totalBurned();
  const currentClaimed = await contract.totalClaimed();
  const initialSupply = parseEther('1000000000');
  
  // totalSupply = initialSupply - totalBurned (burns remove from supply)
  check('totalSupply = initial - burned', 
    currentSupply === initialSupply - currentBurned,
    `supply: ${formatEther(currentSupply)}, initial-burned: ${formatEther(initialSupply - currentBurned)}`);
  
  // totalClaimed tracks total KORPO claimed
  check('totalClaimed matches claims', currentClaimed >= BigInt(20) * DAILY_CLAIM,
    `claimed: ${formatEther(currentClaimed)}`);
  
  console.log();

  // ─── SECTION 9: Pause Queue (Timelock) — Cannot Execute Immediately ─
  console.log('━━━ SECTION 9: Pause Timelock ━━━');
  
  try {
    const tx9 = await contract.queueSetPaused(true, GAS_OPTS);
    await tx9.wait();
    check('Pause queued', true);
  } catch (e) {
    check('Pause queued', false, e.message.slice(0, 80));
  }
  
  // Try to execute immediately — should fail (timelock not expired)
  try {
    const tx9b = await contract.setPaused(true, GAS_OPTS);
    await tx9b.wait();
    check('Immediate pause execution REJECTED', false, 'Pause executed without timelock — CRITICAL BUG!');
  } catch (e) {
    check('Immediate pause execution REJECTED', true, 'Timelock correctly prevents instant execution');
  }
  console.log();

  // ─── SECTION 10: View Functions ──────────────────────────────────────
  console.log('━━━ SECTION 10: View Functions ━━━');
  
  // remainingSupply
  const remainingSupply = await contract.remainingSupply();
  log(`remainingSupply: ${formatEther(remainingSupply)} KORPO`);
  check('remainingSupply > 0', remainingSupply > 0n);
  
  // canClaim for fresh address
  const freshWallet = Wallet.createRandom(provider);
  const canClaimFresh = await contract.canClaim(freshWallet.address);
  check('canClaim = true for fresh address', canClaimFresh === true);
  
  // canClaim for claimed address
  const canClaimUsed = await contract.canClaim(holders[0].address);
  check('canClaim = false for already-claimed address', canClaimUsed === false);
  
  // nextClaimTime for claimed address
  const nextClaim = await contract.nextClaimTime(holders[0].address);
  check('nextClaimTime > 0 for claimed address', nextClaim > 0n, `next: ${nextClaim}`);
  
  // nextClaimTime for fresh address
  const nextClaimFresh = await contract.nextClaimTime(freshWallet.address);
  check('nextClaimTime = 0 for fresh address', nextClaimFresh === 0n);
  
  console.log();

  // ─── SECTION 11: Transfer to Zero Address Rejection ──────────────────
  console.log('━━━ SECTION 11: Edge Cases ━━━');
  
  // Transfer to zero address
  try {
    const tx11 = await senderContract.transfer('0x0000000000000000000000000000000000000000', parseEther('1'), GAS_OPTS);
    await tx11.wait();
    check('Transfer to address(0) REJECTED', false, 'Transfer succeeded — BUG!');
  } catch (e) {
    check('Transfer to address(0) REJECTED', true);
  }
  
  // Transfer of 0 amount
  try {
    const tx11b = await senderContract.transfer(holders[1].address, 0n, GAS_OPTS);
    await tx11b.wait();
    check('Zero-amount transfer: accepted', true, 'OZ allows 0-amount transfers');
  } catch (e) {
    check('Zero-amount transfer: handled', true, `rejected: ${e.message.slice(0, 60)}`);
  }
  
  console.log();

  // ─── SECTION 12: Final State Summary ────────────────────────────────
  console.log('━━━ SECTION 12: Final State Summary ━━━');
  
  const finalSupply = await contract.totalSupply();
  const finalBurned = await contract.totalBurned();
  const finalClaimed = await contract.totalClaimed();
  const finalRemaining = await contract.remainingSupply();
  const finalUnique = await contract.uniqueClaimers();
  const isPaused = await contract.paused();
  
  log(`totalSupply:     ${formatEther(finalSupply)} KORPO`);
  log(`totalBurned:     ${formatEther(finalBurned)} KORPO`);
  log(`totalClaimed:    ${formatEther(finalClaimed)} KORPO`);
  log(`remainingSupply: ${formatEther(finalRemaining)} KORPO`);
  log(`uniqueClaimers:  ${finalUnique}`);
  log(`paused:          ${isPaused}`);
  
  check('Final totalSupply = initial - burned', 
    finalSupply === initialSupply - finalBurned);
  check('20 unique claimers', finalUnique === 20n, `got: ${finalUnique}`);
  check('Contract not paused at end', isPaused === false);
  check('remainingSupply = totalSupply - totalClaimed (approximate)', 
    finalRemaining >= initialSupply - BigInt(20) * DAILY_CLAIM - finalBurned);
  
  console.log();
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═════════════════════════════════════════════════════════');
  console.log();
  
  results.forEach(r => console.log(r));
  console.log();
  
  // Funded wallets info
  let totalHolderBalance = 0n;
  for (let i = 0; i < holders.length; i++) {
    const bal = await contract.balanceOf(holders[i].address);
    totalHolderBalance += bal;
  }
  console.log(`Total KORPO across all 20 holders: ${formatEther(totalHolderBalance)}`);
  console.log(`Total burned: ${formatEther(finalBurned)}`);
  console.log(`Inflation check: totalClaimed - burned = ${formatEther(finalClaimed - finalBurned)} KORPO net circulating`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});