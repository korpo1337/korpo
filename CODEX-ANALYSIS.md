# KORPO v2 Contract, Scripts, and Launch Page Analysis

Analysis date: 2026-05-11

Scope reviewed:

- `contracts/KORPO.sol`
- `scripts/*.js`
- `/var/www/korpo/index.html`
- Local test suite: `npx hardhat test` passed, 55/55.

Reference checks used:

- Aave help confirms Aave V3 is deployed on Base and describes direct smart-contract access: https://aave.com/help/aave-101/accessing-aave
- Aave Base deployment references commonly list `PoolV3 = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`; current scripts use `0x13a74610ad9263d02d39e2a5003e2778c7a3a7aa`.
- Official Uniswap v3 Base deployments list `NonfungiblePositionManager = 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`, `SwapRouter02 = 0x2626664c2603336E57B271c5C0b26F421741e481`, `UniversalRouter = 0x198EF79F1F515F02dFE9e3115eD9fC07183f02fC`: https://gov.uniswap.org/t/official-uniswap-v3-deployments-list/24323

## Executive Summary

KORPO v2 is intentionally simple and mostly secure as a fair-claim ERC20. The main contract risks are not classic exploits but economic/operational issues: unlimited Sybil claims, admin pause centralization until ownership is renounced, and router/LP integration side effects from the burn-on-transfer design.

The highest-impact fixes are:

1. Cache repeated storage reads in `claim()` and the timelock modifier.
2. Remove `ReentrancyGuard` from `claim()` unless future hooks/external callbacks are added.
3. Add an explicit insufficient-reserve check before increasing `totalClaimed`.
4. Fix scripts that use wrong or inconsistent protocol addresses.
5. Never use `amountOutMinimum: 0` in swap scripts.
6. Stop volume-generation scripts from repeatedly approving spenders and from creating artificial wash-like activity.
7. Add launch-page proof, trust, social, and sharing surfaces. Current page is a working claim page, but it is thin as a conversion page.

Observed local gas:

- First claim: ~146,387 gas.
- Transfer with burn: ~78,919 gas.
- Transfer without burn: ~51,965 gas.

## Contract Speed / Gas Review

### 1. `claim()` performs avoidable storage work

Current code:

```solidity
require(
    block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN,
    "KORPO: already claimed today"
);

if (!hasClaimed[msg.sender]) {
    hasClaimed[msg.sender] = true;
    uniqueClaimers++;
}

lastClaimTime[msg.sender] = block.timestamp;
totalClaimed += DAILY_CLAIM;
_transfer(address(this), msg.sender, DAILY_CLAIM);
emit Claimed(msg.sender, DAILY_CLAIM, block.timestamp);
```

Recommended rewrite:

```solidity
function claim() external notPaused {
    address user = msg.sender;
    uint256 now_ = block.timestamp;
    uint256 last = lastClaimTime[user];

    require(now_ >= last + CLAIM_COOLDOWN, "KORPO: already claimed today");
    require(balanceOf(address(this)) >= DAILY_CLAIM, "KORPO: claim supply exhausted");

    if (!hasClaimed[user]) {
        hasClaimed[user] = true;
        unchecked { ++uniqueClaimers; }
    }

    lastClaimTime[user] = now_;
    unchecked { totalClaimed += DAILY_CLAIM; }

    _transfer(address(this), user, DAILY_CLAIM);
    emit Claimed(user, DAILY_CLAIM, now_);
}
```

Why:

- `msg.sender` and `block.timestamp` are used multiple times; caching reduces repeated opcodes and improves readability.
- `unchecked` is acceptable for `uniqueClaimers` and `totalClaimed` because neither can realistically approach `uint256` overflow. `totalClaimed` is bounded by practical supply distribution. For stricter accounting, use a supply-exhausted check as above.
- The explicit supply check prevents `totalClaimed` from being incremented before `_transfer` reverts if contract reserves are exhausted. A revert rolls back state anyway, so this is not a current exploit, but the error becomes accurate and future-safe.

