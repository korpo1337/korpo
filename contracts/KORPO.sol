// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KORPO — The Fair Distribution Token
 * @notice A minimal token where everyone can claim for free, daily.
 *         Every transfer burns 0.5%, creating natural scarcity.
 *         No ICO. No staking. No referral. No insider allocation.
 *         Pure proof-of-participation, purely fair.
 *
 * ONE-LINER: "Claim free KORPO daily. Every transfer burns 0.5% so scarcity grows with use."
 */
contract KORPO is ERC20, Ownable, ReentrancyGuard {
    // ─── Constants ──────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY    = 1_000_000_000e18;  // 1 billion
    uint256 public constant DAILY_CLAIM     = 100e18;            // 100 KORPO/day
    uint256 public constant BURN_RATE       = 50;                 // 0.5% = 50/10000
    uint256 public constant BURN_DIVISOR    = 10000;
    uint256 public constant CLAIM_COOLDOWN  = 1 days;
    uint256 public constant MIN_BURN_THRESHOLD = 100e18;         // No burn on tiny transfers

    // ─── State ──────────────────────────────────────────────────
    bool    public paused;
    uint256 public totalBurned;
    uint256 public totalClaimed;
    uint256 public uniqueClaimers;

    mapping(address => uint256) public lastClaimTime;
    mapping(address => bool)    public hasClaimed;

    // ─── Timelock for owner actions ─────────────────────────────
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    mapping(bytes32 => uint256) public timelockQueued;

    // ─── Events ─────────────────────────────────────────────────
    event Claimed(address indexed user, uint256 amount, uint256 timestamp);
    event Burned(address indexed from, address indexed to, uint256 burnAmount);
    event PausedSet(bool paused);
    event TimelockQueued(bytes32 indexed actionHash, uint256 executeAfter);
    event TimelockExecuted(bytes32 indexed actionHash);

    // ─── Modifiers ──────────────────────────────────────────────
    modifier notPaused() {
        require(!paused, "KORPO: claims are paused");
        _;
    }

    modifier withTimelock(bytes32 actionHash) {
        require(
            timelockQueued[actionHash] != 0 && block.timestamp >= timelockQueued[actionHash],
            "KORPO: action not queued or timelock not expired"
        );
        delete timelockQueued[actionHash];
        emit TimelockExecuted(actionHash);
        _;
    }

    // ─── Constructor ────────────────────────────────────────────
    constructor() ERC20("KORPO", "KORPO") Ownable(msg.sender) {
        // Mint total supply to creator, who immediately sends to contract
        // We mint to deployer then transfer to contract so totalSupply is correct
        // Actually — mint to contract directly. Supply = 1B tokens sitting in contract.
        _mint(address(this), TOTAL_SUPPLY);
    }

    // ─── Core: Daily Claim ──────────────────────────────────────
    function claim() external notPaused nonReentrant {
        require(
            block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN,
            "KORPO: already claimed today"
        );

        if (!hasClaimed[msg.sender]) {
            hasClaimed[msg.sender] = true;
            uniqueClaimers++;
        }

        lastClaimTime[msg.sender] = block.timestamp;
        totalClaimed += DAILY_CLAIM;

        // Use _transfer directly — exempt from burn since contract is sender
        _transfer(address(this), msg.sender, DAILY_CLAIM);

        emit Claimed(msg.sender, DAILY_CLAIM, block.timestamp);
    }

    // ─── Override: Burn on Transfer ─────────────────────────────
    // Burns only on peer-to-peer transfers. Exempt:
    // - Mint (from=0): no burn
    // - Burn (to=0): no burn  
    // - Contract (from=contract): no burn on claims
    // - Amounts below MIN_BURN_THRESHOLD: no burn (micro-transactions)
    function _update(address from, address to, uint256 value) internal override {
        bool shouldBurn = from != address(0) 
                       && to != address(0) 
                       && from != address(this)
                       && from != to           // No burn on self-transfer (M-1 fix)
                       && value >= MIN_BURN_THRESHOLD;

        if (shouldBurn) {
            uint256 burnAmount = (value * BURN_RATE) / BURN_DIVISOR;
            if (burnAmount > 0) {
                // Burn first from sender
                super._update(from, address(0), burnAmount);
                totalBurned += burnAmount;
                emit Burned(from, to, burnAmount);
            }
            // Transfer remainder
            super._update(from, to, value - burnAmount);
        } else {
            super._update(from, to, value);
        }
    }

    // ─── Timelock Admin: Queue + Execute Pattern ───────────────
    function _queueAction(bytes32 actionHash) internal {
        timelockQueued[actionHash] = block.timestamp + TIMELOCK_DELAY;
        emit TimelockQueued(actionHash, block.timestamp + TIMELOCK_DELAY);
    }

    function queueSetPaused(bool _paused) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("setPaused", _paused));
        _queueAction(hash);
    }

    function setPaused(bool _paused) external onlyOwner withTimelock(keccak256(abi.encode("setPaused", _paused))) {
        paused = _paused;
        emit PausedSet(_paused);
    }

    function queueRenounceOwnership() external onlyOwner {
        bytes32 hash = keccak256(abi.encode("renounceOwnership"));
        _queueAction(hash);
    }

    function renounceOwnership() public override onlyOwner withTimelock(keccak256(abi.encode("renounceOwnership"))) {
        Ownable.renounceOwnership();
    }

    function queueTransferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "KORPO: zero address");
        bytes32 hash = keccak256(abi.encode("transferOwnership", newOwner));
        _queueAction(hash);
    }

    function transferOwnership(address newOwner) public override onlyOwner withTimelock(keccak256(abi.encode("transferOwnership", newOwner))) {
        Ownable.transferOwnership(newOwner);
    }

    // ─── View Helpers ────────────────────────────────────────────
    function remainingSupply() external view returns (uint256) {
        return balanceOf(address(this));
    }

    function canClaim(address user) external view returns (bool) {
        return !paused && block.timestamp >= lastClaimTime[user] + CLAIM_COOLDOWN;
    }

    function nextClaimTime(address user) external view returns (uint256) {
        uint256 next = lastClaimTime[user] + CLAIM_COOLDOWN;
        return next > block.timestamp ? next : 0;
    }
}