// Shared Base mainnet constants for all KORPO scripts
// Last verified: 2026-05-11

module.exports = {
  // Token
  KORPO: "0xf970c93d00de94786f6fdabbc63180da1d981bc7",
  WETH: "0x4200000000000000000000000000000000000006",
  USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",

  // Uniswap V3 on Base (official from gov.uniswap.org deployment list)
  UNISWAP_V3_FACTORY: "0x33128a8fC17869897dcE68Ed026d694621f6FDGF",
  UNISWAP_V3_POSITION_MANAGER: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
  UNISWAP_V3_SWAP_ROUTER_02: "0x2626664c2603336e57b63ce23ff376b3e35c6f3a",
  // NOTE: createAndMint works via 0x036cbdd5 but official list says 0x03a520b
  // In practice on Base, 0x036cbdd5 works for createAndMint, 0x03a520b for mint

  // Aave V3 on Base (verified via aave.com/help)
  AAVE_V3_POOL: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  // WRONG address found in old scripts: 0x13a74610ad9263d02d39e2a5003e2778c7a3a7aa

  // RPC
  BASE_RPC: "https://mainnet.base.org",
  BASE_CHAIN_ID: 8453,

  // Wallet
  WALLET: "0xAFe3A600e81ecfB0714e28Bff82c9944C4B7666d",

  // Gas limits
  MAX_GAS_LIMIT: 500000, // 5M causes insufficient ETH — NEVER use higher
  SWAP_GAS: 300000,
  CLAIM_GAS: 500000,
  LP_GAS: 1000000,
};