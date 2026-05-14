# KORPO Token: Complete Zero-Capital Bootstrap Strategy
## Base Chain (0xF970c93D) — May 2026

---

## 1. BASE ECOSYSTEM GRANTS & ACCELERATOR PROGRAMS

### Builder Rewards
- **URL:** https://docs.base.org/get-started/get-funded
- **What:** Base rewards onchain activity — every qualifying onchain action earns points that convert to USDC rewards
- **How to qualify:** Build a dApp, smart contract, or tool on Base; get verified on the Base Dashboard (https://base.dev)
- **Cost:** $0 to apply
- **Action for KORPO:** Create a KORPO-themed dApp (staking UI, governance portal, or community tool). Register on Base Dashboard. Earn Builder Rewards in USDC — use that USDC as initial LP capital on Aerodrome.

### Builder Grants
- **URL:** https://paragraph.com/@grants.base.eth/calling-based-builders
- **What:** Direct grants from Base for projects building onchain utility
- **Typical size:** $5K–$50K in USDC/ETH
- **Application:** Free, rolling applications
- **Action for KORPO:** Write a grant proposal where KORPO serves as governance/utility token for a community-owned protocol. Frame it as infrastructure, not speculation.

### Base Batches (Accelerator)
- **URL:** https://www.basebatches.xyz/
- **What:** Cohort-based 8-week accelerator for Base builders
- **Includes:** Mentorship, Base team access, co-marketing, network effects
- **Cost:** $0 (free to participate, no equity taken)
- **Action for KORPO:** Apply to Base Batches with a concrete product around KORPO (e.g., community governance tool, DeFi primitive, or onchain reputation system)

### Base Ecosystem Fund
- **URL:** https://docs.google.com/forms/d/e/1FAIpQLSeiSAod4PAbXlvvDGtHWu-GqzGpvHYfaTQR2f77AawD7GYc4Q/viewform
- **What:** Larger investment fund ($50K–$500K+) for projects building on Base
- **Best for:** Projects with demonstrated traction or team credentials
- **Action for KORPO:** Only apply AFTER you have some traction (users, TVL, community). Not suitable at zero-liquidity stage.

### Paymaster Gas Credits
- **URL:** https://www.coinbase.com/developer-platform/products/paymaster
- **What:** Free gas credits for smart wallet integrations
- **Action for KORPO:** Use Base's smart wallet/paymaster to make KORPO transactions gasless for users. This removes friction for new token holders.

### Base Country Leads & Ambassadors
- **URL:** https://docs.base.org/get-started/country-leads-and-ambassadors
- **What:** Regional community leaders who amplify Base projects
- **Action:** Connect with your regional Base Country Lead for co-marketing and community introductions.

---

## 2. AERODROME LIQUIDITY INCENTIVE PROGRAMS

### How Aerodrome Works for New Tokens
Aerodrome is Base's dominant DEX (Velodrome fork, ve(3,3) model). This is your #1 bootstrap path.

**Key mechanisms:**
- **Gauge Voting:** AERO holders vote on liquidity gauges; winning gauges receive AERO emissions as LP incentives
- **Pool Creation:** Anyone can create a KORPO/ETH pool on Aerodrome for ~free (just gas)
- **Bribe Markets:** You can bribe AERO voters to direct emissions to your pool — but this costs money
- **veAERO:** Lock AERO for up to 4 years to get voting power, then vote for your own pool

### Zero-Capital Aerodrome Strategy
1. **Create a KORPO/ETH pool** on Aerodrome (cost: minimal gas)
2. **Apply for a gauge** through Aerodrome governance (forum post + snapshot vote)
3. **Community vote campaign:** Rally KORPO holders to buy and lock AERO, then vote for the KORPO gauge
4. **Voter bribe partnerships:** Partner with other Base projects to cross-bribe — you promote their gauge, they promote yours
5. **veAERO accumulation:** Use any AERO earned from early LP positions to lock as veAERO, directing future emissions to KORPO

### Aerodrome Gauge Application Process
- Post on Aerodrome Discord (#gauge-discussion) with token details, contract address, utility
- Get community feedback and support
- Snapshot vote for gauge inclusion
- If approved, AERO emissions flow to KORPO/ETH LPs → attracts liquidity with ZERO cost to you

### Gauge Bribe Marketplace
- Aerodrome has an integrated bribe marketplace at aerodrome.finance
- Even small bribes (50-100 AERO) can attract voter attention
- Alternative: Use HiddenHand or Votium for off-chain bribe aggregation

---

## 3. UNISWAP V3 LIQUIDITY BOOTSTRAPPING WITH MINIMAL CAPITAL

### Single-Sided Token Provision
With $0, you can still create a Uniswap V3 pool:
1. **Provide KORPO only:** Create a KORPO/WETH pool where you contribute KORPO tokens (you have 200) on one side
2. **Concentrated liquidity:** Use narrow tick ranges to maximize capital efficiency — even tiny amounts of ETH have impact
3. **The 0.000748 ETH you have:** Use this as initial WETH-side liquidity in a very narrow range

### Step-by-Step Strategy
1. **Create Uniswap V3 pool** with KORPO/WETH pair on Base
2. **Set initial price:** Choose a price that makes sense (e.g., 1 KORPO = 0.0001 ETH)
3. **Open narrow position:** Deploy your 0.000748 ETH + a portion of KORPO tokens in a tight range (e.g., ±5%)
4. **Use remaining KORPO** across multiple narrow ranges at different price points
5. **This creates "liquidity depth illusion"** — traders see activity on DexScreener

### Alternative: Uniswap V2 (Simpler)
- Create KORPO/WETH pair on Uniswap V2 on Base
- Requires both tokens — pair your 200 KORPO with 0.000748 ETH
- Creates a visible market immediately
- Lower capital efficiency than V3 but simpler

### Flash Loan Bootstrap (Advanced)
- Borrow ETH via flash loan → provide KORPO/ETH liquidity → earn fees → repay flash loan
- **Risk:** If no one trades, you can't repay the flash loan. Only works if you expect immediate trading volume.

---

## 4. FARCASTER/FRAMES MARKETING FOR BASE TOKENS

### Farcaster — The #1 Free Marketing Channel for Base
Farcaster is THE social layer for Base. 90%+ of Base's early adopter community is active there.

**Free strategies:**
1. **Post in /base channel:** Share KORPO updates, milestones, tokenomics
2. **Post in /base-builds channel:** https://warpcast.com/~/channel/base-builds
3. **Build a Frame:** Create interactive mini-apps (Frames) that live in Farcaster posts
   - Token claim Frame (verify wallet → airdrop KORPO)
   - Vote Frame (KORPO governance polls)
   - Leaderboard Frame (top KORPO holders)
   - Quiz Frame (earn KORPO by answering questions)
4. **Warpcast client:** Free to use, no cost to post
5. **Follow/engage with Base builders** — they often amplify new projects

### Frame Development (Zero Cost)
- **Neynar** offers free Frame hosting and API tier
- **Frames.js** is open-source — build Frames with zero backend cost
- Deploy on Vercel free tier for hosting
- Frame types that drive engagement:
  - "Mint KORPO" Frame (free claim with wallet verification)
  - "KORPO Staking Score" Frame (shows user's KORPO stats)
  - "Community Vote" Frame (vote on KORPO governance using Farcaster ID)

### Farcaster Tips
- Tag @base in posts for potential amplification
- Use the /base and /base-builds channels
- Cast consistently — Farcaster rewards active posters
- Engage with other Base token creators for cross-promotion

---

## 5. FREE TOKEN LISTING SERVICES

### DexScreener (Priority #1)
- **URL:** https://dexscreener.com
- **Listing:** Automatic — any Uniswap/Aerodrome pair on Base appears automatically
- **Cost:** Free to list; paid boost ($200-$5K) for featured placement
- **Claim your pair:** Verify as the token creator to add logo, socials, description
- **Action:** After creating your first LP pair, go to DexScreener → search your contract → "Claim pair" → add metadata

### Geckoterminal (CoinGecko)
- **URL:** https://geckoterminal.com
- **Listing:** Automatic for DEX pairs on supported chains (Base is supported)
- **Cost:** Free to list
- **Action:** After LP creation, your pair auto-appears. Then apply for CoinGecko coin listing

### CoinGecko Listing
- **URL:** https://www.coingecko.com/en/coins/new
- **Cost:** Free (standard), paid expedite available
- **Requirements:** Working website, social channels, smart contract, liquidity
- **Timeline:** 1-4 weeks for review
- **Action:** Apply AFTER you have liquidity and a working website

### CoinMarketCap Listing
- **URL:** https://coinmarketcap.com/new
- **Cost:** Free (standard)
- **Requirements:** Similar to CoinGecko — website, socials, volume, community
- **Action:** Apply after CoinGecko listing

### DEX Aggregators (Auto-listed)
- **1inch:** Automatically indexes Base pairs
- **Jupiter (via Base bridge):** Will route to your pair
- **ParaSwap:** Auto-indexes
- **0x API:** Auto-indexes

### BaseScan Verification
- **URL:** https://basescan.org
- **Action:** Verify your contract source code (free). This builds trust when people look up the token.

---

## 6. COMMUNITY GROWTH PLATFORMS

### Galxe
- **URL:** https://galxe.com
- **What:** Web3 credential & campaign platform
- **Free features:** Create quests, credential campaigns, OATs (onchain achievement tokens)
- **Strategy for KORPO:**
  1. Create a "KORPO Pioneer" OAT for early claimers
  2. Run a quest: "Follow KORPO on X + Join Telegram + Claim KORPO" → earn OAT
  3. Galxe campaigns get featured in their discovery feed (free exposure)
  4. Use Galxe's "Space" to build a KORPO community hub

### Layer3
- **URL:** https://layer3.xyz
- **What:** Quest & credential platform focused on Base
- **Strategy:** Create a "KORPO Explorer" quest where users complete onchain actions (claim KORPO, provide LP, stake) to earn credentials
- **Base integration:** Layer3 has a strong Base community and often promotes Base-native quests

### QuestN (now QuestN)
- **URL:** https://questn.com
- **What:** Web3 quest platform with incentive campaigns
- **Free tier:** Create quests with token rewards
- **Strategy:** Airdrop KORPO tokens as quest rewards — costs $0 since you control token supply

### Zealy
- **URL:** https://zealy.io
- **What:** Quest/community platform (formerly Crew3)
- **Free tier:** Create community quests, XP system, leaderboards
- **Strategy:** KORPO community quests — "Share KORPO on X" = 50 XP, "Provide LP" = 500 XP

### Cred
- **URL:** https://cred.xyz
- **What:** Onchain reputation and identity on Base
- **Strategy:** Issue KORPO Cred badges for community contributors

### BuildOnBase Discord
- **URL:** https://discord.com/invite/buildonbase
- **400K+ members** — active Base community
- **Strategy:** Be helpful, share progress, get feedback. The #showcase channel is ideal for KORPO.

---

## 7. VE(3,3) TOKENOMICS & AERODROME BOOTSTRAPPING

### What is ve(3,3)?
ve(3,3) combines:
- **ve (vote-escrow):** Lock tokens for voting power (like Curve's veCRV)
- **(3,3):** Nash equilibrium from OlympusDAO — all participants benefit from voting/locking vs. selling

### How Aerodrome's ve(3,3) Works
1. **LPs** provide KORPO/ETH liquidity → earn trading fees + AERO emissions
2. **AERO holders** lock AERO → earn veAERO → vote on gauge weights
3. **Voters** direct AERO emissions to pools they want incentivized
4. **Bribers** pay voters to direct emissions to specific pools

### Why This Matters for KORPO
**This is the ONLY mechanism where you can attract significant liquidity with zero capital.**

Here's how:
1. Create KORPO/ETH pool on Aerodrome
2. Apply for gauge listing
3. If gauge approved, AERO emissions automatically flow to KORPO LPs
4. This means: **other people will provide KORPO/ETH liquidity to earn AERO**
5. You don't spend a single dollar — voters direct Base ecosystem emissions to your pool

### Gauge Application Best Practices
- Write a detailed forum post explaining KORPO's utility
- Show community size (Telegram members, Twitter followers)
- Demonstrate onchain activity (transactions, holders)
- Get community members to voice support in the forum
- Respond to all questions quickly

### Post-Gauge Strategy
- Once gauge is live, use **voter bribes** (small amounts) to boost initial votes
- Cross-promote with other Aerodrome gauge projects
- Accumulate AERO from any LP position you do have → lock as veAERO → vote for KORPO gauge

### Aerodrome Fee Distribution
- Pools earn swap fees (0.01% to 1%)
- Fees distributed to veAERO voters who voted for that gauge
- This creates a self-reinforcing loop: more votes → more emissions → more liquidity → more fees → more bribes/votes

---

## 8. MICRO-VCS & ANGEL INVESTORS IN BASE ECOSYSTEM

### Base-Specific Investment Vehicles

1. **Base Ecosystem Fund** (Coinbase Ventures + USV + Paradigm)
   - Focus: Infrastructure and high-impact dApps on Base
   - Size: $50K–$5M+
   - Apply: https://docs.google.com/forms/d/e/1FAIpQLSeiSAod4PAbXlvvDGtHWu-GqzGpvHYfaTQR2f77AawD7GYc4Q/viewform

2. **1kx** — Early-stage crypto fund, active Base investor
3. **Dragonfly Capital** — Backed Base itself, invests in ecosystem
4. **Variant Fund** — Focused on consumer crypto, active on Base
5. **Founders Fund** — Crypto-native, Base ecosystem investments

### Community-Driven Investment

6. **Syndicate** — Create a KORPO investment syndicate at $0 cost
   - Friends & community pool ETH to buy KORPO/provide LP
   - Legal framework provided by Syndicate
   - URL: https://syndicate.io

7. **AngelList Syndicates** — Find crypto angels via AngelList

8. **Base Discord #fundraising channel** — Network with other builders and investors

### DAO-to-DAO Partnerships
9. **Partner with existing Base DAOs** — Offer KORPO tokens as utility in their ecosystem
10. ** OlympusDAO-style bonds** — Sell KORPO tokens at a discount for LP tokens (people provide ETH/KORPO LP and get KORPO at a discount)

### Revenue-Based Approaches (Zero Capital)
- **Token-for-service swaps:** Offer KORPO tokens to developers, designers, marketers in exchange for work
- **Protocol revenue sharing:** Design KORPO so holders earn protocol fees → attracts investors based on revenue, not hype

---

## 9. SOCIAL MEDIA STRATEGIES

### Telegram Groups
- **Create KORPO Telegram:** Free, instant community hub
- **Cross-promote in Base groups:** base.org Discord (400K+ members), Base Telegram communities
- **Airdrop campaigns:** "Join Telegram + verify wallet → receive KORPO"
- **VIP channel:** For top holders, create a private discussion group

### Twitter/X Strategies
- **Build in public:** Daily threads on KORPO development progress
- **Tag @base and @BuildOnBase** for amplification
- **Twitter Spaces:** Host weekly KORPO Spaces (free, no cost)
  - "KORPO Community Call" every Thursday
  - Invite Base ecosystem founders as guests
  - Record and repost as threads
- **Meme creation:** Base community loves memes — create KORPO-themed memes
- **Base Builders X List:** https://x.com/i/lists/1869425408573075694 — get added

### Farcaster (DETAILED)
- Already covered in Section 4, but emphasize:
- This is THE primary Base social platform
- Post daily, engage in /base and /base-builds channels
- Build Frames for KORPO

### Discord Communities
- **BuildOnBase:** https://discord.com/invite/buildonbase (400K+ members)
- **Aerodrome Discord:** For gauge discussions and voter engagement
- **Uniswap Discord:** For Base-specific discussions

### Content Marketing (Zero Cost)
- **Mirror.xyz / Paragraph.xyz:** Write KORPO blog posts (free)
- **YouTube:** Record KORPO tutorials, AMAs
- **Podcast appearances:** Offer to be a guest on Base/crypto podcasts
- **GitHub:** Open-source all KORPO contracts and tools (builds credibility)

### Virtual Events
- **Base Virtual Events:** https://basedvirtualevents.deform.cc/
- Host KORPO launch event through Base's virtual events program
- Co-host with other Base projects for cross-promotion

---

## 10. CROSS-CHAIN BRIDGE INCENTIVE PROGRAMS

### Base Bridge (Official)
- **URL:** https://bridge.base.org
- **What:** Official Coinbase bridge to Base
- **Cost:** Free to use (gas subsidized)
- **Strategy:** Use the official bridge to make KORPO accessible. If KORPO is only on Base, users need to bridge to Base — make that clear in your docs.

### Third-Party Bridges with Incentive Programs

1. **Across Protocol**
   - Often runs incentive programs for new chains
   - Relayed bridge with competitive fees
   - Strategy: Apply for Across incentives when adding KORPO liquidity

2. **Stargate Finance**
   - LayerZero-powered bridge
   - Has historically run incentive programs for Base liquidity
   - Strategy: Check for active STG incentive programs on Base

3. **Orbiter Finance**
   - Zero-fee bridge promotions common
   - Strategy: Use Orbiter for community bridge tutorials

4. **Symbiosis Finance**
   - Cross-chain swap aggregator
   - Strategy: List KORPO pairs when volume exists

5. **Hop Protocol**
   - Has run Base incentive campaigns
   - Strategy: Monitor for future incentive rounds

### Bridge Liquidity Mining (When You Have Some Capital)
- Provide liquidity on bridge protocols to earn their token incentives
- Use earned tokens to provide KORPO liquidity
- Self-reinforcing cycle

### Cross-Chain Token Deployment Strategy
1. Deploy KORPO on Base first (already done)
2. **Later:** Bridge to Ethereum mainnet, Arbitrum, Optimism for broader exposure
3. Each deployment creates new DexScreener listings = more visibility
4. Use LayerZero OFT (Omnichain Fungible Token) standard for seamless cross-chain
5. **Cost:** Deployment gas only (minimal on Base)

---

## PRIORITY ACTION PLAN (Ordered by Impact × Feasibility)

### IMMEDIATE (This Week — $0 Cost)
1. **Create Aerodrome KORPO/ETH pool** with your 0.000748 ETH + KORPO tokens
2. **Apply for Aerodrome gauge** (forum post + community support campaign)
3. **Create KORPO Telegram group** + Discord server
4. **Register on Base Dashboard** (https://base.dev) for Builder Rewards
5. **Get KORPO listed on DexScreener & Geckoterminal** (auto after LP creation)
6. **Start posting on Farcaster** /base and /base-builds channels
7. **Claim DexScreener pair** and add token metadata (logo, socials, description)
8. **Verify contract on BaseScan**

### SHORT-TERM (2-4 Weeks — Near-Zero Cost)
9. **Build a Farcaster Frame** for KORPO (mint, claim, or governance)
10. **Apply for Base Batches** accelerator
11. **Create Galxe campaign** for "KORPO Pioneer" OAT
12. **Create Zealy community** with KORPO quests
13. **Launch KORPO website** (Vercel free tier + Farcaster auth)
14. **Apply for Base Builder Grants** (write proposal)
15. **Start daily Twitter/X threads** building in public
16. **Host weekly Twitter Spaces** on KORPO

### MEDIUM-TERM (1-3 Months — Using Early Returns)
17. **Use any Builder Rewards USDC** to add more Aerodrome liquidity
18. **Bribe Aerodrome voters** (small amounts) to boost gauge votes
19. **Apply for CoinGecko listing** (once volume exists)
20. **Create Uniswap V3 concentrated positions** for better capital efficiency
21. **Cross-promote with other Base tokens** for mutual Aerodrome voter support
22. **Explore Syndicate** for community investment pool

### LONG-TERM (3-6 Months)
23. **Apply for Base Ecosystem Fund** investment (need traction first)
24. **Launch KORPO governance** with ve-token model (emulate Aerodrome)
25. **Deploy KORPO on other chains** via LayerZero OFT
26. **Build DAO-to-DAO partnerships**
27. **List on CEXs** (once volume justifies)

---

## KEY INSIGHT: THE AERODROME GAUGE FLYWHEEL

```
Create KORPO/ETH Pool → Apply for Gauge → Get Approved →
    ↓
AERO Emissions Flow to KORPO LPs →
    ↓
Others Add KORPO/ETH Liquidity (to Earn AERO) →
    ↓
More Liquidity = More Trading = More Fees = More Visibility →
    ↓
Better DexScreener Stats → More Traders Discover KORPO →
    ↓
KORPO Value Increases → More People Interested →
    ↓
Community Grows → Apply for Grants → Get Funding →
    ↓
Add More Liquidity → Lock AERO as veAERO → Vote for Own Gauge →
    ↓
REINFORCING CYCLE ♻️
```

This is the single most important zero-capital strategy. Everything else supports this flywheel.

---

## KORPO-SPECIFIC CONSIDERATIONS

**Current State:** 0xF970c93D, 200 tokens, 2 claimers, 0.000748 ETH
**Challenge:** Extremely thin liquidity, minimal capital

**Realistic Assessment:**
- With 0.000748 ETH (~$1.50), you can't create meaningful initial liquidity alone
- The Aerodrome gauge path is the ONLY realistic zero-capital liquidity play
- Community-building must precede liquidity — nobody provides LP to an unknown token
- Focus on narrative: What does KORPO DO? What utility does it have?

**Token Utility Ideas (Free to Implement):**
- Governance token for a community DAO
- Staking rewards from protocol fees
- Access token for KORPO-exclusive content/events
- Reputation/credential token for onchain achievements
- Tips/social rewards on Farcaster

**Critical Success Factor:** KORPO must have UTILITY beyond speculation. 
An ERC-20 token with 200 supply and no utility will attract zero LP regardless of strategy.