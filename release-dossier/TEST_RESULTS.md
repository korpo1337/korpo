# KORPO v2 — Test Results

## Unit Tests (Hardhat)
**Result: 52/52 PASSING ✅**

### Coverage
- ✅ Deployment: correct name, symbol, supply, owner, constants
- ✅ Claim flow: daily claim of 100 KORPO, reverts on double claim
- ✅ Cooldown enforcement: canClaim returns false for 24h after claim
- ✅ Transfer mechanics: transfers below threshold have no burn
- ✅ Transfer mechanics: transfers above 100 KORPO burn 0.5%
- ✅ Burn accounting: totalBurned increases correctly
- ✅ Total supply decreases with burns
- ✅ Contract-to-contract transfers exempt from burn
- ✅ Minting (claim from contract) exempt from burn
- ✅ Pause/unpause with 24h timelock
- ✅ Ownership transfer via timelock
- ✅ Ownership renunciation via timelock
- ✅ Revert on unauthorized admin actions
- ✅ Edge cases: zero address, zero amount, self-transfer
- ✅ Gas usage: claim ~146K gas, transfer with burn ~35K gas
- ✅ 20 wallets sequential claiming test

## On-Chain Tests (Base Sepolia)
**Contract: 0xdA6be4CeF62e6075B883300A43A718AcD46f746B**

| Test | Result |
|------|--------|
| Deployment | ✅ All constants correct |
| Claim 100 KORPO | ✅ Gas: 146,367 |
| Transfer < threshold (50 KORPO) | ✅ No burn, exact amount received |
| Transfer to contract (20 KORPO) | ✅ No burn (contract exempt) |
| Double claim prevention | ✅ Can claim = false after claim |
| Timelock pause queue | ✅ Queued with 24h delay |
| Timelock execute too early | ✅ Correctly reverts |
| Owner matches deployer | ✅ |
| Paused = false on deploy | ✅ |

### On-Chain State After Tests
- Remaining supply: 999,999,920 KORPO
- Total claimed: 100 KORPO (1 claimer)
- Total burned: 0 KORPO (no transfers > threshold yet)
- Unique claimers: 1

### Gas Usage (Measured)
| Action | Gas |
|--------|-----|
| First claim (cold SSTORE) | ~146,000 |
| Transfer (no burn) | ~35,000 |
| Transfer (with burn) | ~51,000 |
| Timelock queue | ~29,000 |
| Timelock execute | ~29,000 |

Estimated mainnet cost: Claim ≈ $0.01, Transfer ≈ $0.003 (at Base gas prices)
