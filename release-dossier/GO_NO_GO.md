# KORPO v2 — GO / NO-GO Assessment

## Date: 2026-05-11
## Assessor: Autonomous Build Agent

---

## Checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Smart contract source code complete | ✅ | KORPO.sol, ~165 lines |
| 2 | All unit tests passing | ✅ | 52/52 |
| 3 | Edge cases tested | ✅ | Zero addr, zero amount, self-transfer, overflow, double claim |
| 4 | Exploit scenarios documented | ✅ | THREAT_MODEL.md |
| 5 | Tests run on testnet | ✅ | Base Sepolia, all functions verified |
| 6 | Deployment scripts tested | ✅ | Successfully deployed + verified on-chain |
| 7 | Ownership/admin rights clear | ✅ | Owner: deployer, timelock 24h, no fund access |
| 8 | All risks documented | ✅ | RISK.md, THREAT_MODEL.md, SECURITY.md |
| 9 | Can explain why it's safe | ✅ | Minimal code, OZ base, no fund access, immutable |
| 10 | Contract addresses on testnet | ✅ | 0xdA6be4CeF62e6075B883300A43A718AcD46f746B |
| 11 | Testnet transactions verified | ✅ | Claim, transfer, timelock all tested |
| 12 | Gas/cost estimate | ✅ | Deploy ~$1-4, Claim ~$0.06-0.30 |
| 13 | Exact deployment command | ✅ | `node scripts/deploy-testnet.js` (update RPC) |
| 14 | Wallet/network requirements | ✅ | ≥0.01 ETH on Base mainnet |
| 15 | Abort/rollback plan | ✅ | Pause claims via timelock, or renounce |

---

## OPEN ISSUES

### 1. Sybil Farming Risk — MEDIUM
One wallet = one claim. No KYC, no captcha. Bots can create unlimited wallets.
- **Mitigation**: Gas cost creates friction. 100 KORPO/day is low value.
- **Acceptance**: This is a known tradeoff for simplicity and fairness.
- **Future**: Can add captcha/proof-of-humanity in a V2 wrapper contract.

### 2. No Contract Verification on Basescan — LOW
Contract is not yet source-verified on Basescan (only bytecode).
- **Action needed**: Run `npx hardhat verify` after mainnet deploy.

### 3. Mainnet RPC Not Tested — LOW
Deployment script uses Base Sepolia RPC. Needs update for mainnet.
- **Action**: Change RPC_URL to Base mainnet before deploy.

---

## VERDICT

### ⚠️ NOT READY FOR MAINNET DEPLOYMENT

**Reasons:**
1. Sybil farming countermeasure not yet evaluated for mainnet viability
2. Contract source not verified on testnet Basescan (only bytecode confirmed)
3. No second wallet test — all on-chain tests used same deployer wallet
4. .gitignore and .env.example not yet committed to git

**Status**: READY FOR TESTNET RETEST

**Required before mainnet:**
- [ ] Verify contract source on Basescan (Base Sepolia)
- [ ] Test with at least 2-3 different wallets
- [ ] Test claim from wallet that has never held ETH before
- [ ] Confirm gas costs on Base mainnet are acceptable
- [ ] Add .gitignore and .env.example to repo
- [ ] Get explicit user approval: "READY FOR MAINNET DEPLOYMENT"

---

## IF APPROVED FOR MAINNET

1. Change RPC_URL to Base mainnet in .env
2. Fund wallet with ≥0.01 ETH on Base mainnet
3. Run `node scripts/deploy-testnet.js` (update script name)
4. Verify on Basescan
5. Test claim from 3 different wallets
6. Test transfer with burn
7. Test timelock pause flow end-to-end
8. Record all transactions and addresses
9. Announce contract address