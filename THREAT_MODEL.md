# Threat Model — KORPO v2

**Contract**: `0xdA6be4CeF62e6075B883300A43A718AcD46f746B` (Base Sepolia)  
**Scope**: Single contract, ~165 lines. OpenZeppelin ERC20 + Ownable + ReentrancyGuard.  
**Status**: Unaudited. No formal verification. Tested with 52 unit tests only.

---

## 1. Attack Vectors — How Someone Could Try to Drain the System

The KORPO contract holds the entire 1B token supply and releases it via `claim()`. There is **no withdraw, sweep, rescue, or admin-drain function**. The owner cannot access the contract's token balance. This is by design and significantly limits attack surfaces. However, the following vectors remain:

### 1.1 Direct Drain — Not Possible

There is no code path for any address (including the owner) to extract tokens from the contract except through `claim()` at 100 KORPO/day per wallet. The `_transfer` in `claim()` moves tokens from `address(this)` to the caller, and no other function touches the contract balance.

**Verdict**: No direct drain vector exists in the contract code.

### 1.2 Exploiting the Burn Mechanism

An attacker cannot directly profit from the burn, but they can manipulate it:

- **Griefing via burn**: An attacker could intentionally send large transfers to trigger burns on tokens held by other users (e.g., by sending tokens to a smart contract that immediately transfers them, incurring burn on each hop). This doesn't drain the contract but reduces total supply.
- **Threshold bypass**: An attacker (or any user) can avoid burns entirely by splitting transfers into sub-100 KORPO chunks. This preserves their own tokens at the cost of higher gas.

**Verdict**: Burns reduce total supply but cannot be weaponized to steal tokens from the contract or from other users.

### 1.3 Reentrancy on claim()

The `claim()` function uses `nonReentrant`, and the internal `_transfer` call is to `msg.sender` — a known address pattern. However, if `msg.sender` is a smart contract, its fallback or `onERC20Received` hook could theoretically be invoked during the transfer. Because the state changes (`lastClaimTime`, `totalClaimed`, `hasClaimed`) are written **before** the `_transfer` call, and the `nonReentrant` guard blocks re-entry, this vector is mitigated.

**Verdict**: Mitigated. Reentrancy on claim is blocked by the guard and CEI pattern.

### 1.4 Approval Drain

Standard ERC20 `approve` + `transferFrom` could allow a spender to drain a user's wallet if the user grants a large or unlimited approval. This is not a contract vulnerability — it is a standard ERC20 risk.

**Verdict**: Standard ERC20 risk. Users should only grant minimum necessary approvals.

### 1.5 Front-Running Claims

There is no competition in the claim mechanism. Every wallet gets exactly 100 KORPO regardless of transaction ordering. Front-running provides no advantage for claiming.

**Verdict**: Not applicable.

---

## 2. Claim Spam — Sybil Attacks & Bot Farming

### 2.1 The Problem

This is the **single biggest threat** to KORPO's distribution model. The contract has no identity verification, no captcha, no whitelist, and no proof-of-humanity mechanism. Every address with ETH for gas can claim 100 KORPO per day.

**Scale of the attack**:
- An attacker creates `N` wallets
- Each wallet claims 100 KORPO/day
- Daily extraction rate = `N × 100 KORPO`
- With 10,000 bot wallets: 1,000,000 KORPO/day — that's 0.1% of supply daily

### 2.2 Economic Analysis

On Base Sepolia (testnet), gas is essentially free. On Base mainnet, a claim transaction costs approximately 200,000 gas. At Base's low gas prices (~0.001–0.01 gwei), a claim costs roughly 0.0002–0.002 ETH, or $0.10–$1.00 at typical ETH prices.

If KORPO ever attains even $0.01 per token, each 100 KORPO claim is worth $1.00. As long as `(100 KORPO × price per KORPO) > gas cost`, bot farming is profitable. This threshold is very low.

