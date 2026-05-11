# KORPO v2 — Testnet Deployment Record

## Deployment Details
- **Network**: Base Sepolia (Chain ID: 84532)
- **Contract Address**: `0xdA6be4CeF62e6075B883300A43A718AcD46f746B`
- **Deployer**: `0xAFe3A600e81ecfB0714e28Bff82c9944C4B7666d`
- **Deploy TX**: see on-chain verification script output
- **Block Explorer**: https://sepolia.basescan.org/address/0xdA6be4CeF62e6075B883300A43A718AcD46f746B
- **Compiler**: Solidity 0.8.24, Paris EVM target, Optimizer 200 runs

## On-Chain Verification
| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| Name | KORPO | KORPO | ✅ |
| Symbol | KORPO | KORPO | ✅ |
| Total Supply | 1,000,000,000 | 1,000,000,000 | ✅ |
| Daily Claim | 100 | 100 | ✅ |
| Burn Rate | 0.5% | 50/10000 | ✅ |
| Min Burn Threshold | 100 | 100 | ✅ |
| Claim Cooldown | 86400s | 86400s | ✅ |
| Timelock Delay | 86400s | 86400s | ✅ |
| Owner | deployer | deployer | ✅ |
| Paused | false | false | ✅ |

## Transactions Executed
1. ✅ Deploy contract
2. ✅ Claim 100 KORPO (gas: 146,367)
3. ✅ Transfer 50 KORPO (below threshold, no burn)
4. ✅ Transfer 20 KORPO to contract (no burn, contract exempt)
5. ✅ Queue timelock pause (24h delay enforced)
6. ✅ Attempt early execute: correctly reverted

## Deployment Cost
- Deploy gas: ~2,000,000 (estimated)
- At Base Sepolia gas prices: negligible (testnet ETH)
- Estimated mainnet cost: ~$0.50-$2.00 depending on gas
