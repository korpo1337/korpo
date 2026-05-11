# KORPO Launch Checklist — What Jeff Needs To Do

## 1. GitHub Push (5 min)
```bash
cd /home/ubuntu/korpo-v2
gh auth login  # Follow prompts
gh repo create korpo-protocol/korpo-v2 --public --source=. --push
```
Then set as remote:
```bash
git remote add origin https://github.com/korpo-protocol/korpo-v2.git
git push -u origin master
```

## 2. Basescan Contract Verification (5 min)
1. Go to https://basescan.org/register → Create free account
2. Go to https://basescan.org/myapikey → Generate API key
3. Add to .env: `BASESCAN_API_KEY=<your-key>`
4. Run: `npx hardhat verify --network base 0xF970c93D00De94786F6fdABBc63180da1D981bc7`

## 3. CoinGecko Listing (10 min)
1. Go to https://www.coingecko.com/en/coins/new
2. Fill in:
   - Name: KORPO
   - Symbol: KORPO
   - Chain: Base
   - Contract: 0xF970c93D00De94786F6fdABBc63180da1D981bc7
   - Website: https://korpo.pro
   - GitHub: (after step 1)
   - Description: UBI token on Base, 100 KORPO/day free claim, no staking/ICO/referral
   - Logo: /var/www/korpo/assets/logo.svg

## 4. CoinMarketCap Listing (10 min)  
1. Go to https://coinmarketcap.com/request-token/
2. Same details as CoinGecko

## 5. X/Twitter Thread (2 min)
Copy-paste from LAUNCH-ASSETS.md section 3 (5 tweets)

## 6. Reddit Post (5 min)
Post to r/Base, r/defi — copy from LAUNCH-ASSETS.md section 4

## 7. Telegram Group (5 min)
1. Create @korpoubi on Telegram
2. Pin the contract address + website link
3. Add link to korpo.pro footer

## 8. Basescan API Key → Auto Verification
After getting the key, add to .env and run:
```bash
cd /home/ubuntu/korpo-v2
npx hardhat verify --network base 0xF970c93D00De94786F6fdABBc63180da1D981bc7
```

## Already Done (Autonomous)
- ✅ Website: korpo.pro (landing, FAQ, roadmap, waitlist, claim)
- ✅ LP: UniV3 KORPO/WETH pool on Base mainnet
- ✅ Aave V3: 2 USDC supplied
- ✅ Analytics: event tracking on all pages
- ✅ Donation widget: 0.001-0.01 ETH on Base
- ✅ 55/55 tests passing
- ✅ Threat model documented
- ✅ Launch assets written (thread, reddit, HN, demo script)
- ✅ LP fee collection script (harvested fees)
- ✅ 5 cronjobs running (claim, volume, report)
- ✅ Slippage protection (2%) on all swaps
- ✅ Claim button disabled during cooldown