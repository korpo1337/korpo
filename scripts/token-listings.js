const https = require('https');

// Submit KORPO to token listing aggregators
const KORPO_INFO = {
  name: "KORPO",
  symbol: "KORPO",
  address: "0xF970c93D00De94786F6fdABBc63180da1D981bc7",
  chain: "Base",
  chainId: 8453,
  decimals: 18,
  website: "https://korpo.pro",
  logo: "https://korpo.pro/assets/logo.png",
  description: "Universal Basic Income on Chain. Claim 100 KORPO daily. Pure UBI token - no staking, no ICO, no team allocation. Community-owned.",
  socials: {
    website: "https://korpo.pro",
  },
  links: {
    basescan: "https://basescan.org/address/0xF970c93D00De94786F6fdABBc63180da1D981bc7",
    uniswap: "https://app.uniswap.org/explore/tokens/base/0xF970c93D00De94786F6fdABBc63180da1D981bc7",
  }
};

console.log("=== KORPO Token Listing Submissions ===\n");

// 1. DexScreener - auto-indexes, verify it's there
console.log("1. DexScreener: Auto-indexes tokens with swap activity");
console.log("   Check: https://dexscreener.com/base/0xF970c93D00De94786F6fdABBc63180da1D981bc7");
console.log("   Token profile: https://dexscreener.com/base?maker=0xF970c93D00De94786F6fdABBc63180da1D981bc7\n");

// 2. DEXTools - submit via their form
console.log("2. DEXTools: Submit at https://www.dextools.io/app/etherscan/token/0xF970c93D00De94786F6fdABBc63180da1D981bc7");
console.log("   → Click 'Add token' on DEXTools Base section\n");

// 3. CoinGecko - submit via API/form
console.log("3. CoinGecko: Submit at https://www.coingecko.com/en/coins/new");
console.log("   Token contract:", KORPO_INFO.address);
console.log("   Chain: Base (8453)\n");

// 4. CoinMarketCap - submit
console.log("4. CoinMarketCap: Submit at https://coinmarketcap.com/request-token/");
console.log("   Token contract:", KORPO_INFO.address);
console.log("   Chain: Base\n");

// 5. GeckoTerminal - auto-indexes DEX pairs
console.log("5. GeckoTerminal: Auto-indexes pairs via API");
console.log("   Check: https://www.geckoterminal.com/base/pools\n");

// 6. Base ecosystem registry
console.log("6. Base Ecosystem: Submit at https://base.org/ecosystem");
console.log("   Category: DeFi / UBI\n");

// 7. DefiLlama
console.log("7. DefiLlama: Submit at https://defillama.com/submit");
console.log("   Protocol type: Yield\n");

console.log("=== Social & Community ===\n");
console.log("8. Twitter/X: Post thread about KORPO UBI launch on Base");
console.log("9. Telegram: Create @korpoubi community group");
console.log("10. Reddit: Post to r/Base, r/defi, r/CryptoCurrency");
console.log("11. Farcaster: Cast about KORPO on Warpcast");
console.log("12. Medium/Mirror: Write launch article\n");

// Verify DexScreener has the pair
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {headers: {'User-Agent': 'Mozilla/5.0'}}, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({raw: d.slice(0,500)}); } });
    }).on('error', reject);
  });
}

(async () => {
  // Check if DexScreener already has KORPO
  const ds = await get('https://api.dexscreener.com/latest/dex/tokens/0xF970c93D00De94786F6fdABBc63180da1D981bc7');
  if (ds.pairs && ds.pairs.length > 0) {
    console.log("✅ DexScreener ALREADY has KORPO!");
    ds.pairs.forEach(p => {
      console.log(`   ${p.dexId}: ${p.baseToken.symbol}/${p.quoteToken.symbol} — $${Number(p.priceUsd||0).toFixed(8)} — volume: $${Number(p.volume?.h24||0).toFixed(2)}`);
    });
  } else {
    console.log("⏳ DexScreener doesn't have KORPO yet — needs more swap volume");
  }

  // Check GeckoTerminal
  const gt = await get('https://api.geckoterminal.com/api/v2/networks/base/tokens/0xF970c93D00De94786F6fdABBc63180da1D981bc7');
  if (gt.data) {
    console.log("✅ GeckoTerminal has KORPO listed");
  } else {
    console.log("⏳ GeckoTerminal: not yet indexed");
  }
})();