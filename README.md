# KORPO — Safe UBI Token Launch Template

## What You Get

A production-ready Hardhat project for deploying a fair-claim UBI token on any EVM chain.

### Smart Contract (167 LOC)
- ✅ Daily claim (configurable amount)
- ✅ Burn on transfer (anti-whale, 0.5% above threshold)
- ✅ 24h admin timelock (transparent governance)
- ✅ Pause function (with timelock delay)
- ✅ ReentrancyGuard
- ✅ Ownable

### Test Suite (55 tests)
- ✅ Claim mechanics
- ✅ Burn thresholds
- ✅ Cooldown enforcement
- ✅ Timelock queue/execute
- ✅ Pause/unpause
- ✅ Sybil scenario (20 wallets)
- ✅ Gas benchmarks

### Scripts
- ✅ Mainnet deploy (Base, any EVM)
- ✅ Uniswap V3 LP creation
- ✅ Aave V3 supply integration
- ✅ Daily claim automation
- ✅ Volume generation (DexScreener indexing)
- ✅ Monitoring + reporting

### Security
- ✅ Threat model document
- ✅ go/no-go checklist
- ✅ Codex AI audit findings (6 critical fixed)
- ✅ Slippage protection on all swaps

### Website
- ✅ Claim UI (wallet connect)
- ✅ FAQ page
- ✅ Roadmap page
- ✅ Waitlist page
- ✅ Risk disclosure
- ✅ Analytics tracking
- ✅ Donation/support widget

## Not Included
- Professional paid audit (recommended for serious projects)
- Legal opinions
- Marketing services
- Guaranteed returns or value

## Quick Start

```bash
git clone https://github.com/korpo-protocol/korpo-v2.git
cd korpo-v2
npm install
cp .env.example .env  # Fill in your keys
npx hardhat compile
npx hardhat test
# 55 passing
```

## Deploy

```bash
# Testnet first
npx hardhat run scripts/deploy-testnet-v2.js --network baseSepolia

# Mainnet (after testing!)
npx hardhat run scripts/deploy-mainnet.js --network base
```

## License
MIT — use it, modify it, launch your own UBI experiment.

---

*This template was battle-tested on Base mainnet. 55/55 tests pass. Contract:
[0xF970c93D00De94786F6fdABBc63180da1D981bc7](https://basescan.org/address/0xF970c93D00De94786F6fdABBc63180da1D981bc7)

**Disclaimer**: This is experimental software. No warranties. No investment advice. Tokens may have zero value.*