### 2. `nonReentrant` on `claim()` is probably wasted gas

`claim()` does not call untrusted external contracts. `_transfer()` is an internal ERC20 balance update and emits events only. `nonReentrant` adds an SLOAD and SSTORE path to every claim.

Recommendation:

- Remove `ReentrancyGuard` import.
- Remove `is ReentrancyGuard`.
- Remove `nonReentrant` from `claim()`.

Keep it only if a future version adds callbacks, fee forwarding, reward claims, hooks, ERC777-like interactions, or external protocol calls inside `claim()`.

### 3. Timelock modifier reads the same mapping twice

Current:

```solidity
require(
    timelockQueued[actionHash] != 0 && block.timestamp >= timelockQueued[actionHash],
    "KORPO: action not queued or timelock not expired"
);
delete timelockQueued[actionHash];
```

Recommended:

```solidity
modifier withTimelock(bytes32 actionHash) {
    uint256 executeAfter = timelockQueued[actionHash];
    require(
        executeAfter != 0 && block.timestamp >= executeAfter,
        "KORPO: action not queued or timelock not expired"
    );
    delete timelockQueued[actionHash];
    emit TimelockExecuted(actionHash);
    _;
}
```

This saves one SLOAD on owner actions.

### 4. `_queueAction()` recomputes timestamp

Current:

```solidity
timelockQueued[actionHash] = block.timestamp + TIMELOCK_DELAY;
emit TimelockQueued(actionHash, block.timestamp + TIMELOCK_DELAY);
```

Recommended:

```solidity
function _queueAction(bytes32 actionHash) internal {
    uint256 executeAfter = block.timestamp + TIMELOCK_DELAY;
    timelockQueued[actionHash] = executeAfter;
    emit TimelockQueued(actionHash, executeAfter);
}
```

Small, clean improvement.

### 5. `_update()` burn path is expensive by design

The burn path calls `super._update()` twice:

```solidity
super._update(from, address(0), burnAmount);
totalBurned += burnAmount;
super._update(from, to, value - burnAmount);
```

That is correct and safe with OpenZeppelin ERC20, but it causes two balance updates and two transfer events on burn transfers. The gas is acceptable at ~79k locally.

Do not replace this with direct `_balances` manipulation because OpenZeppelin keeps balances private and preserving ERC20 event semantics matters.

Possible micro-optimization:

```solidity
uint256 burnAmount = value / 200; // exactly 0.5%
```

This works only while `BURN_RATE = 50` and `BURN_DIVISOR = 10000` are constants forever. It is less self-documenting than the current formula, so I would not prioritize it.

### 6. Replace revert strings with custom errors if redeploying

Custom errors reduce deployment bytecode and revert gas:

```solidity
error ClaimsPaused();
error AlreadyClaimedToday();
error ActionNotReady();
error ZeroAddress();
error ClaimSupplyExhausted();
```

Example:

```solidity
if (paused) revert ClaimsPaused();
if (now_ < last + CLAIM_COOLDOWN) revert AlreadyClaimedToday();
```

This is worthwhile if you plan a v3 deployment. For an already deployed token, do not redeploy solely for this.

### 7. Storage packing is already decent, but can improve only with type changes

`paused` sits alone in a slot because the following fields are `uint256`. You could use `uint64` for timestamps/counters where bounded and pack fields, but the benefit is not large enough to justify reducing type simplicity unless deploying a new contract.

Potential v3 layout:

```solidity
bool public paused;
uint64 public uniqueClaimers; // enough for practical wallets
uint64 public reserved1;
uint128 public reserved2;
```

Mapping values could be `uint64 lastClaimTime`, but Solidity mappings still hash to separate slots; savings come from lower arithmetic/storage costs only in limited cases.

## Revenue / DeFi Opportunities

### Current setup

The repo currently points at three revenue/footprint ideas:

- Aave V3 USDC supply (`aave-usdc-supply.js`, `base-defi-farm.js`).
- Uniswap V3 KORPO/WETH LP (`uni-v3-lp.js`, `boost-lp.js`).
- Daily KORPO claims (`claim-daily.js`, website claim).

