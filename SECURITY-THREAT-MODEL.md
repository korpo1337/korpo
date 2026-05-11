# KORPO v2 — Security Threat Model & Testnet Proof

**Date**: 2026-05-11  
**Contract**: `0xF970c93D00De94786F6fdABBc63180da1D981bc7` (Base Mainnet)  
**Test Suite**: 55/55 passing (Hardhat)  
**Source**: `contracts/KORPO.sol`  

## Threat Model

### Addressed Threats ✅

| Threat | Mitigation | Test |
|--------|-----------|------|
| Reentrancy on claim | `nonReentrant` modifier (OZ ReentrancyGuard) | ✓ |
| Double-claim within cooldown | `lastClaimTime` + `CLAIM_COOLDOWN` (24h) | ✓ |
| Overflow on totalClaimed | `uint256` — practical supply 1B KORPO | ✓ |
| Unauthorized pause | 24h timelock before pause takes effect | ✓ |
| Burn on claim (self-transfer) | `from == address(this)` exempted from burn | ✓ |
| Burn on zero transfers | `value < BURN_THRESHOLD` skips burn | ✓ |
| Admin rug (sudden pause) | Timelock gives 24h warning window | ✓ |

### Known Risks ⚠️

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Sybil farming** — any wallet can claim 100/day | Medium | Intentional UBI design. Accept per-wallet, not per-human |
| **Low DEX liquidity** — slippage on swaps | Medium | LP exists, volume growing. Explicit risk disclosure on website |
| **Fee-on-transfer breaks routers** — 0.5% burn | Medium | Burn exempt for claim transfers. Swaps work via exactInput |
| **Admin can pause after 24h delay** | Low | Timelock is transparent. Ownership can be renounced post-launch |
| **No external audit** | Medium | 55 unit tests pass. Code is simple (~167 LOC). Community audit invited |
| **Base RPC limitations** — no logs in receipts | Low | Scripts use `staticNetwork:true`. Direct TXs work fine |

### Not Threats ❌

- **Mint beyond supply**: `_transfer(address(this), user, DAILY_CLAIM)` — only contract balance can be claimed
- **Self-destruct**: Contract has no self-destruct, no delegatecall
- **Upgrade proxy**: Contract is NOT proxied. Immutable once deployed
- **Hidden functions**: Source will be verified on Basescan. All functions visible

## Testnet Proof

### Base Sepolia Deployment
- Contract deployed and tested on Base Sepolia before mainnet migration
- All claim/burn/timelock functions verified on testnet
- Multi-wallet claiming tested (20 wallets sequential)

### Mainnet Verification
- Contract deployed: `0xF970c93D00De94786F6fdABBc63180da1D981bc7`
- Claim tested: 100 KORPO claimed successfully
- Transfer tested: WETH↔KORPO swap bidirectional
- Aave V3 supply tested: 2 USDC supplied
- Uniswap V3 LP tested: position created, liquidity active
- Burn tested: transfers >100 KORPO deduct 0.5%
- Cooldown tested: 24h wait verified

## go/no-go Checklist

- [x] 55/55 unit tests passing
- [x] No critical bugs found (Codex + manual review)
- [x] Claim function works on mainnet
- [x] Burn mechanic works on mainnet
- [x] Timelock works (24h queue period)
- [x] Website functional with wallet connect
- [x] Risk disclosure present on website
- [x] Slippage protection on swap scripts (2%)
- [ ] External audit (NOT YET — community audit invited)
- [ ] Ownership renounced (PLANNED — after stabilization)
- [ ] Basescan source verification (PENDING — need API key)

## Conclusion

KORPO v2 is **safe to use as an experimental UBI token**. It is NOT an investment vehicle, NOT audited by a professional firm, and NOT suitable for significant capital. The contract is simple (~167 LOC), has no proxy/upgrade mechanics, and all critical paths are tested. Users should treat KORPO as a social experiment with possible zero value.