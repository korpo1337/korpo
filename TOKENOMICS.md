# Tokenomics — KORPO v2

## Overview

KORPO is a fixed-supply, deflationary, fair-distribution token. The entire supply is held by the contract at deployment and released exclusively through daily claims. No tokens are allocated to founders, investors, or reserves.

## Supply

**Initial Total Supply**: 1,000,000,000 KORPO (1 billion)

This supply is **fixed at deployment**. No additional tokens can ever be minted. The `_mint` call in the constructor is the only minting operation, targeting the contract address. There is no `mint` function exposed after deployment.

### Supply Dynamics

The circulating supply grows through claims and shrinks through burns. These two forces operate simultaneously:

- **Claims** increase the number of tokens in user wallets
- **Burns** reduce the total supply permanently (tokens sent to address(0) are destroyed)

The net effect depends on user behavior. Early on, claims dominate daily supply changes. As the token circulates and transfer volume grows, burns become increasingly significant.

## Distribution

### Claim-Based Release

- **Daily claim**: 100 KORPO per wallet per 24-hour period
- **No prerequisites**: No payment, staking, referral, or whitelist required
- **Cooldown**: Must wait a full 24 hours between claims (not calendar days — exactly 86,400 seconds from the last claim timestamp)

### No Allocations

| Category | Allocation |
|----------|-----------|
| Team / Founders | 0% |
| Investors / ICO | 0% |
| Treasury / Reserve | 0% |
| Staking Rewards | 0% |
| Referral Bonuses | 0% |
| Community (Claims) | 100% |

100% of the supply is obtainable only through claiming. The contract deployer claims the same 100 KORPO/day as everyone else.

### Distribution Timeline

At 100 KORPO per wallet per day, the time to fully distribute the supply depends entirely on participation:

| Unique Daily Claimers | Days to Distribute 1B KORPO | Approximate Years |
|-----------------------|------------------------------|--------------------|
| 100 | 100,000 | 273.9 |
| 1,000 | 10,000 | 27.4 |
| 10,000 | 1,000 | 2.7 |
| 100,000 | 100 | 0.27 |
| 1,000,000 | 10 | 0.03 |

These are upper bounds. Burns during circulation reduce the total supply, meaning full distribution (of remaining tokens) happens sooner. However, burns also mean the original 1 billion will never be fully distributed — some will be permanently destroyed.

## Burn Mechanics

### How It Works

When a user-initiated transfer (peer-to-peer) meets the burn threshold, 0.5% of the transferred amount is destroyed before the recipient receives the remainder.

**Burn formula**: `burnAmount = floor(transferAmount × 0.5 / 10000)`

**Effective received**: `receivedAmount = transferAmount - burnAmount`

### Threshold

Burns only apply to transfers of **100 KORPO or more**. Transfers below 100 KORPO are exempt.

This threshold serves two purposes:
1. **Micro-transaction protection**: Small payments (tips, micro-rewards) are not penalized
2. **Gas efficiency**: Sub-threshold transfers skip the burn calculation, saving gas

### Exemptions

The following transfer types are **exempt** from the burn:

- **Claims**: Transfers from the contract address to the claimer are burn-free
- **Minting**: The initial creation of tokens (from = address(0)) is exempt
- **Explicit burns**: Transfers to address(0) are not double-burned
- **Sub-threshold**: Transfers below 100 KORPO are exempt

### Burn Examples

| Transfer Amount | Burn (0.5%) | Received | Effective Rate |
|----------------|-------------|----------|----------------|
| 50 KORPO | 0 (below threshold) | 50.0 KORPO | 0% |
| 100 KORPO | 0.5 KORPO | 99.5 KORPO | 0.5% |
| 1,000 KORPO | 5.0 KORPO | 995.0 KORPO | 0.5% |
| 10,000 KORPO | 50.0 KORPO | 9,950.0 KORPO | 0.5% |
| 100,000 KORPO | 500.0 KORPO | 99,500.0 KORPO | 0.5% |

Note: Because Solidity uses integer division, burns are truncated (floored). For example, transferring 101 KORPO burns `floor(101 × 50 / 10000) = floor(0.505) = 0` wei-equivalent — essentially 0.5 KORPO with the remainder lost to integer rounding.

### Deflationary Pressure

The burn is proportional to velocity — the more often tokens change hands, the more is burned. This creates a natural relationship between usage and scarcity, but:

- If KORPO has no trading activity, burn rate approaches zero
- If KORPO is actively traded, burned tokens accumulate and supply decreases
- The theoretical supply floor is zero (all tokens eventually burned), though in practice some tokens will remain dormant in inactive wallets

### Circulating vs. Total Supply

- **Total supply** = 1 billion (at deployment) minus cumulative burns
- **Circulating supply** = total supply minus contract-held reserve
- **Contract reserve** = total supply minus total claimed

These three metrics diverge over time:

```
Day 0:        Total = 1B, Circulating = 0, Reserve = 1B
After claims: Total = 1B - burns, Circulating = claimed - burned from those, Reserve = 1B - claimed
Long term:    Total approaches 0 (all burned), Circulating approaches 0, Reserve approaches 0
```

## Claim Economics

### Cost per Claim

The only cost to claim is gas. On Base, this is typically fractions of a cent in USD. The claim function has been benchmarked at under 200,000 gas, with subsequent claims (after storage initialization) using less.

### Claim Incentive Structure

- Claiming is free (aside from gas), so rational actors will claim if the expected value of 100 KORPO exceeds gas costs
- Daily compounding: a user who claims every day accumulates tokens linearly (100/day), minus burns on any transfers they make
- There is no reward for early claiming beyond having more tokens sooner — the claim amount is constant

### Supply Exhaustion

The contract's reserve decreases with each claim. If the reserve drops below 100 KORPO, claims will fail (insufficient balance). At that point, only the burned-and-not-reclaimed portion of the original supply remains in circulation.

Given the 1 billion initial supply and 100 KORPO daily limit, this scenario is extremely distant without extraordinary participation and significant burn activity.