### Critical script issues before any revenue work

1. Aave Pool address appears wrong in two scripts.

   - `scripts/aave-usdc-supply.js` and `scripts/base-defi-farm.js` use `0x13a74610ad9263d02d39e2a5003e2778c7a3a7aa`.
   - Current Base Aave V3 references commonly list PoolV3 as `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`.
   - Fix this before sending funds.

2. Uniswap V3 position manager is inconsistent.

   - `scripts/boost-lp.js` uses official Base `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`.
   - `scripts/uni-v3-lp.js` uses `0x036cbdd5a6c0c6a7e6e7ac8ce401e8efb6d880d0`, which is not the official address from the Uniswap deployment list.
   - Use one constants file and one verified address source.

3. Swap scripts use `amountOutMinimum: 0`.

   This is the biggest capital leak risk. Any swap can be sandwiched or executed at a terrible price.

   Recommended:

   - Quote via `QuoterV2` or a trusted routing API.
   - Apply slippage, e.g. 1-3% for liquid routes, wider only for knowingly illiquid KORPO routes.
   - Abort if output is too low.

4. Full-range UniV3 LP is capital-inefficient.

   Full-range LP earns almost nothing unless volume is high and capital is meaningful. With tiny capital, concentrated LP around current price is better for fee generation, but it requires active management.

### Near-zero capital yield opportunities

These are ranked by practicality:

1. **Fee-on-claim referral reward paid in KORPO, not ETH**

   Let users share a referral link and pass `referrer` into a new claim function:

   ```solidity
   function claimWithReferrer(address referrer) external { ... }
   ```

   Pay a small KORPO bonus from the claim reserve, e.g. +5 KORPO to the claimer and +5 KORPO to the referrer, capped per address. This creates growth without needing ETH/USDC capital. It does dilute distribution speed, so include a fixed referral budget.

2. **Keeper-triggered daily claim streaks**

   Add a streak multiplier, not external yield:

   - Day 1-6: 100 KORPO.
   - Day 7: 150 KORPO.
   - Missed day resets streak.

   This increases daily retention. It costs token supply, not external capital.

3. **Protocol-owned LP NFT fee collection**

   If the owner/deployer owns the UniV3 NFT, add a script to call `collect()` regularly and publish fee stats. Fees can fund gas, contests, or buy-and-burn.

   Current scripts mint LP but do not appear to collect and report fees.

4. **KORPO buy-and-burn from LP fees**

   If LP fees are in WETH/USDC, periodically use a portion to buy KORPO and send to `address(0)` or a public burn address. This is narratively stronger than passive fee retention.

5. **Aave supply for idle USDC only**

   Use Aave for idle USDC, but do not overstate yield. At tiny balances, absolute earnings are negligible. Its value is operational: reserves stay productive and transparent.

6. **Morpho vaults on Base**

   Morpho vaults can offer higher stablecoin yield than Aave, but vault risk is curator/collateral dependent. This is not "near-zero risk." If used, isolate treasury funds and publish vault address/risk.

7. **Aerodrome voting/gauge strategy**

   Real revenue requires liquidity and/or voting power. With near-zero capital, do not chase this yet. The better move is to get a clean KORPO/WETH or KORPO/USDC pool indexed, then later pursue incentives if community liquidity exists.

8. **Quest/growth incentives funded by unclaimed KORPO**

   Build on-chain actions that distribute KORPO for useful behavior: first LP, first swap, seventh claim, holding for 30 days. This is not yield in financial terms, but it converts dormant token inventory into growth.

### Revenue strategy to avoid

- Wash-volume scripts that alternate swaps to get indexed. They leak fees/slippage, create ugly on-chain optics, and can look manipulative.
- Borrowing against treasury assets to farm airdrops. This adds liquidation and operational risk that does not fit a fair-claim token.
- Any strategy that requires the token contract itself to custody LP NFTs or external assets unless the contract is redesigned and audited.

