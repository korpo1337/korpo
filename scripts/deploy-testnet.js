const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // 1. Deploy Mock KORPO Token
  console.log("\n--- Deploying MockKORPO ---");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const korpo = await MockERC20.deploy("KORPO", "KORPO", ethers.parseEther("1000000000"));
  await korpo.waitForDeployment();
  console.log("KORPO:", await korpo.getAddress());

  // 2. Deploy Mock WETH
  console.log("\n--- Deploying MockWETH ---");
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", ethers.parseEther("1000000"));
  await weth.waitForDeployment();
  console.log("WETH:", await weth.getAddress());

  // 3. Deploy Mock Position Manager
  console.log("\n--- Deploying MockPositionManager ---");
  const MockPM = await ethers.getContractFactory("MockPositionManager");
  const pm = await MockPM.deploy();
  await pm.waitForDeployment();
  console.log("PositionManager:", await pm.getAddress());

  // 4. Deploy KORPOLiquidityReward
  console.log("\n--- Deploying KORPOLiquidityReward ---");
  const KLR = await ethers.getContractFactory("KORPOLiquidityReward");
  const reward = await KLR.deploy(
    await korpo.getAddress(),
    await pm.getAddress(),
    await weth.getAddress(),  // WETH address (mock for testnet)
    ethers.ZeroAddress       // Merkl distributor (not deployed yet)
  );
  await reward.waitForDeployment();
  console.log("KORPOLiquidityReward:", await reward.getAddress());

  // 5. Fund reward pool
  console.log("\n--- Funding Reward Pool ---");
  const fundAmount = ethers.parseEther("500000"); // 500K KORPO for rewards
  await korpo.approve(await reward.getAddress(), fundAmount);
  await reward.fundRewardPool(fundAmount);
  console.log("Funded with:", ethers.formatEther(fundAmount), "KORPO");

  // 6. Queue and set reward rate (need to timelock)
  // For testnet we'll set it immediately by manipulating timestamp if possible
  // Or just queue it for now
  console.log("\n--- Queuing Reward Rate ---");
  const rewardPerSecond = ethers.parseEther("0.5"); // 0.5 KORPO/second ≈ 15.7M KORPO/year
  await reward.queueSetRewardRate(rewardPerSecond, 0);
  console.log("Reward rate queued - needs 24h timelock to activate");

  // 7. Mint test LP positions for alice and bob
  console.log("\n--- Creating Test LP Positions ---");
  const signers = await ethers.getSigners();
  const alice = signers[1] || signers[0];
  const bob = signers[2] || signers[0];

  // Mint NFT #1: alice, KORPO/WETH, 1% fee, 1 ETH liquidity
  await pm.mint(alice.address, await korpo.getAddress(), await weth.getAddress(), 10000, -887220, 887220, ethers.parseEther("1"));
  console.log("Minted LP NFT #1 for alice");

  // Mint NFT #2: bob, KORPO/WETH, 1% fee, 0.5 ETH liquidity
  await pm.mint(bob.address, await korpo.getAddress(), await weth.getAddress(), 10000, -887220, 887220, ethers.parseEther("0.5"));
  console.log("Minted LP NFT #2 for bob");

  // 8. Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("KORPO Token:", await korpo.getAddress());
  console.log("MockWETH:", await weth.getAddress());
  console.log("PositionManager:", await pm.getAddress());
  console.log("KORPOLiquidityReward:", await reward.getAddress());
  console.log("Owner:", deployer.address);
  console.log("Reward Rate Queued:", ethers.formatEther(rewardPerSecond), "KORPO/sec");
  console.log("=========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });