# Security — KORPO v2

This document describes the security architecture, protective measures, and trust assumptions of the KORPO contract.

## Smart Contract Security

### Reentrancy Protection

The `claim()` function uses OpenZeppelin's `ReentrancyGuard` (`nonReentrant` modifier). This prevents reentrancy attacks where a malicious contract could recursively call `claim()` before the first invocation completes.

While the claim function performs a simple `_transfer` to the caller (not an external call to an untrusted address), the guard is applied defensively. Reentrancy is one of the most common and severe smart contract vulnerabilities, and the cost of the guard is minimal relative to the risk.

### Timelock on Owner Actions

All owner-level actions require a **24-hour timelock** using a queue-then-execute pattern:

1. **Queue**: The owner calls `queue<Action>()`, which records the action hash and earliest execution time.
2. **Wait**: At least 24 hours must pass.
3. **Execute**: The owner calls the action function, which verifies the timelock has expired.

This applies to:

- **Pausing/unpausing claims** (`queueSetPaused` → `setPaused`)
- **Transferring ownership** (`queueTransferOwnership` → `transferOwnership`)
- **Renouncing ownership** (`queueRenounceOwnership` → `renounceOwnership`)

The timelock hash is computed as `keccak256(abi.encode(actionName, parameters))`, binding the execution to the exact parameters queued. The queued entry is deleted after successful execution, preventing replay.

**Why this matters**: Without a timelock, a compromised or malicious owner could pause all claiming instantly. The 24-hour delay gives the community time to react (e.g., claim before a pause takes effect, or exit if ownership is transferred to a hostile party).

### No Admin Fund Access

The contract owner has **no ability** to withdraw, transfer, or otherwise access KORPO tokens held by the contract or by users. The only functions available to the owner are:

- Pause/unpause claiming
- Transfer ownership
- Renounce ownership

All other contract state (token balances, claim records, burn totals) is managed exclusively by the public claim and transfer logic. There is no `withdraw()`, `sweep()`, `rescue()`, or similar function.

### Access Control

- `Ownable` (OpenZeppelin) restricts administrative functions to the contract deployer (or whoever ownership is transferred to).
- Non-owner calls to queue or execute timelocked actions are rejected.
- `transferOwnership` rejects the zero address at queue time, preventing accidental renunciation through ownership transfer.

### Pause Mechanism

- When `paused = true`, the `claim()` function reverts with `"KORPO: claims are paused"`
- Transfers continue to function normally when claims are paused — only claiming is blocked
- Pause state changes require the timelock process described above

### Token Transfers

- Burn logic is implemented in the `_update` override, which is called by both `transfer` and `transferFrom`
- Burns are exempt in four cases: minting (from=0), burning (to=0), contract-originating transfers (from=contract address), and sub-threshold amounts (< 100 KORPO)
- This prevents double-burning and ensures claiming is not penalized

## Dependencies

| Dependency | Version | Notes |
|-----------|---------|-------|
| OpenZeppelin ERC20 | 5.x | Battle-tested ERC20 implementation |
| OpenZeppelin Ownable | 5.x | Standard ownership pattern |
| OpenZeppelin ReentrancyGuard | 5.x | Reentrancy protection modifier |
| Solidity | 0.8.24 | Built-in overflow checks, Cancun EVM |

OpenZeppelin v5 is the current stable release line. No custom cryptographic primitives, assembly blocks, or delegate calls are used. The contract does not use `tx.origin`, block timestamps for critical randomness, or storage slots that conflict with inherited layouts.

## Known Limitations

1. **No formal verification** — The contract has been tested with 52 unit tests but has not undergone formal verification or a professional audit.
2. **Timelock does not cancel** — Once queued, an action can only be delayed (by not executing), not cancelled. The owner can queue a new action with different parameters, but the old queue entry remains until it's executed (which will then fail if the parameters differ). In practice, executing an old queued action with stale parameters will compute a different hash and revert.
3. **Single owner** — Ownership is held by a single address. If that key is compromised, the attacker must still wait 24 hours to execute any action.
4. **No upgradeability** — The contract is immutable once deployed. There is no proxy pattern, no admin key for code changes, and no way to alter the token logic post-deployment. This is by design.

## Recommendations for Users

- Verify the contract address before interacting. Check that the source code matches the verified source on the block explorer.
- Use `canClaim(address)` before calling `claim()` to avoid wasting gas on a reverted transaction.
- Set appropriate gas limits. Claim gas has been benchmarked under 200,000 wei; transfers under 120,000.
- Monitor the `PausedSet` event for any pause actions queued or executed by the owner.