## Exposure Growth / Viral Mechanics

KORPO's current contract intentionally says "No referral." That supports fairness but removes the strongest on-chain growth loop. A v3 can preserve fairness while adding capped, transparent referral mechanics.

### 1. Referral claims

Suggested design:

```solidity
mapping(address => address) public referrerOf;
mapping(address => uint256) public referralCount;

uint256 public constant REFERRAL_BONUS = 5e18;
uint256 public constant REFERRAL_BUDGET = 50_000_000e18;
uint256 public referralPaid;

event ReferralSet(address indexed user, address indexed referrer);
event ReferralPaid(address indexed user, address indexed referrer, uint256 userBonus, uint256 referrerBonus);

function claimWithReferrer(address referrer) external {
    // Same claim rules.
    // If first claim and referrer is valid:
    // - referrer != msg.sender
    // - referrerOf[msg.sender] == address(0)
    // - hasClaimed[referrer] == true, optional quality gate
    // - referralPaid + 2 * REFERRAL_BONUS <= REFERRAL_BUDGET
}
```

Quality gates:

- Referrer must have claimed before.
- Referrer cannot be the user.
- One immutable referrer per wallet.
- Optional: referrer only earns if they still hold at least 100 KORPO.

Do not pay ETH referral fees. That invites farming and drains treasury.

### 2. Claim streaks

Streaks are simple, understandable, and shareable:

```solidity
mapping(address => uint16) public streak;
mapping(address => uint256) public lastClaimDay;
```

Use day buckets:

```solidity
uint256 day = block.timestamp / 1 days;
```

Then:

- If `day == lastClaimDay[user] + 1`, increment streak.
- If `day > lastClaimDay[user] + 1`, reset to 1.
- Every 7th consecutive claim pays a capped bonus.

This is more viral than pure 24-hour cooldown because users have a reason to return and post streaks.

### 3. Holder fee distribution

A fee redistribution token can go viral, but it adds heavy complexity:

- Reflection accounting increases transfer gas and integration risk.
- Fee-on-transfer tokens can break routers, aggregators, bridges, and CEX listings.
- KORPO already has burn-on-transfer, so adding reflection makes integrations worse.

Recommendation:

- Do not add automatic holder redistribution inside the ERC20.
- If you want holder rewards, use an external Merkle distributor funded by LP fees or explicit treasury deposits.

### 4. Auto-compounding

There is no native yield source inside KORPO. "Auto-compounding" would need staking, LP positions, or treasury assets. Implement externally:

- A staking contract where users deposit KORPO.
- Rewards funded by a fixed KORPO emission pool or collected LP fees.
- No rebasing; keep base ERC20 simple.

### 5. Burn leaderboard

Because transfers burn, make burn a social object:

- Track `burnedBy[address]`.
- Emit richer events on burn.
- Website leaderboard: top burners, top referrers, current streaks.

Contract addition:

```solidity
mapping(address => uint256) public burnedBy;
...
burnedBy[from] += burnAmount;
```

This adds one SLOAD/SSTORE on every burn transfer, so only add it if the leaderboard is a central growth feature.

### 6. On-chain invite codes

Referral links can be wallet addresses. For nicer UX, generate invite codes off-chain and resolve to referrer addresses in the website. Do not store strings on-chain.

### 7. Claim-to-share events

The existing `Claimed(user, amount, timestamp)` event is good. Add indexed streak/referrer fields in v3 if growth features are added:

```solidity
event Claimed(address indexed user, uint256 amount, uint256 timestamp, uint16 streak, address indexed referrer);
```

This helps dashboards and social bots.

## Security Audit Notes

### Claim function

Current strengths:

- State is updated before transfer.
- Claim transfer is from `address(this)`, exempt from burn.
- Cooldown is enforced by timestamp.
- Pause only affects claims, not transfers.

Risks and recommendations:

