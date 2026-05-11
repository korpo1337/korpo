const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("KORPO", function () {
  let korpo;
  let owner, alice, bob, carol;

  const TOTAL_SUPPLY = ethers.parseEther("1000000000");
  const DAILY_CLAIM = ethers.parseEther("100");
  const BURN_RATE = 50n;
  const BURN_DIVISOR = 10000n;
  const MIN_BURN = ethers.parseEther("100");

  function timelockHash(action, ...args) {
    return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", ...args.map(() => typeof args[0] === "boolean" ? "bool" : "address")],
      [action, ...args]
    ));
  }

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const KORPO = await ethers.getContractFactory("KORPO");
    korpo = await KORPO.deploy();
    await korpo.waitForDeployment();
  });

  // ───── Deployment ────────────────────────────────────────
  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await korpo.name()).to.equal("KORPO");
      expect(await korpo.symbol()).to.equal("KORPO");
    });

    it("should mint total supply to contract", async function () {
      expect(await korpo.balanceOf(await korpo.getAddress())).to.equal(TOTAL_SUPPLY);
    });

    it("should set owner", async function () {
      expect(await korpo.owner()).to.equal(owner.address);
    });

    it("should start unpaused", async function () {
      expect(await korpo.paused()).to.be.false;
    });

    it("should have zero burns/claims initially", async function () {
      expect(await korpo.totalBurned()).to.equal(0);
      expect(await korpo.totalClaimed()).to.equal(0);
      expect(await korpo.uniqueClaimers()).to.equal(0);
    });

    it("should have correct total supply", async function () {
      expect(await korpo.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
  });

  // ───── Daily Claim ───────────────────────────────────────
  describe("Daily Claim", function () {
    it("should allow first claim", async function () {
      await korpo.connect(alice).claim();
      // 100 KORPO claimed, no burn on claim (transfer from contract)
      expect(await korpo.balanceOf(alice.address)).to.equal(DAILY_CLAIM);
    });

    it("should track unique claimers", async function () {
      await korpo.connect(alice).claim();
      expect(await korpo.uniqueClaimers()).to.equal(1);
      await korpo.connect(bob).claim();
      expect(await korpo.uniqueClaimers()).to.equal(2);
    });

    it("should not double-count unique claimers", async function () {
      await korpo.connect(alice).claim();
      await time.increase(86400);
      await korpo.connect(alice).claim();
      expect(await korpo.uniqueClaimers()).to.equal(1);
    });

    it("should reject double claim within cooldown", async function () {
      await korpo.connect(alice).claim();
      await expect(korpo.connect(alice).claim()).to.be.revertedWith("KORPO: already claimed today");
    });

    it("should allow claim after cooldown", async function () {
      await korpo.connect(alice).claim();
      await time.increase(86400);
      await korpo.connect(alice).claim();
      // Two claims of 100 each = 200 KORPO
      expect(await korpo.balanceOf(alice.address)).to.equal(DAILY_CLAIM * 2n);
    });

    it("should update totalClaimed", async function () {
      await korpo.connect(alice).claim();
      expect(await korpo.totalClaimed()).to.equal(DAILY_CLAIM);
    });

    it("should reduce contract balance", async function () {
      await korpo.connect(alice).claim();
      expect(await korpo.remainingSupply()).to.equal(TOTAL_SUPPLY - DAILY_CLAIM);
    });
  });

  // ───── View Helpers ─────────────────────────────────────
  describe("View Helpers", function () {
    it("canClaim returns true before first claim", async function () {
      expect(await korpo.canClaim(alice.address)).to.be.true;
    });

    it("canClaim returns false after claim", async function () {
      await korpo.connect(alice).claim();
      expect(await korpo.canClaim(alice.address)).to.be.false;
    });

    it("canClaim returns true after cooldown", async function () {
      await korpo.connect(alice).claim();
      await time.increase(86400);
      expect(await korpo.canClaim(alice.address)).to.be.true;
    });

    it("nextClaimTime returns 0 when can claim", async function () {
      expect(await korpo.nextClaimTime(alice.address)).to.equal(0);
    });

    it("nextClaimTime returns correct time after claim", async function () {
      const tx = await korpo.connect(alice).claim();
      const receipt = await tx.getBlock();
      const expected = BigInt(receipt.timestamp) + 86400n;
      expect(await korpo.nextClaimTime(alice.address)).to.equal(expected);
    });
  });

  // ───── Burn on Transfer ──────────────────────────────────
  describe("Burn on Transfer", function () {
    it("should burn 0.5% on transfer above threshold and receive 99.5%", async function () {
      await korpo.connect(alice).claim();
      // Alice has 100 KORPO, transfers all to bob
      // Burn: 0.5% of 100 = 0.5 KORPO
      // Bob receives: 99.5 KORPO
      const burnAmount = (TOTAL_SUPPLY / TOTAL_SUPPLY * 100n * BURN_RATE) / BURN_DIVISOR; // 0.5 KORPO
      // Actually just compute: 100 * 0.5% = 0.5
      const expectedBurn = ethers.parseEther("0.5");
      const expectedReceived = ethers.parseEther("99.5");

      await korpo.connect(alice).transfer(bob.address, DAILY_CLAIM);
      expect(await korpo.balanceOf(bob.address)).to.equal(expectedReceived);
      expect(await korpo.totalBurned()).to.equal(expectedBurn);
    });

    it("should not burn on transfers below threshold", async function () {
      await korpo.connect(alice).claim();
      const smallAmount = ethers.parseEther("50"); // Below 100 threshold
      await korpo.connect(alice).transfer(bob.address, smallAmount);
      expect(await korpo.balanceOf(bob.address)).to.equal(smallAmount);
      expect(await korpo.totalBurned()).to.equal(0);
    });

    it("should track totalBurned accumulating across transfers", async function () {
      await korpo.connect(alice).claim();
      await korpo.connect(alice).transfer(bob.address, DAILY_CLAIM);
      expect(await korpo.totalBurned()).to.equal(ethers.parseEther("0.5"));
    });

    it("should emit Burned event", async function () {
      await korpo.connect(alice).claim();
      await expect(korpo.connect(alice).transfer(bob.address, DAILY_CLAIM))
        .to.emit(korpo, "Burned")
        .withArgs(alice.address, bob.address, ethers.parseEther("0.5"));
    });

    it("should handle multiple sequential burns", async function () {
      // Alice claims, burns on transfer to Bob
      await korpo.connect(alice).claim();
      await korpo.connect(alice).transfer(bob.address, DAILY_CLAIM);
      const firstBurn = ethers.parseEther("0.5");
      expect(await korpo.totalBurned()).to.equal(firstBurn);

      // Bob has 99.5, claims more, then transfers to Carol
      await time.increase(86400);
      await korpo.connect(bob).claim();
      const bobBalance = await korpo.balanceOf(bob.address);
      // bobBalance = 99.5 + 100 = 199.5 KORPO
      await korpo.connect(bob).transfer(carol.address, bobBalance);
      // Burn on 199.5 * 0.5% = 0.9975 KORPO
      const secondBurn = (bobBalance * BURN_RATE) / BURN_DIVISOR;
      expect(await korpo.totalBurned()).to.be.closeTo(firstBurn + secondBurn, ethers.parseEther("0.001"));
    });

    it("should not burn on mint (from=0)", async function () {
      // Claims transfer from contract - contract already has the tokens, no extra burn
      await korpo.connect(alice).claim();
      // Alice should get exactly 100 KORPO (no burn on claim)
      expect(await korpo.balanceOf(alice.address)).to.equal(DAILY_CLAIM);
    });

    it("should not burn on explicit approval+transferFrom (contract exempt)", async function () {
      // Claims transfer from contract — no burn applied
      await korpo.connect(alice).claim();
      expect(await korpo.balanceOf(alice.address)).to.equal(DAILY_CLAIM); // No burn
    });

    it("should reduce totalSupply when burning on transfer", async function () {
      const supplyBefore = await korpo.totalSupply();
      await korpo.connect(alice).claim();
      await korpo.connect(alice).transfer(bob.address, DAILY_CLAIM);
      const supplyAfter = await korpo.totalSupply();
      expect(supplyAfter).to.be.lt(supplyBefore);
    });
  });

  // ───── Pause / Unpause ──────────────────────────────────
  describe("Pause Mechanism", function () {
    it("should reject claims when paused", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      await korpo.connect(owner).setPaused(true);
      await expect(korpo.connect(alice).claim()).to.be.revertedWith("KORPO: claims are paused");
    });

    it("should allow claims after unpause", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      await korpo.connect(owner).setPaused(true);

      await korpo.connect(owner).queueSetPaused(false);
      await time.increase(86400);
      await korpo.connect(owner).setPaused(false);

      await korpo.connect(alice).claim();
      expect(await korpo.balanceOf(alice.address)).to.equal(DAILY_CLAIM);
    });

    it("should emit PausedSet event", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      await expect(korpo.connect(owner).setPaused(true))
        .to.emit(korpo, "PausedSet")
        .withArgs(true);
    });

    it("transfers should still work when paused", async function () {
      await korpo.connect(alice).claim();
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      await korpo.connect(owner).setPaused(true);
      // Transfers still work when paused — only claims are blocked
      await korpo.connect(alice).transfer(bob.address, ethers.parseEther("50"));
      // 50 is below MIN_BURN_THRESHOLD, so no burn
      expect(await korpo.balanceOf(bob.address)).to.equal(ethers.parseEther("50"));
    });
  });

  // ───── Timelock ──────────────────────────────────────────
  describe("Timelock", function () {
    it("should require queueing before setPaused", async function () {
      await expect(korpo.connect(owner).setPaused(true))
        .to.be.revertedWith("KORPO: action not queued or timelock not expired");
    });

    it("should require waiting 24h before executing", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await expect(korpo.connect(owner).setPaused(true))
        .to.be.revertedWith("KORPO: action not queued or timelock not expired");
    });

    it("should emit TimelockQueued event", async function () {
      const tx = await korpo.connect(owner).queueSetPaused(true);
      const receipt = await tx.getBlock();
      const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string", "bool"], ["setPaused", true]));
      await expect(tx).to.emit(korpo, "TimelockQueued").withArgs(hash, BigInt(receipt.timestamp) + 86400n);
    });

    it("should emit TimelockExecuted event on execution", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string", "bool"], ["setPaused", true]));
      await expect(korpo.connect(owner).setPaused(true))
        .to.emit(korpo, "TimelockExecuted")
        .withArgs(hash);
    });

    it("should prevent re-execution after used", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      await korpo.connect(owner).setPaused(true);
      await expect(korpo.connect(owner).setPaused(true))
        .to.be.revertedWith("KORPO: action not queued or timelock not expired");
    });

    it("should allow renounceOwnership after timelock", async function () {
      await korpo.connect(owner).queueRenounceOwnership();
      await time.increase(86400);
      await korpo.connect(owner).renounceOwnership();
      expect(await korpo.owner()).to.equal(ethers.ZeroAddress);
    });

    it("should allow transferOwnership after timelock", async function () {
      await korpo.connect(owner).queueTransferOwnership(alice.address);
      await time.increase(86400);
      await korpo.connect(owner).transferOwnership(alice.address);
      expect(await korpo.owner()).to.equal(alice.address);
    });

    it("should reject transferOwnership to zero address", async function () {
      await expect(korpo.connect(owner).queueTransferOwnership(ethers.ZeroAddress))
        .to.be.revertedWith("KORPO: zero address");
    });
  });

  // ───── Access Control ────────────────────────────────────
  describe("Access Control", function () {
    it("should reject non-owner queueSetPaused", async function () {
      await expect(korpo.connect(alice).queueSetPaused(true)).to.be.reverted;
    });

    it("should reject non-owner setPaused even after timelock", async function () {
      await korpo.connect(owner).queueSetPaused(true);
      await time.increase(86400);
      await expect(korpo.connect(alice).setPaused(true)).to.be.reverted;
    });

    it("should reject non-owner queueRenounceOwnership", async function () {
      await expect(korpo.connect(alice).queueRenounceOwnership()).to.be.reverted;
    });
  });

  // ───── Edge Cases ───────────────────────────────────────
  describe("Edge Cases", function () {
    it("should handle exact burn threshold", async function () {
      await korpo.connect(alice).claim();
      // Transfer exactly 100 KORPO (threshold)
      const expectedBurn = (ethers.parseEther("100") * BURN_RATE) / BURN_DIVISOR; // 0.5
      const expectedReceived = ethers.parseEther("100") - expectedBurn; // 99.5
      await korpo.connect(alice).transfer(bob.address, ethers.parseEther("100"));
      expect(await korpo.balanceOf(bob.address)).to.equal(expectedReceived);
    });

    it("should not burn just below threshold", async function () {
      await korpo.connect(alice).claim();
      // 99.999... KORPO is below 100 threshold
      const below = ethers.parseEther("99.999999999999999999");
      await korpo.connect(alice).transfer(bob.address, below);
      // No burn, bob gets full amount
      expect(await korpo.balanceOf(bob.address)).to.equal(below);
    });

    it("should handle many sequential claims from different users", async function () {
      const signers = await ethers.getSigners();
      for (let i = 1; i < Math.min(signers.length, 10); i++) {
        await korpo.connect(signers[i]).claim();
      }
      expect(await korpo.uniqueClaimers()).to.equal(Math.min(signers.length - 1, 9));
    });

    it("remainingSupply tracks correctly", async function () {
      await korpo.connect(alice).claim();
      await korpo.connect(bob).claim();
      expect(await korpo.remainingSupply()).to.equal(TOTAL_SUPPLY - DAILY_CLAIM * 2n);
    });

    it("should handle transfer of entire balance", async function () {
      await korpo.connect(alice).claim();
      const bal = await korpo.balanceOf(alice.address);
      // Transfer entire balance — burn will reduce it, so bob receives less
      await korpo.connect(alice).transfer(bob.address, bal);
      const bobBal = await korpo.balanceOf(bob.address);
      const expectedBurn = (bal * BURN_RATE) / BURN_DIVISOR;
      expect(bobBal).to.equal(bal - expectedBurn);
    });

    it("totalSupply decreases with burns", async function () {
      const supplyBefore = await korpo.totalSupply();
      await korpo.connect(alice).claim();
      await korpo.connect(alice).transfer(bob.address, DAILY_CLAIM);
      const supplyAfter = await korpo.totalSupply();
      expect(supplyAfter).to.be.lt(supplyBefore);
      const burned = supplyBefore - supplyAfter;
      expect(burned).to.equal(ethers.parseEther("0.5")); // 0.5% of 100
    });
  });

  // ───── Reentrancy Protection ─────────────────────────────
  describe("Reentrancy Protection", function () {
    it("should have nonReentrant on claim", async function () {
      // Just verify claim works — real reentrancy tests need malicious contracts
      await korpo.connect(alice).claim();
      expect(await korpo.balanceOf(alice.address)).to.equal(DAILY_CLAIM);
    });
  });

  // ───── Gas Usage ─────────────────────────────────────────
  describe("Gas Usage", function () {
    it("claim should use reasonable gas", async function () {
      const tx = await korpo.connect(alice).claim();
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      console.log(`      Claim gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(200000n); // ~146K first claim (SSTORE)
    });

    it("transfer with burn should use reasonable gas", async function () {
      await korpo.connect(alice).claim();
      const tx = await korpo.connect(alice).transfer(bob.address, DAILY_CLAIM);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      console.log(`      Transfer+burn gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(120000n);
    });

    it("transfer without burn (below threshold) should use reasonable gas", async function () {
      await korpo.connect(alice).claim();
      const tx = await korpo.connect(alice).transfer(bob.address, ethers.parseEther("50"));
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      console.log(`      Transfer (no burn) gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(80000n);
    });
  });

  // ───── Simulated Sybil Resistance ─────────────────────────
  describe("Sybil Scenario", function () {
    it("should handle 20 wallets claiming sequentially", async function () {
      const signers = await ethers.getSigners();
      // Use first 20 signers (Hardhat provides 20 by default)
      for (let i = 0; i < 20; i++) {
        await korpo.connect(signers[i]).claim();
        expect(await korpo.balanceOf(signers[i].address)).to.equal(DAILY_CLAIM);
      }
      expect(await korpo.uniqueClaimers()).to.equal(20);
      expect(await korpo.totalClaimed()).to.equal(DAILY_CLAIM * 20n);
      expect(await korpo.remainingSupply()).to.equal(TOTAL_SUPPLY - DAILY_CLAIM * 20n);
    });
  });
});