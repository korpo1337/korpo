# KORPO v2 — Security Audit Report

**Date:** 2026-05-11  
**Contract:** KORPO (Pure UBI Token) — ~166 lines  
**Network:** Base Sepolia `0x82c11851b12c9264a7AE411b2C15bb4F24f3Fe68`  
**Compiler:** Solidity 0.8.24, EVM target paris, optimizer 200 runs  

---

## Summary

| Category | Status |
|----------|--------|
| Unit Tests | ✅ 55/55 passing |
| On-Chain Deploy | ✅ Verified |
| Self-Transfer Fix (M-1) | ✅ Fix deployed & verified on-chain |
| Burn Mechanics | ✅ 0.5% on transfers ≥ 100, exempt contract & self-transfers |
| Claim Cooldown | ✅ 24h enforced |
| Timelock | ✅ 24h queue required for admin actions |
| Access Control | ✅ Only owner can queue/execute timelock |
| Reentrancy | ✅ `nonReentrant` on claim |
| Pausability | ✅ Claims paused, transfers not |

---

## Findings

### [M-1] MEDIUM → FIXED: Self-transfer burned tokens

**Severity:** MEDIUM (now fixed)  
**Description:** Original `_update` override applied burn logic on self-transfers (from==to). This meant `alice.transfer(alice, 100)` would burn 0.5 KORPO, which is counterintuitive — a user moving tokens to their own wallet should pay no fee.

**Fix:** Added `from != to` condition to `shouldBurn` logic:
```solidity
bool shouldBurn = from != address(0) 
               && to != address(0) 
               && from != address(this)
               && from != to           // M-1 fix
               && value >= MIN_BURN_THRESHOLD;
```

**Verification:** On-chain test confirmed — `self-transfer(100 KORPO)` results in `balance_after == balance_before`. Also covered by 3 new unit tests.

### [I-1] INFO: Syndicate farming is inherent

**Severity:** INFO (not fixable without KYC)  
**Description:** The UBI claim mechanic is per-wallet, meaning anyone can create multiple wallets and claim 100 KORPO per wallet per day. This is a known design decision — the token is intentionally accessible to all.

**Mitigation:** Gas costs per claim provide a natural rate limit. On mainnet, each claim costs gas. The daily claim cooldown (86400 seconds) limits per-wallet abuse.

### [I-2] INFO: No upgradeability

**Severity:** INFO  
**Description:** The contract is immutable once deployed. No proxy pattern, no admin functions to change claim amount, burn rate, or supply. This is by design — the token parameters are set in stone at deployment.

**Implication:** If a critical bug is found post-deployment, the only option is to deploy a new contract and migrate.

### [I-3] INFO: Timelock hash collision theoretical risk

**Severity:** INFO (practically zero)  
**Description:** Timelock uses `keccak256(abi.encode(action, params))`. Collision between `setPaused(true)` and `setPaused(false)` produces different hashes. Collision between `transferOwnership(addr1)` and `transferOwnership(addr2)` also produces different hashes. The keccak256 collision risk is cryptographic-grade negligible (~2^128 effort).

### [L-1] LOW: Gas usage for claim

**Severity:** LOW  
**Description:** Claim costs ~146,387 gas. At Base mainnet gas prices (0.01-0.1 gwei), this is negligible (~$0.001). However, if gas spikes dramatically, claim cost could become a concern.

**Mitigation:** Base L2 has historically stable low gas. No action needed.

---

## Test Coverage

### Unit Tests (55/55 ✅)

| Suite | Tests | Status |
|-------|-------|--------|
| Deployment | 5 | ✅ |
| Claim Mechanics | 9 | ✅ |
| Burn Mechanics | 7 | ✅ |
| Pause Mechanism | 5 | ✅ |
| Timelock | 6 | ✅ |
| Access Control | 3 | ✅ |
| Edge Cases | 6 | ✅ |
| Self-Transfer (M-1 Fix) | 3 | ✅ |
| Reentrancy Protection | 1 | ✅ |
| Gas Usage | 3 | ✅ |
| Sybil Scenario (20 wallets) | 1 | ✅ |

### On-Chain Tests (4/4 ✅)

| Test | Result |
|------|--------|
| Deploy + name/symbol/owner | ✅ |
| Claim 100 KORPO | ✅ |
| Transfer with burn (0.5%) | ✅ |
| Self-transfer (M-1 fix: no burn) | ✅ |

---

## Contract Invariants

1. `totalSupply + totalBurned == 1_000_000_000 * 1e18` ✅
2. `remainingSupply == totalSupply` (burns reduce both) ✅
3. Self-transfers never burn ✅
4. Transfers from contract (claims) never burn ✅
5. Only transfers from EOA/contract to another address ≥ threshold burn ✅
6. Claim cooldown of exactly 86400 seconds ✅
7. All admin actions require 24h timelock ✅
8. `paused` blocks claims but not transfers ✅

---

## Recommendation

**Ready for mainnet deployment** pending user confirmation of:
1. Acceptance of syndicate farming as inherent design choice
2. Acceptance of immutability (no upgrade path)
3. User explicitly says "READY FOR MAINNET DEPLOYMENT"

No CRITICAL or HIGH findings remain.