1. **No Sybil resistance**

   Every address can claim 100 KORPO/day. This is expected, but economically it means one funded actor can farm many wallets. If this is unacceptable, add a cost or proof:

   - Require a tiny ETH fee routed to treasury or burn. This reduces "free UBI" purity.
   - Require Base account age/activity via an oracle or allowlist. This adds centralization.
   - Keep as-is and market it honestly as per-wallet distribution, not per-human UBI.

2. **Timestamp boundary**

   Miners/validators can influence timestamps slightly. On Base this is not a meaningful exploit for a 24h cooldown.

3. **Supply exhaustion**

   `_transfer(address(this), user, DAILY_CLAIM)` reverts if reserves are exhausted, rolling back `totalClaimed`. Still add `require(balanceOf(address(this)) >= DAILY_CLAIM)` for clearer failure and future-proofing.

4. **Paused centralization**

   Owner can pause claims after 24h delay. This is transparent but still central. If "fully immutable" is a launch claim, ownership should be renounced after launch operations, or the owner should be a public multisig/timelock.

### Burn logic

Current strengths:

- No burn on mint, zero-address burn, contract-origin claims, or self-transfer.
- Burn threshold prevents dust grief.
- Burn amount is deducted from sent value; sender loses `value`, recipient gets `value - burn`.

Integration risks:

1. **Fee-on-transfer compatibility**

   Routers and LP scripts must account for fee-on-transfer behavior when KORPO is token input. Uniswap V3 exact-input will transfer `amountIn`, but the pool receives less after burn. This can break assumptions and worsen slippage.

2. **Adding liquidity with KORPO may be affected**

   LP managers transferring KORPO from the wallet may receive less than `amount1Desired` if transfer burn applies. Minting can revert or produce unexpected ratios. Scripts must simulate before sending.

3. **Transfers to the token contract burn**

   `from != address(this)` is exempt, but `to == address(this)` is not exempt. Sending KORPO back to the contract burns 0.5% if over threshold. This is probably fine, but document it.

4. **No exclusion list**

   Simplicity is good. Do not add arbitrary fee exemptions controlled by owner; that creates trust issues. If needed, hardcode known protocol exemptions before deployment and disclose them.

### Timelock

Current strengths:

- Queue and execute are separate.
- Action hash includes action type and argument.
- Action is deleted before execution.

Issues and recommendations:

1. **No cancellation**

   Once queued, an action remains executable after delay until used. Add:

   ```solidity
   function cancelAction(bytes32 actionHash) external onlyOwner {
       require(timelockQueued[actionHash] != 0, "KORPO: not queued");
       delete timelockQueued[actionHash];
       emit TimelockCancelled(actionHash);
   }
   ```

2. **Queue overwrite**

   Owner can requeue the same action and push its execution time forward. That is not a theft vector, but it can confuse watchers. Consider:

   ```solidity
   require(timelockQueued[actionHash] == 0, "KORPO: already queued");
   ```

3. **24h delay may be short**

   For a fair community token, 48-72h gives users more time to react to a pause/ownership transfer. The tradeoff is slower incident response.

4. **Tests/scripts mismatch**

   `scripts/test-20holders-v2.js` references `timelockActions(bytes32)`, but the contract exposes `timelockQueued(bytes32)`. That script will fail or report bad data.

### Website security/UX bugs

1. Claim button is enabled even during cooldown.

   `updateCooldownDisplay()` always sets `claimBtn.disabled = false` if connected, even when not ready. This pushes users into reverting transactions.

   Fix:

   ```js
   document.getElementById('claimBtn').disabled = !ready;
   document.getElementById('claimBtn').textContent = ready ? 'Claim UBI' : 'Claim available in ' + formatCooldown(cooldownRemaining);
   ```

2. `target="__blank"` typo.

   Use `target="_blank" rel="noopener noreferrer"` for external links.

3. Unused `approve` and `allowance` ABI entries.

   Remove them from the website ABI. The claim page does not need token approvals.

4. No `accountsChanged` / `chainChanged` handlers.

   Add listeners to refresh state or reload.