### 2.3 Current Mitigations (Weak)

- **Gas costs**: Each claim requires a transaction. On mainnet, this costs real ETH. This is the only economic barrier, and it is minimal on Base.
- **24-hour cooldown**: Limits each wallet to one claim per day. A sybil attacker simply creates more wallets.
- **No referral bonus**: There is no multiplicative incentive for multi-wallet strategies. Each wallet earns linearly. This prevents viral bot networks from earning superlinear rewards.

### 2.4 What Is NOT Mitigated

- One person creating 10,000 wallets and claiming 1M KORPO/day
- Automated scripts that claim across all wallets every 24 hours
- Accumulation of a disproportionate share of total supply by a single actor
- Bot farms selling claimed tokens on a DEX immediately

### 2.5 Possible Future Mitigations (Not Implemented)

- **Proof of Humanity / Identity verification** — violates permissionless ethos
- **Captcha-gated claims** — requires off-chain infrastructure
- **Rate limiting by IP or device** — not possible on-chain
- **Social verification** — requires off-chain coordination
- **Claim deposits** — requiring a small ETH deposit that's returned — changes the free-claim model fundamentally

**Honest assessment**: The sybil risk is **HIGH** and **fundamentally unmitigated** at the contract level. This is an accepted design trade-off. Any value KORPO accrues will attract bot farmers proportional to that value.

---

## 3. Admin Abuse — Owner Privilege Risks

### 3.1 What the Owner CAN Do

The contract owner has exactly three capabilities, all behind a 24-hour timelock:

1. **Pause claiming** (`queueSetPaused` → `setPaused`): Block all new claims by setting `paused = true`
2. **Transfer ownership** (`queueTransferOwnership` → `transferOwnership`): Hand control to another address
3. **Renounce ownership** (`queueRenounceOwnership` → `renounceOwnership`): Permanently remove the owner

### 3.2 What the Owner CANNOT Do

The owner **cannot**:
- Withdraw tokens from the contract
- Transfer users' tokens
- Change the claim amount (100 KORPO/day is a constant)
- Change the burn rate (0.5% is a constant)
- Change the total supply (1B is a constant, minting is constructor-only)
- Modify anyone's `lastClaimTime` or `hasClaimed` status
- Upgrade the contract (no proxy, no delegatecall)
- Mint additional tokens
- Bypass the timelock

This is important: **the owner has no access to funds**. Even a fully malicious owner cannot steal a single KORPO from any user or from the contract treasury. The worst they can do is disrupt the claiming process.

### 3.3 Pause Abuse Scenario

**Timeline of a pause attack**:

1. `T+0h`: Owner calls `queueSetPaused(true)`. `TimelockQueued` event is emitted.
2. `T+0h to T+24h`: Community sees the queued action on-chain. Users can still claim during this window.
3. `T+24h`: Owner calls `setPaused(true)`. All claims revert.
4. **Indefinite pause**: The owner can choose to never unpause. Or they can queue unpause and pause again cyclically.

**Impact**: Claiming stops. Users cannot obtain new KORPO. Existing tokens in user wallets continue to circulate and transfer normally (burns still apply). The contract's unclaimed reserve is locked but not stolen.

**Community recourse**: Users can still transfer their existing tokens. They cannot claim new ones. If the owner never unpauses, the system is frozen in terms of new distribution.

### 3.4 Ownership Transfer to Malicious Actor

An attacker who gains owner privileges (via key compromise or social engineering targeting the owner) must still go through the 24-hour timelock for any action. The community has a 24-hour window to:

- Claim as many tokens as possible before any damaging action takes effect
- Deploy an alternative contract and migrate community attention

**Honest assessment**: Owner abuse risk is **MODERATE**. The owner cannot steal funds but can disrupt distribution. The timelock provides a warning window but does not prevent the action. This is a centralized point of failure that can only be removed by renouncing ownership (which is irreversible and removes all emergency controls).

