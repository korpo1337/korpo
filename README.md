# KORPO v2 — The Fair Distribution Token

**Claim free KORPO daily. Every transfer burns 0.5%, so scarcity grows with use.**

## What Is KORPO?

KORPO is an experiment in fair token distribution. There is no ICO, no presale, no team allocation, no staking rewards, and no referral system. The entire supply of 1 billion KORPO lives inside the contract and can only be obtained by claiming — 100 KORPO per wallet per day, for free.

Every peer-to-peer transfer of 100 KORPO or more burns 0.5% of the transferred amount. Transfers below 100 KORPO are exempt. This creates a deflationary pressure that scales with usage: the more the token circulates, the more is burned.

**This is an experiment. There is no guarantee of value, liquidity, or returns.**

## How It Works

### Claiming

- Any wallet can call `claim()` once per day (24-hour cooldown)
- Each claim mints exactly **100 KORPO** from the contract's reserve to the caller
- The contract holds the entire 1 billion supply at deployment
- No payment, approval, or qualification is required — just gas

### Burn on Transfer

- Transfers of **100 KORPO or more** burn **0.5%** of the amount
  - Example: sending 1,000 KORPO → 5 KORPO burned, 995 KORPO received
- Transfers **below 100 KORPO** are not subject to burn
- Claiming (transfer from contract) is **exempt** from burn
- Minting and explicit burning are also exempt

### Owner Controls

- The contract owner can **pause claiming** and **transfer or renounce ownership**
- All owner actions require a **24-hour timelock** — queue first, execute after delay
- The owner **cannot** access user funds or contract reserves

## Contract Details

| Parameter | Value |
|-----------|-------|
| Token | KORPO (KORPO) |
| Chain | Base (Base Sepolia testnet first) |
| Total Supply | 1,000,000,000 KORPO |
| Daily Claim | 100 KORPO per wallet |
| Claim Cooldown | 24 hours |
| Burn Rate | 0.5% on transfers ≥ 100 KORPO |
| Burn Threshold | 100 KORPO |
| Timelock Delay | 24 hours |
| Solidity | 0.8.24 |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install

```bash
git clone <repo-url> && cd korpo-v2
npm install
```

### Configure

Copy the environment template:

```bash
cp .env.example .env
# Edit .env with your private key and RPC URL
```

### Test

```bash
npx hardhat test
```

### Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

## Contract Interface

```solidity
// Claim your daily KORPO
function claim() external;

// Check if a wallet can claim
function canClaim(address user) external view returns (bool);

// Get next eligible claim timestamp (0 if eligible now)
function nextClaimTime(address user) external view returns (uint256);

// Remaining KORPO in contract reserve
function remainingSupply() external view returns (uint256);

// Total KORPO burned through transfers
function totalBurned() external view returns (uint256);

// Total KORPO claimed by all users
function totalClaimed() external view returns (uint256);

// Number of unique wallets that have claimed
function uniqueClaimers() external view returns (uint256);
```

## Documentation

- **[SECURITY.md](./SECURITY.md)** — Security architecture and measures
- **[RISK.md](./RISK.md)** — Risk disclosure
- **[TOKENOMICS.md](./TOKENOMICS.md)** — Supply, distribution, and burn dynamics
- **[THREAT_MODEL.md](./THREAT_MODEL.md)** — Attack scenarios and mitigations

## License

MIT (contract) / MIT (code). See [contracts/KORPO.sol](./contracts/KORPO.sol).