5. No fallback read-only state before wallet connect.

   The hero shows static numbers until wallet connect. Use a read-only provider to populate `totalClaimed`, `remainingSupply`, and `totalSupply` on page load.

## Script Review

### `scripts/aave-usdc-supply.js`

Problems:

- Likely wrong Aave Pool address.
- Always approves exact amount before supply, even if allowance exists.
- Fallback swap uses `amountOutMinimum: 0`.
- Fallback swaps capital just because Aave failed; that is dangerous. A protocol address/RPC failure should not automatically trigger a trade.

Recommendations:

- Use a shared `scripts/config/base.js` with verified addresses.
- Check allowance before approve.
- Remove fallback swap. Fail closed.
- Add `callStatic`/simulation before sending.

### `scripts/base-defi-farm.js`

Problems:

- Same likely wrong Aave Pool address.
- `AAVE_USDC` is marked placeholder.
- Morpho addresses are placeholders.
- Fallback buy uses `amountOutMinimum: 0`.

Recommendation:

- Treat this as experimental only. Do not run on mainnet until placeholders are removed.

### `scripts/uni-v3-lp.js`

Problems:

- Uses non-official position manager address.
- Calculates `sqrtPriceX96` using JavaScript `Number`, which loses precision.
- Uses `amount0Min: 0` and `amount1Min: 0`.
- Mints full-range liquidity, which is inefficient.

Recommendations:

- Use official `0x03a520...` position manager.
- Use SDK math or BigInt fixed-point math for price.
- Use nonzero minimums.
- Consider a narrow, explicit tick range around current price.

### `scripts/boost-lp.js`

Problems:

- Uses official position manager, good.
- Fallback aggressive swaps use `amountOutMinimum: 0`.
- Has undeclared `korpoBal_`, which becomes global in non-strict JS.
- Repeatedly approves inside loop.

Recommendations:

- Add `"use strict";`.
- Declare `let korpoBal_`.
- Pre-approve once or use Permit2 where appropriate.
- Remove swap fallback or quote with slippage.

### `scripts/korpo-volume*.js`

Problems:

- Artificial volume generation leaks fees and can look manipulative.
- `korpo-volume.js` imports artifact from `./artifacts/...`, but from inside `scripts/` that path is likely wrong. Other scripts use `process.cwd()` or `fs.readFileSync("./artifacts/...")`.
- Swaps use `amountOutMinimum: 0`.

Recommendation:

- Replace with a `market-health.js` script that reports liquidity, price, volume, and claim stats without trading.

### `scripts/create-mainnet-lp.js`

Problems:

- Aerodrome router/factory addresses should be reverified before use.
- Fallback to Uniswap V2 is questionable for Base and may not be the intended deployment.
- Uses fixed tiny amounts and comments with inconsistent implied price.
- Uses 5% min slippage for LP creation, broad for low-liquidity launch.

Recommendation:

- Split Aerodrome and Uniswap into separate scripts.
- No fallback that changes venue.
- Dry-run/simulate before sending.

### `scripts/verify-onchain2.js`

Problems:

- Defines `keccak256` twice: imported const and async function with same name. This is invalid in Node and should fail parsing.
- Uses wrong action hash logic for timelock queue.
- Transfers "above threshold" comment says 20 KORPO should burn, but threshold is 100 KORPO, so it should not burn.

Recommendation:

- Delete or rewrite. It is stale and dangerous as a verification script.

### `package.json`

Problem:

- `npm test` intentionally fails.

Recommendation:

```json
"scripts": {
  "test": "hardhat test"
}
```

## Launch Page Conversion Review

The page is visually polished and has a working wallet claim flow, but it is missing trust and conversion elements that matter for token launches.

### What works

- Clear claim CTA.
- Mobile-responsive layout.
- Contract, Uniswap, and DexScreener links are present.
- Metadata and OG tags exist.
- Wallet UX is simple.

### What is missing

