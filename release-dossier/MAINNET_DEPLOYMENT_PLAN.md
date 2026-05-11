# KORPO v2 — Mainnet Deployment Plan

## Prerequisites
1. All 52 unit tests passing ✅
2. Testnet deployment verified ✅
3. Security review complete ✅
4. Threat model documented ✅
5. Wallet funded with sufficient ETH for gas

## Pre-Deployment Checklist
- [ ] Confirm wallet has ≥0.01 ETH on Base mainnet
- [ ] Verify gas prices on Base mainnet are reasonable (<5 gwei)
- [ ] Confirm RPC endpoint is stable
- [ ] Have deployment transaction hash recorded
- [ ] Verify contract on Basescan

## Deployment Steps
1. Set `RPC_URL` to Base mainnet RPC
2. Set `PRIVATE_KEY` in .env (NEVER commit)
3. Run: `node scripts/deploy-testnet.js` (rename for mainnet)
4. Record contract address
5. Verify on Basescan: `npx hardhat verify --network base <address>`
6. Test claim from a second wallet
7. Transfer test between wallets
8. Record all transaction hashes

## Post-Deployment Verification
1. Read all constants from deployed contract
2. Confirm owner address
3. Confirm initial paused = false
4. Confirm total supply = 1,000,000,000
5. Test claim function
6. Test transfer function
7. Test timelock queue

## Rollback / Abort Plan
- **If deployment fails**: Contract address is known, no funds at risk. Deploy new instance.
- **If critical bug found post-deploy**: Owner can pause claims via 24h timelock. Contract cannot be upgraded.
- **If owner key compromised**: Transfer ownership via 24h timelock to new address.
- **Nuclear option**: Renounce ownership (24h timelock). Contract becomes fully immutable, no admin functions.

## Cost Estimate
| Action | Gas (est.) | Cost at 1 gwei | Cost at 5 gwei |
|--------|-----------|----------------|----------------|
| Deploy | ~2,000,000 | ~$0.80 | ~$4.00 |
| Claim | ~146,000 | ~$0.06 | ~$0.30 |
| Transfer | ~35,000 | ~$0.01 | ~$0.07 |
| Transfer (burn) | ~51,000 | ~$0.02 | ~$0.10 |

Based on Base mainnet ETH ≈ $2,500
