# Risk Disclosure — KORPO v2

**Read this document carefully before interacting with the KORPO token. This is not financial advice. KORPO is an experiment with no guarantee of value.**

## Sybil Risk

**The single largest risk to KORPO's distribution model.**

The daily claim of 100 KORPO per wallet does not distinguish between one person with one wallet and one person with one thousand wallets. A determined actor can:

- Create unlimited wallets and claim 100 KORPO per wallet per day
- Use automated scripts to claim across many addresses simultaneously
- Accumulate a disproportionate share of the total supply

This is an inherent limitation of any gas-based sybil resistance on a public blockchain. Gas costs provide a modest economic barrier, but at 100 KORPO/day, even a small future value makes multi-wallet farming profitable.

**Mitigation**: None enforced at the contract level. This is a design trade-off — the alternative (whitelisting, KYC, captchas) would violate the permissionless ethos. The community and any future integrations (DEXs, platforms) may impose their own sybil-resistant criteria.

## Value Risk

**KORPO may have no monetary value at all.**

- There is no inherent value proposition beyond the token mechanics themselves.
- No revenue stream, no backing asset, no promise of future utility.
- The burn mechanism creates deflation but does not create demand.
- If nobody wants to buy KORPO, the burn only reduces supply of a worthless token.

**This is not an investment. The token is free to claim. Never spend money you cannot afford to lose on any cryptocurrency, including KORPO.**

## Regulatory Risk

Token projects face uncertain regulatory environments:

- Jurisdictions may classify tokens as securities, commodities, or other regulated instruments retroactively.
- Tax obligations may arise from claiming (income at fair market value) or burning (potentially a taxable event).
- Future regulation could restrict token transfers, require KYC, or mandate reporting.
- The claim mechanism could be interpreted as an airdrop, which some jurisdictions tax on receipt.

**You are responsible for understanding and complying with your local laws.**

## Smart Contract Risk

Despite testing and careful design:

- **Unaudited**: The contract has not been reviewed by a professional security firm. Bugs may exist.
- **Solidity compiler risk**: Even well-tested compilers can have bugs. Solidity 0.8.24 is mature but not proven bug-free.
- **OpenZeppelin dependency**: While OpenZeppelin is the most battle-tested library in Ethereum, any dependency introduces risk.
- **Logic errors**: The burn-on-transfer override of `_update` is a non-standard pattern. While thoroughly tested, subtle edge cases may exist in interaction with future ERC20 features or integrations.
- **Reentrancy**: While guarded on `claim()`, other functions (`transfer`, `transferFrom`) do not carry the `nonReentrant` modifier. This is standard for ERC20 but worth noting.

## Centralization Risk

- The contract has an **owner** with the ability to pause claiming. While the 24-hour timelock provides a window for community reaction, the owner can still:
  - Pause claiming indefinitely (queue pause, wait 24h, execute, then never unpause)
  - Transfer ownership to an untrusted party
- After renouncing ownership, the contract becomes fully immutable. This is irreversible — no future changes, bug fixes, or emergency responses will be possible.
- The owner cannot access or steal user funds, but they can disrupt the claiming process.

## Liquidity Risk

- There is no guaranteed liquidity. A DEX listing, if it happens, depends on community action.
- Without liquidity, KORPO cannot be easily sold or traded regardless of any theoretical value.
- The burn mechanism only matters if tokens are being transferred; without liquidity and usage, burns are theoretical.

## Economic Model Risk

- **Supply cliff**: If claiming remains active indefinitely, the entire 1 billion supply will eventually be claimed (or burned). The model has no mechanism to reduce claim rate as supply decreases.
- **Burn may be insufficient**: At 0.5% burn rate, significant token velocity is required for meaningful deflation. Low transfer volume means minimal burn impact.
- **Threshold gaming**: The 100 KORPO burn threshold creates an incentive to split large transfers into sub-100 KORPO transactions to avoid the burn. This is a known design trade-off — the alternative (burn on all transfers) would penalize micro-transactions.

## Network Risk

- KORPO is deployed on Base (and testnet on Base Sepolia). Risks of the Base chain apply:
  - Sequencer downtime or censorship
  - Bridge risk (L1 ↔ L2)
  - Base-specific governance decisions
- Transaction fees on Base are paid in ETH, not KORPO, creating a two-asset dependency.

## Operational Risk

- **Key management**: If the owner's private key is lost before renouncing, the timelock functions become permanently unusable. Pause functionality will remain in its current state forever.
- **Frontend risk**: Any web interface for claiming KORPO is separate from the contract. A compromised or malicious frontend can deceive users (e.g., directing them to a different contract address).
- **Phishing**: Copycat tokens with similar names or symbols may appear on DEXs.

## Summary

KORPO is an experimental token with honest mechanics and no promises. The risks are real and non-trivial. Interact with it only if you understand and accept these risks. Do not treat free tokens as guaranteed income.