1. **KORPO identity in first viewport**

   The H1 says "Universal Basic Income On Chain"; the token name is only logo text. For launch conversion, make `KORPO` the dominant first-viewport signal.

   Better H1:

   ```html
   <h1>KORPO</h1>
   <p>Claim 100 KORPO daily on Base. No presale. No team allocation. Transfer burn creates scarcity as usage grows.</p>
   ```

2. **Proof block above the fold**

   Add:

   - Contract address with copy button.
   - Ownership status.
   - Pause status.
   - Total claimers.
   - Total burned.
   - Liquidity link.

3. **Trust section**

   Add direct links:

   - BaseScan verified source.
   - GitHub repo.
   - Audit/threat model docs if public.
   - Timelock explanation.

4. **Social/community CTAs**

   There are no X, Farcaster, Telegram, Discord, Mirror, or GitHub links. A token launch page needs at least one community path.

5. **Share/referral loop**

   Even before on-chain referrals, add share buttons:

   - "Share your claim"
   - "Invite a friend"
   - Pre-filled Farcaster/X text with contract link.

6. **Live stats without connecting wallet**

   Use a read-only RPC call on page load. Users should see movement before trusting the wallet connect.

7. **Claim disabled during cooldown**

   Current JS enables the button during cooldown and will cause avoidable failed transactions. Disable until ready.

8. **Liquidity and price context**

   Add DexScreener embed/link with:

   - Price.
   - Liquidity.
   - 24h volume.
   - Warning if liquidity is tiny.

9. **Risk disclosure**

   Add a short plain-English risk section:

   - Wallets can claim daily; Sybil farming is possible.
   - KORPO is volatile.
   - Transfers over 100 KORPO burn 0.5%.
   - DEX liquidity may be low.

10. **Performance**

   The animated orb background and Google Fonts are fine visually, but conversion pages should optimize load:

   - Self-host font or use system font.
   - Respect `prefers-reduced-motion`.
   - Reduce heavy blur layers on mobile.

### Website code fix snippet

```js
function updateCooldownDisplay(){
  const ready = cooldownRemaining <= 0;
  document.getElementById('cooldownDisplay').textContent = ready ? 'Ready!' : formatCooldown(cooldownRemaining);
  document.getElementById('wiNextClaim').textContent = ready ? 'Now!' : formatCooldown(cooldownRemaining);
  if(userAddress){
    const btn = document.getElementById('claimBtn');
    btn.disabled = !ready;
    btn.textContent = ready ? 'Claim UBI' : 'Claim available in ' + formatCooldown(cooldownRemaining);
  }
}

if (window.ethereum) {
  window.ethereum.on('accountsChanged', () => window.location.reload());
  window.ethereum.on('chainChanged', () => window.location.reload());
}
```

## Priority Action Plan

### Immediate

1. Fix Aave and Uniswap address constants.
2. Remove every `amountOutMinimum: 0` from scripts.
3. Disable website claim button during cooldown.
4. Add read-only live stats to website before wallet connect.
5. Change `npm test` to run Hardhat tests.
6. Delete or quarantine stale scripts with placeholders.

### Next deployment / v3

1. Remove `ReentrancyGuard` from `claim()` unless new external calls are added.
2. Cache `msg.sender`, `block.timestamp`, timelock mapping reads.
3. Add explicit supply exhaustion check.
4. Add timelock cancellation and no-overwrite queue guard.
5. Consider capped referrals and streaks if growth is more important than strict "no referral" purity.

### Growth

1. Add social links and share CTAs.
2. Publish live claim/burn/referrer leaderboards.
3. Collect LP fees publicly and use them for buy-and-burn or community rewards.
4. Avoid artificial volume scripts; build real claim and sharing loops.

## Bottom Line

The contract is simple and tests cleanly, but it is not yet optimized for launch growth or DeFi operations. The biggest real risk is not a contract drain; it is operational mistakes in scripts and weak conversion loops. Fix the script safety issues first, then add website trust/social proof, then consider a v3 with capped referrals or streaks if KORPO wants viral distribution rather than only pure daily claiming.