---

## 4. Wallet Compromise — What Happens If the Owner Key Is Stolen

### 4.1 Immediate Capabilities of the Attacker

If the owner's private key is compromised, the attacker gains all owner capabilities. They **cannot** steal tokens — either from the contract or from users. They can only:

- Queue and execute pause/unpause actions (with 24h delay)
- Queue and execute ownership transfer (with 24h delay)
- Queue and execute ownership renunciation (with 24h delay)

### 4.2 The 24-Hour Window

The timelock means the attacker **cannot act immediately**. Every action they queue has a mandatory 24-hour waiting period before execution. During this window:

- `TimelockQueued` events are visible on-chain and can be monitored
- The legitimate owner can attempt to front-run (if they still have access to a different key or can coordinate with miners/validators)
- Users can claim as many tokens as possible before any action takes effect
- The community can prepare for the worst case

### 4.3 What the Attacker Cannot Do

- **Cannot drain the contract**: No function exists to extract tokens from the contract address
- **Cannot modify claim amounts or burn rates**: These are `constant` and cannot be changed
- **Cannot steal user tokens**: ERC20 allowances are per-user; the owner has no special transfer privileges
- **Cannot instantly pause**: The 24-hour delay applies
- **Cannot self-destruct or upgrade the contract**: No such functionality exists

### 4.4 Recommended Response

If the owner key is compromised:

1. **Monitor timelock events**: Set up alerts for any `TimelockQueued` events
2. **Claim immediately**: Users should claim all available KORPO before any queued action executes
3. ** legitimate owner recovery**: If the original owner still has access, they can attempt to queue a counter-action (e.g., transfer ownership to a secure multi-sig before the attacker's action executes)
4. **Accept the outcome**: If the attacker successfully pauses, the contract becomes a standard (frozen-distribution) ERC20 token. User balances are safe; only new claims are blocked.

### 4.5 If the Key Is Lost (Not Stolen)

If the owner's private key is **lost** (not compromised):

- Current pause state becomes permanent — if the contract is paused, it stays paused forever
- No owner actions can ever be executed again
- The timelock functions become permanently unusable
- Claims continue to work if the contract is not paused at the time of key loss

**Honest assessment**: Key compromise risk for users' funds is **ZERO** — the owner simply cannot access user or contract tokens. Key compromise risk for system functionality is **MODERATE** — a malicious owner can disrupt claiming after a 24-hour delay. The timelock is the only protection for functionality, and it provides warning time but not prevention.

---

## 5. Treasury Empty — What Happens When All Tokens Are Claimed

### 5.1 The Exhaustion Scenario

The contract starts with 1B KORPO. Each claim removes 100 KORPO from the contract's balance. Burns reduce total supply but do not return tokens to the contract. Eventually:

- **The contract's balance drops below 100 KORPO**, making all further claims revert (insufficient balance)
- **The contract's balance reaches exactly 0**, at which point `remainingSupply()` returns 0 and no claims can succeed

### 5.2 When Does This Happen?

Without burns (worst case for supply longevity):  
100% of 1B tokens = 10,000,000 claim-events = 10M wallet-days.  
At 10,000 daily claimers: ~1,000 days (~2.7 years).  
At 100,000 daily claimers: ~100 days (~3.3 months).

With burns (which reduce total supply and therefore reduce the effective pool):  
Burns permanently destroy tokens from circulation. If tokens are burned, fewer total tokens remain to be claimed. However, burns do NOT return tokens to the contract — they reduce the total supply counter. The contract balance only decreases through claims.

So the effective timeline is: `{total initial supply} / {daily claim rate}`. Burns shorten this because burned tokens exist in user wallets and can't be reclaimed by the contract, but the contract balance (unclaimed reserve) only decreases through the `claim()` function.

**Example**: If 500M KORPO are claimed and 50M are burned over time, the contract still holds approximately 500M KORPO (less any tokens burned from the contract, which doesn't happen since contract-originated transfers are exempt from burn). The contract balance actually equals `TOTAL_SUPPLY - totalClaimed`, because:
- Initial mint: 1B to contract
- Claims: subtract from contract balance, add to user wallets
- Burns: subtract from total supply but NOT from contract balance (burns happen on peer-to-peer transfers, not contract transfers)

So the contract balance = 1B - totalClaimed. It reaches 0 when totalClaimed = 1B. Burns reduce total supply but do NOT accelerate contract depletion.

### 5.3 What Happens at Exhaustion

When the contract balance is below 100 KORPO:

- `claim()` reverts with an ERC20 insufficient balance error
- `remainingSupply()` shows the residual amount (0–99.99... KORPO)
- No action can redistribute or replenish tokens
- The contract functions as a read-only ledger: `totalBurned`, `uniqueClaimers`, `totalClaimed`, and balances remain queryable
- Transfers between users continue to work normally, including the 0.5% burn on transfers ≥ 100 KORPO

### 5.4 Implications

- **No more distribution**: The token becomes a fixed, deflationary asset in circulation
- **Burns continue**: As long as tokens transfer, total supply continues to decrease
- **No mechanism to recover**: There is no way to move the residual < 100 KORPO out of the contract (no withdraw or sweep function)
- **The contract becomes dormant**: It still exists on-chain but serves no active purpose beyond being an ERC20 token contract

### 5.5 The "Almost Empty" Edge Case

If the contract holds, say, 50 KORPO, a claim attempt reverts. There is no mechanism to claim a partial amount smaller than 100 KORPO. This residual is effectively permanently stuck.

**Honest assessment**: Treasury exhaustion is **inevitable** if the project has sustained user activity. It is not a bug but a feature — the token is designed to be fully distributed. The residual < 100 KORPO is a known minor loss. The more serious concern is the transition period: when the contract has, say, 5% of supply remaining, claim competition may intensify, and bot farming becomes more aggressive relative to remaining supply.

---

## Threat Summary

- **1. Attack Vectors**: No direct drain exists. Approval-based drains are standard ERC20 risks. Reentrancy is mitigated.
- **2. Claim Spam / Sybil**: **HIGH risk**, **unmitigated** at contract level. Gas cost is the only barrier, and it's minimal on Base. Bot farming will scale with token value.
- **3. Admin Abuse**: **MODERATE risk**. Owner cannot steal funds but can pause claiming after a 24h timelock. No upgradeability or fund access limits the blast radius.
- **4. Wallet Compromise**: **MODERATE functionality risk, ZERO fund risk**. A stolen owner key cannot access tokens. The 24h timelock window provides community reaction time but not prevention.
- **5. Treasury Empty**: **INEVITABLE** with sustained use. The contract becomes a deflationary-in-circulation token. Residual < 100 KORPO is permanently stuck. No recovery mechanism exists or is needed.

---

## Mitigation Recommendations

1. **Monitor timelock events**: Set up real-time alerts for `TimelockQueued` events. The 24-hour window only helps if someone is watching.
2. **Plan for renunciation**: After initial deployment and stabilization, renounce ownership via the timelock process. This eliminates admin abuse and wallet compromise vectors entirely, at the cost of losing pause capability.
3. **Accept sybil risk**: The contract cannot prevent bot farming. Any value-attracted sybil resistance must come from off-chain mechanisms (identity verification, captchas on frontends) or from the community's social consensus.
4. **Prepare for exhaustion**: Document the endgame — when the contract balance drops low, users should understand that claiming will cease. No migration or refill is planned.
5. **Verify the contract address**: Social engineering and phishing are off-chain threats that cannot be mitigated in the contract. Always publish and verify the canonical contract address.
6. **No multi-sig currently**: Consider transferring ownership to a multi-sig wallet before mainnet deployment. This distributes the key compromise risk and makes timelock actions require multiple signers.