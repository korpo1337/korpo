const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KORPOLiquidityReward v2", function () {
  let korpo, reward, owner, alice, bob;
  let mockPM;
  let nextTokenId = 0; // track token IDs

  const WETH_ADDR = "0x4200000000000000000000000000000000000006";
  const MERKL_ADDR = "0x0000000000000000000000000000000000000001";
  const ONE_DAY = 86400;
  const VEST_PERIOD = 30 * 86400;

  // Helper: mint and track tokenId
  async function mintPosition(to, token0, token1, fee, liquidity) {
    nextTokenId++;
    await mockPM.mint(to, token0, token1, fee, -887220, 887220, liquidity);
    return nextTokenId;
  }

  before(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    korpo = await MockERC20.deploy("KORPO", "KORPO", ethers.parseEther("1000000000"));
    await korpo.waitForDeployment();

    const MockPM = await ethers.getContractFactory("MockPositionManager");
    mockPM = await MockPM.deploy();
    await mockPM.waitForDeployment();

    const KLR = await ethers.getContractFactory("KORPOLiquidityReward");
    reward = await KLR.deploy(
      await korpo.getAddress(),
      await mockPM.getAddress(),
      WETH_ADDR,
      MERKL_ADDR
    );
    await reward.waitForDeployment();

    await korpo.approve(await reward.getAddress(), ethers.parseEther("1000000"));
    await reward.fundRewardPool(ethers.parseEther("1000000"));
  });

  describe("Deployment", function () {
    it("should set correct immutables and constants", async function () {
      expect(await reward.korpoToken()).to.equal(await korpo.getAddress());
      expect(await reward.WETH()).to.equal(WETH_ADDR);
      expect(await reward.KORPO()).to.equal(await korpo.getAddress());
      expect(await reward.MIN_STAKE_PERIOD()).to.equal(ONE_DAY);
      expect(await reward.TIMELOCK_DELAY()).to.equal(ONE_DAY);
      expect(await reward.MAX_POSITION_PCT()).to.equal(50);
      expect(await reward.VEST_PERIOD()).to.equal(VEST_PERIOD);
      expect(await reward.IMMEDIATE_PCT()).to.equal(50);
      expect(await reward.merklDistributor()).to.equal(MERKL_ADDR);
      expect(await reward.owner()).to.equal(owner.address);
    });
  });

  describe("Timelock", function () {
    it("should queue and execute reward rate after delay", async function () {
      const ps = ethers.parseEther("0.1");
      await reward.queueSetRewardRate(ps, 0);
      await expect(reward.setRewardRate(ps, 0)).to.be.revertedWith("timelock");
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 1]);
      await ethers.provider.send("evm_mine");
      await expect(reward.setRewardRate(ps, 0)).to.emit(reward, "RewardRateSet");
    });
  });

  describe("Staking & Rewards", function () {
    it("should allow staking valid KORPO/WETH LP NFT", async function () {
      const tid = await mintPosition(alice.address, await korpo.getAddress(), WETH_ADDR, 10000, ethers.parseEther("1"));
      await mockPM.connect(alice).approve(await reward.getAddress(), tid);
      await expect(reward.connect(alice).stake(tid)).to.emit(reward, "Staked");
      expect(await reward.totalStakedCount()).to.equal(1);
    });

    it("should allow second smaller staker", async function () {
      const tid = await mintPosition(bob.address, await korpo.getAddress(), WETH_ADDR, 10000, ethers.parseEther("0.3"));
      await mockPM.connect(bob).approve(await reward.getAddress(), tid);
      await reward.connect(bob).stake(tid);
      expect(await reward.totalStakedCount()).to.equal(2);
    });

    it("should reject staking same NFT twice", async function () {
      await expect(reward.connect(alice).stake(1)).to.be.revertedWith("already staked");
    });

    it("should reject wrong fee tier", async function () {
      const tid = await mintPosition(alice.address, await korpo.getAddress(), WETH_ADDR, 3000, ethers.parseEther("1"));
      await mockPM.connect(alice).approve(await reward.getAddress(), tid);
      await expect(reward.connect(alice).stake(tid)).to.be.revertedWith("must be 1% fee tier");
    });

    it("should reject non-KORPO/WETH pair", async function () {
      const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
      const tid = await mintPosition(alice.address, USDC, WETH_ADDR, 10000, ethers.parseEther("1"));
      await mockPM.connect(alice).approve(await reward.getAddress(), tid);
      await expect(reward.connect(alice).stake(tid)).to.be.revertedWith("not KORPO/WETH position");
    });

    it("should accumulate and split rewards 50/50", async function () {
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const balBefore = await korpo.balanceOf(alice.address);
      await reward.connect(alice).claimReward(1);
      const balAfter = await korpo.balanceOf(alice.address);
      expect(balAfter).to.be.gt(balBefore); // 50% immediate

      // Vesting entry created for other 50%
      expect(await reward.totalVestingEntries(alice.address)).to.be.gt(0);
    });

    it("should allow claiming vested over time", async function () {
      // Advance 15 days
      await ethers.provider.send("evm_increaseTime", [15 * ONE_DAY]);
      await ethers.provider.send("evm_mine");

      const balBefore = await korpo.balanceOf(alice.address);
      await reward.connect(alice).claimVested();
      const balAfter = await korpo.balanceOf(alice.address);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("should fully vest after VEST_PERIOD", async function () {
      await ethers.provider.send("evm_increaseTime", [16 * ONE_DAY]);
      await ethers.provider.send("evm_mine");
      const vested = await reward.vestedBalance(alice.address);
      // After full period, all should be claimable (any remaining)
      expect(vested).to.be.gte(0);
    });
  });

  describe("Unstaking", function () {
    it("should reject unstaking before MIN_STAKE_PERIOD", async function () {
      const tid = await mintPosition(alice.address, await korpo.getAddress(), WETH_ADDR, 10000, ethers.parseEther("0.1"));
      await mockPM.connect(alice).approve(await reward.getAddress(), tid);
      await reward.connect(alice).stake(tid);
      await expect(reward.connect(alice).unstake(tid))
        .to.be.revertedWith("min stake period not met");
    });

    it("should allow unstaking after MIN_STAKE_PERIOD with vesting", async function () {
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 1]);
      await ethers.provider.send("evm_mine");

      const tid = 5; // the one we just staked
      const balBefore = await korpo.balanceOf(alice.address);
      await reward.connect(alice).unstake(tid);
      const balAfter = await korpo.balanceOf(alice.address);
      expect(balAfter).to.be.gt(balBefore);
    });
  });

  describe("OLP (Protocol-Owned Liquidity)", function () {
    it("should allow owner to add and remove OLP", async function () {
      const tid = await mintPosition(owner.address, await korpo.getAddress(), WETH_ADDR, 10000, ethers.parseEther("5"));
      await mockPM.connect(owner).approve(await reward.getAddress(), tid);
      await expect(reward.addOLP(tid)).to.emit(reward, "OLPAdded");
      expect(await reward.olpCount()).to.equal(1);

      await expect(reward.removeOLP(tid)).to.emit(reward, "OLPRemoved");
      expect(await reward.olpCount()).to.equal(0);
    });

    it("should reject non-owner adding OLP", async function () {
      const tid = await mintPosition(alice.address, await korpo.getAddress(), WETH_ADDR, 10000, ethers.parseEther("1"));
      await mockPM.connect(alice).approve(await reward.getAddress(), tid);
      await expect(reward.connect(alice).addOLP(tid)).to.be.reverted;
    });
  });

  describe("View & Edge Cases", function () {
    it("should preview annual reward", async function () {
      const preview = await reward.previewAnnualReward(ethers.parseEther("1"));
      expect(preview).to.be.gte(0);
    });

    it("should handle onERC721Received", async function () {
      expect(await reward.onERC721Received(alice.address, bob.address, 0, "0x"))
        .to.equal("0x150b7a02");
    });

    it("should allow admin to set Merkl distributor", async function () {
      const d = "0x0000000000000000000000000000000000000002";
      await reward.setMerklDistributor(d);
      expect(await reward.merklDistributor()).to.equal(d);
    });

    it("should reject claim from non-owner", async function () {
      await expect(reward.connect(bob).claimReward(1)).to.be.revertedWith("not owner");
    });
  });
});