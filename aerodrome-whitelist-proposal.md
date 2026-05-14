# KORPO Governance Proposal — Aerodrome Token Whitelisting

## Overview

KORPO is a Universal Basic Income token on Base requesting whitelisting on Aerodrome to enable gauge creation for the KORPO/WETH pool.

## Token Information

| Property | Detail |
|----------|--------|
| Token Name | KORPO |
| Contract | `0xF970c93D00De94786F6fdABbc63180da1D981bc7` |
| Chain | Base (8453) |
| Total Supply | 300 KORPO (fixed, no mint) |
| Daily Claim | 100 KORPO per wallet (permissionless) |
| Burn Rate | 0.5% per transfer (deflationary) |
| Uniswap V3 Pool | `0x588Cc334d86C40fF16b8714f1Ff8bd25993CFa9e` (1% fee) |
| Website | [korpo.pro](https://korpo.pro) |

## Why Whitelist KORPO?

**1. Unique Value Proposition — UBI on Base**

No other token on Aerodrome represents Universal Basic Income. KORPO gives every wallet 100 tokens daily for free — the most inclusive token standard possible.

**2. Deflationary by Design**

While most gauge-seeking tokens inflate to reward liquidity, KORPO deflates. Every transfer burns 0.5%. More volume = more burns = increasing scarcity. An Aerodrome gauge accelerates this flywheel.

**3. Perfect Alignment with Base**

Base's mission: bring the world on-chain. KORPO's mission: give every on-chain user free tokens daily. They're complementary.

**4. Flywheel Effect**

```
AERO emissions → LPs provide liquidity → Lower slippage → More trades → 0.5% burn → Increasing scarcity → Price appreciation → More visibility → More claimers → Larger community → Repeat
```

## Current State

- ✅ Contract deployed and functional on Base mainnet
- ✅ Uniswap V3 pool active (1% fee tier)
- ✅ Daily claim system working (100 KORPO/day)
- ✅ Website with claim functionality (korpo.pro)
- ✅ Token metadata served at `.well-known/`

## Requested Action

Whitelist KORPO (`0xF970c93D00De94786F6fdABbc63180da1D981bc7`) on the Aerodrome FactoryRegistry to enable:
1. KORPO/WETH pool creation on Aerodrome
2. Gauge creation via `Voter.createGauge()`
3. AERO emission eligibility for KORPO LP providers

## Governance Contacts

- Snapshot: [snapshot.org/#/aerodrome.eth](https://snapshot.org/#/aerodrome.eth)
- Discord: Aerodrome Finance
- Website: [aerodrome.finance](https://aerodrome.finance)

## Current Aerodrome Contracts (Base)

| Contract | Address |
|----------|---------|
| AERO Token | `0x940181a94A35A4569E4529A3CDfB74e38FD98631` |
| Voter | `0x16613524e02ad97eDfeF371bC883F2F5d6C480A5` |
| Router | `0x6cb442acF35158D5eDa88fe602221b67B400Be3E` |
| FactoryRegistry | `0x420DD381b31aEf6683db6B902084cB0FFECe40Da` |

---

*UBI isn't charity — it's infrastructure. KORPO is building it on Base, and Aerodrome is the liquidity layer that makes it real. We ask for your vote to whitelist.*