<h1 align="center">KORPO — Fair Distribution Token on Base</h1>

<p align="center">
  <strong>A free-claim, burn-on-transfer ERC-20 token built for the Base ecosystem.</strong><br/>
  No ICO. No staking. No insiders. Pure proof-of-participation.
</p>

<p align="center">
  <a href="https://basescan.org/address/0xF970c93D00De94786F6fdABBc63180da1D981bc7" target="_blank">
    <img src="https://img.shields.io/badge/Base-Mainnet-0052FF?style=flat-square&logo=ethereum&logoColor=white" alt="Base Mainnet"/>
  </a>
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity&logoColor=white" alt="Solidity 0.8.24"/>
  <img src="https://img.shields.io/badge/Hardhat-2.28.6-F7C52C?style=flat-square&logo=ethereum&logoColor=black" alt="Hardhat"/>
  <img src="https://img.shields.io/badge/OpenZeppelin-5.6.1-4E5EE4?style=flat-square&logo=openzeppelin&logoColor=white" alt="OpenZeppelin"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT"/>
</p>

<p align="center">
  <img src="logo.png" alt="KORPO Token Logo" width="180"/>
</p>

## What is KORPO?

**KORPO** is an experimental fair-distribution token on **Base** (Coinbase's Layer-2 network). It is designed to test whether a token can grow in value through genuine participation rather than speculation.

- **Free daily claim** — Every wallet can claim 100 KORPO per day.
- **Burn on transfer** — 0.5% of every transfer above the threshold is permanently burned, creating natural scarcity.
- **24-hour timelock** — All admin actions are delayed and transparent.
- **Fully open source** — Contracts, tests, and tooling are publicly auditable.

> One-liner: *Claim free KORPO daily. Every transfer burns 0.5% so scarcity grows with use.*

## Official Contract

| Network | Address |
|---------|---------|
| Base Mainnet | [`0xF970c93D00De94786F6fdABBc63180da1D981bc7`](https://basescan.org/address/0xF970c93D00De94786F6fdABBc63180da1D981bc7) |

Verified on [BaseScan](https://basescan.org/address/0xF970c93D00De94786F6fdABBc63180da1D981bc7).

## Why Base?

Base provides low-cost, high-speed transactions with Ethereum's security guarantees. By launching on Base, KORPO keeps claim and transfer costs under a few cents — making daily participation accessible to everyone.

## Core Features

### Smart Contracts
- `KORPO.sol` — Main ERC-20 with claim, burn, pause, and timelock logic (167 LOC)
- `KORPOLiquidityReward.sol` — LP reward distribution helper
- Built with OpenZeppelin v5 (`ERC20`, `Ownable`, `ReentrancyGuard`)

### Security
- 101 passing unit tests (Hardhat + Ethers v6)
- Dedicated threat model and risk documentation
- Slippage protection on all swap scripts
- Sybil-resistance stress tests (20-wallet scenarios)

### Developer Tooling
- Mainnet & testnet deploy scripts
- Uniswap V3 LP creation scripts
- Aave V3 supply integration
- Daily claim automation
- Volume generation for DexScreener indexing
- Monitoring & reporting dashboards

### Frontend
- Wallet-connect claim UI
- FAQ, Roadmap, and Risk-disclosure pages
- Waitlist & analytics tracking

## Quick Start

```bash
git clone https://github.com/korpo1337/korpo.git
cd korpo
npm install
cp .env.example .env   # Add your RPC keys
npx hardhat compile
npx hardhat test       # 101 tests pass
```

## Deploy

```bash
# Sepolia testnet
npx hardhat run scripts/deploy-sacrifice-sepolia.js --network baseSepolia

# Base mainnet (only after full testnet verification)
npx hardhat run scripts/deploy-sacrifice-mainnet.js --network base
```

## Repository Structure

```
contracts/          # Solidity source
├── KORPO.sol
├── KORPOLiquidityReward.sol
└── mocks/
test/               # 101 Hardhat tests
scripts/            # Deployment, LP, swap, and monitoring scripts
public/             # Frontend assets
```

## Documentation

- [`TOKENOMICS.md`](TOKENOMICS.md) — Supply mechanics, burn model, and distribution schedule
- [`SECURITY.md`](SECURITY.md) — Security assumptions and best practices
- [`THREAT_MODEL.md`](THREAT_MODEL.md) — Known risks and mitigations
- [`LIQUIDITY-PLAN.md`](LIQUIDITY-PLAN.md) — LP bootstrapping strategy

## Keywords & Search

People looking for KORPO often search: **KORPO token Base**, **Base token fair launch**, **free claim ERC20**, **UBI token crypto**, **burn on transfer token**, **no ICO token**, **Base Layer 2 token experiment**, **open source token template**.

## Disclaimer

This is experimental software. No warranties are provided. No investment advice is given. Tokens may have zero value. Participate at your own risk.

## License

MIT — use it, modify it, launch your own fair-distribution experiment.

---

*Built with Hardhat, OpenZeppelin, and deployed on Base.*
