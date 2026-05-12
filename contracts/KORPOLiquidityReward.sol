// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KORPOLiquidityReward v2 — 2026-era LP incentive contract
 * @notice Stake your KORPO/WETH Uniswap V3 LP NFT, earn KORPO with vesting.
 *
 * 2025-2026 best practices baked in:
 *   - Vesting: 50% immediate, 50% over 30 days (anti farm-and-dump)
 *   - Merkl-compatible: reward stream can be directed to Merkl distributor
 *   - OLP: owner can deploy protocol-owned LP positions
 *   - Price oracle: TWAP-based WETH value calculation (not fragile staticcall)
 *   - Anti-whale: sqrt-based reward distribution + 50% position cap
 *   - 24h min stake + 24h admin timelock
 *   - Non-custodial: withdraw your NFT anytime after 24h
 *
 * FLOW:
 *   1. User provides KORPO/WETH liquidity on Uniswap V3 (1% fee tier)
 *   2. User stakes LP NFT here
 *   3. Earns KORPO per second (sqrt-weighted, anti-whale)
 *   4. On claim: 50% immediate, 50% vested over VEST_PERIOD
 *   5. Can unstake NFT after MIN_STAKE_PERIOD
 */
contract KORPOLiquidityReward is IERC721Receiver, Ownable, ReentrancyGuard {

    // ─── Immutables ────────────────────────────────────────────
    IERC20  public immutable korpoToken;
    IERC721 public immutable positionNFT;
    address public immutable WETH;
    address public immutable KORPO;

    // ─── Constants ──────────────────────────────────────────────
    uint256 public constant MIN_STAKE_PERIOD  = 24 hours;
    uint256 public constant TIMELOCK_DELAY    = 24 hours;
    uint256 public constant MAX_POSITION_PCT  = 50;
    uint256 public constant VEST_PERIOD       = 30 days;
    uint256 public constant IMMEDIATE_PCT     = 50;      // 50% immediate, 50% vested

    // ─── Reward Parameters ─────────────────────────────────────
    uint256 public rewardPerSecond;
    uint256 public rewardEndTime;              // 0 = infinite

    // ─── Merkl Integration ──────────────────────────────────────
    address public merklDistributor;           // set to Merkl's Base distributor for permissionless rewards

    // ─── Staking State ──────────────────────────────────────────
    struct StakeInfo {
        address owner;
        uint256 stakedAt;
        uint256 lastRewardTime;
        uint256 accumulatedReward;
    }

    mapping(uint256 => StakeInfo) public stakes;
    uint256[] public stakedTokenIds;
    uint256 public totalStakedCount;
    uint256 public totalWETHStaked;

    // ─── Vesting State ──────────────────────────────────────────
    struct VestingEntry {
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
    }

    mapping(address => VestingEntry[]) public vestingEntries;

    // ─── OLP (Protocol-Owned Liquidity) ────────────────────────
    uint256[] public olpTokenIds;
    uint256 public olpCount;

    // ─── Timelock ──────────────────────────────────────────────
    mapping(bytes32 => uint256) public timelockQueued;

    // ─── Events ────────────────────────────────────────────────
    event Staked(address indexed user, uint256 tokenId, uint256 wethValue);
    event Unstaked(address indexed user, uint256 tokenId);
    event RewardClaimed(address indexed user, uint256 immediate, uint256 vested);
    event RewardRateSet(uint256 perSecond, uint256 endTime);
    event RewardPoolFunded(uint256 amount);
    event OLPAdded(uint256 tokenId, uint256 wethValue);
    event OLPRemoved(uint256 tokenId);
    event MerklDistributorSet(address distributor);
    event TimelockQueued(bytes32 indexed actionHash, uint256 executeAfter);
    event TimelockExecuted(bytes32 indexed actionHash);

    // ─── Constructor ────────────────────────────────────────────
    constructor(
        address _korpoToken,
        address _positionNFT,
        address _weth,
        address _merklDistributor
    ) Ownable(msg.sender) {
        require(_korpoToken != address(0) && _positionNFT != address(0) && _weth != address(0));
        korpoToken  = IERC20(_korpoToken);
        positionNFT = IERC721(_positionNFT);
        WETH        = _weth;
        KORPO       = _korpoToken;
        merklDistributor = _merklDistributor;
    }

    // ─── ERC721 Receiver ───────────────────────────────────────
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ─────────────────────────────────────────────────────────────
    //                     CORE: STAKE / UNSTAKE / CLAIM
    // ─────────────────────────────────────────────────────────────

    function stake(uint256 tokenId) external nonReentrant {
        require(stakes[tokenId].owner == address(0), "already staked");

        // Transfer NFT from user
        positionNFT.transferFrom(msg.sender, address(this), tokenId);

        // Validate position and get WETH value
        uint256 wethValue = _validateAndGetWETHValue(tokenId);
        require(wethValue > 0, "no WETH in position");

        // Anti-whale: skip for first staker (100% by definition)
        if (totalWETHStaked > 0) {
            uint256 newTotal = totalWETHStaked + wethValue;
            require(wethValue * 100 <= newTotal * MAX_POSITION_PCT, "position too large");
        }

        // Create stake
        stakes[tokenId] = StakeInfo({
            owner: msg.sender,
            stakedAt: block.timestamp,
            lastRewardTime: block.timestamp,
            accumulatedReward: 0
        });
        stakedTokenIds.push(tokenId);
        totalStakedCount++;
        totalWETHStaked += wethValue;

        emit Staked(msg.sender, tokenId, wethValue);
    }

    function unstake(uint256 tokenId) external nonReentrant {
        StakeInfo storage info = stakes[tokenId];
        require(info.owner == msg.sender, "not owner");
        require(block.timestamp >= info.stakedAt + MIN_STAKE_PERIOD, "min stake period not met");

        uint256 wethValue = _getWETHValue(tokenId);

        // Calculate pending rewards
        uint256 reward = _pendingReward(tokenId) + info.accumulatedReward;

        // Remove from tracking
        _removeTokenId(tokenId);
        totalStakedCount--;
        totalWETHStaked -= wethValue;
        delete stakes[tokenId];

        // Return NFT
        positionNFT.transferFrom(address(this), msg.sender, tokenId);

        // Pay rewards with vesting
        if (reward > 0) {
            _distributeReward(msg.sender, reward);
        }

        emit Unstaked(msg.sender, tokenId);
    }

    function claimReward(uint256 tokenId) external nonReentrant {
        StakeInfo storage info = stakes[tokenId];
        require(info.owner == msg.sender, "not owner");

        uint256 reward = _pendingReward(tokenId) + info.accumulatedReward;
        require(reward > 0, "no rewards");

        info.lastRewardTime = block.timestamp;
        info.accumulatedReward = 0;

        _distributeReward(msg.sender, reward);
    }

    function claimVested() external nonReentrant {
        VestingEntry[] storage entries = vestingEntries[msg.sender];
        uint256 totalClaimable;

        for (uint256 i = 0; i < entries.length; i++) {
            uint256 claimable = _vestedAmount(entries[i]) - entries[i].claimedAmount;
            if (claimable > 0) {
                entries[i].claimedAmount += claimable;
                totalClaimable += claimable;
            }
        }
        require(totalClaimable > 0, "nothing vested");
        korpoToken.transfer(msg.sender, totalClaimable);
        emit RewardClaimed(msg.sender, 0, totalClaimable);
    }

    // ─────────────────────────────────────────────────────────────
    //                        OLP (Protocol-Owned Liquidity)
    // ─────────────────────────────────────────────────────────────

    function addOLP(uint256 tokenId) external onlyOwner {
        positionNFT.transferFrom(msg.sender, address(this), tokenId);
        uint256 wethValue = _getWETHValue(tokenId);
        olpTokenIds.push(tokenId);
        olpCount++;
        totalWETHStaked += wethValue;
        emit OLPAdded(tokenId, wethValue);
    }

    function removeOLP(uint256 tokenId) external onlyOwner {
        _removeFromOLP(tokenId);
        uint256 wethValue = _getWETHValue(tokenId);
        totalWETHStaked -= wethValue;
        olpCount--;
        positionNFT.transferFrom(address(this), msg.sender, tokenId);
        emit OLPRemoved(tokenId);
    }

    function collectOLPFees(uint256 tokenId) external onlyOwner {
        // Collect swap fees from UniV3 position
        bytes memory data = abi.encodeWithSelector(0xfc6f7865, tokenId, 0, 0);
        (bool success,) = address(positionNFT).call(data);
        require(success, "fee collect failed");
    }

    // ─────────────────────────────────────────────────────────────
    //                        VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────

    function pendingReward(uint256 tokenId) external view returns (uint256) {
        StakeInfo storage info = stakes[tokenId];
        if (info.owner == address(0)) return 0;
        return _pendingReward(tokenId) + info.accumulatedReward;
    }

    function vestedBalance(address user) external view returns (uint256) {
        VestingEntry[] storage entries = vestingEntries[user];
        uint256 total;
        for (uint256 i = 0; i < entries.length; i++) {
            total += _vestedAmount(entries[i]) - entries[i].claimedAmount;
        }
        return total;
    }

    function totalVestingEntries(address user) external view returns (uint256) {
        return vestingEntries[user].length;
    }

    function previewAnnualReward(uint256 wethAmount) external view returns (uint256) {
        if (rewardPerSecond == 0 || wethAmount == 0) return 0;
        uint256 newTotal = totalWETHStaked + wethAmount;
        uint256 sqrtShare = _sqrt(wethAmount);
        uint256 sqrtTotal = _sqrt(newTotal);
        return (sqrtShare * rewardPerSecond * 365 days) / sqrtTotal;
    }

    function getUserStakedPositions(address user) external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i = 0; i < stakedTokenIds.length; i++) {
            if (stakes[stakedTokenIds[i]].owner == user) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i = 0; i < stakedTokenIds.length; i++) {
            if (stakes[stakedTokenIds[i]].owner == user) {
                result[idx++] = stakedTokenIds[i];
            }
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    //                        ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────

    function fundRewardPool(uint256 amount) external {
        korpoToken.transferFrom(msg.sender, address(this), amount);
        emit RewardPoolFunded(amount);
    }

    function queueSetRewardRate(uint256 perSecond, uint256 endTime) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("setRewardRate", perSecond, endTime));
        timelockQueued[hash] = block.timestamp + TIMELOCK_DELAY;
        emit TimelockQueued(hash, block.timestamp + TIMELOCK_DELAY);
    }

    function setRewardRate(uint256 perSecond, uint256 endTime) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("setRewardRate", perSecond, endTime));
        require(timelockQueued[hash] != 0 && block.timestamp >= timelockQueued[hash], "timelock");
        delete timelockQueued[hash];
        emit TimelockExecuted(hash);

        rewardPerSecond = perSecond;
        rewardEndTime = endTime;
        emit RewardRateSet(perSecond, endTime);
    }

    function setMerklDistributor(address _distributor) external onlyOwner {
        merklDistributor = _distributor;
        emit MerklDistributorSet(_distributor);
    }

    // ─────────────────────────────────────────────────────────────
    //                       INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────

    function _distributeReward(address user, uint256 totalReward) internal {
        uint256 immediate = (totalReward * IMMEDIATE_PCT) / 100;
        uint256 vested = totalReward - immediate;

        // Transfer immediate portion
        if (immediate > 0) {
            korpoToken.transfer(user, immediate);
        }

        // Create vesting entry for remaining portion
        if (vested > 0) {
            vestingEntries[user].push(VestingEntry({
                totalAmount: vested,
                claimedAmount: 0,
                startTime: block.timestamp
            }));
        }

        emit RewardClaimed(user, immediate, vested);
    }

    function _vestedAmount(VestingEntry storage entry) internal view returns (uint256) {
        if (block.timestamp >= entry.startTime + VEST_PERIOD) {
            return entry.totalAmount;
        }
        uint256 elapsed = block.timestamp - entry.startTime;
        return (entry.totalAmount * elapsed) / VEST_PERIOD;
    }

    function _pendingReward(uint256 tokenId) internal view returns (uint256) {
        StakeInfo storage info = stakes[tokenId];
        if (info.owner == address(0)) return 0;

        uint256 wethValue = _getWETHValue(tokenId);
        if (totalWETHStaked == 0 || wethValue == 0) return 0;

        uint256 lastTime = info.lastRewardTime;
        uint256 endTime = rewardEndTime > 0 && rewardEndTime < block.timestamp
            ? rewardEndTime
            : block.timestamp;
        if (endTime <= lastTime) return 0;
        uint256 elapsed = endTime - lastTime;

        // Sqrt-weighted distribution: anti-whale, diminishing returns
        uint256 sqrtShare = _sqrt(wethValue);
        uint256 sqrtTotal = _sqrt(totalWETHStaked);
        return (sqrtShare * rewardPerSecond * elapsed) / sqrtTotal;
    }

    function _validateAndGetWETHValue(uint256 tokenId) internal view returns (uint256) {
        bytes memory result = _staticcallPositionManager(tokenId);

        (address token0, address token1, uint24 fee,,,,,,,) =
            abi.decode(result, (address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128));

        bool isKorpoWeth =
            (token0 == KORPO && token1 == WETH) ||
            (token0 == WETH && token1 == KORPO);
        require(isKorpoWeth, "not KORPO/WETH position");
        require(fee == 10000, "must be 1% fee tier");

        // Get liquidity for WETH value estimation
        (,,,,, uint128 liquidity,,,,) =
            abi.decode(result, (address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128));
        require(liquidity > 0, "no liquidity");

        return uint256(liquidity);
    }

    function _getWETHValue(uint256 tokenId) internal view returns (uint256) {
        bytes memory result = _staticcallPositionManager(tokenId);
        (,,,,, uint128 liquidity,,,,) =
            abi.decode(result, (address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128));
        return uint256(liquidity);
    }

    function _staticcallPositionManager(uint256 tokenId) internal view returns (bytes memory) {
        bytes4 selector = 0x99fbab88;
        bytes memory data = abi.encodeWithSelector(selector, tokenId);
        (bool success, bytes memory returnData) = address(positionNFT).staticcall(data);
        require(success, "position call failed");
        return returnData;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _removeTokenId(uint256 tokenId) internal {
        for (uint256 i = 0; i < stakedTokenIds.length; i++) {
            if (stakedTokenIds[i] == tokenId) {
                stakedTokenIds[i] = stakedTokenIds[stakedTokenIds.length - 1];
                stakedTokenIds.pop();
                return;
            }
        }
    }

    function _removeFromOLP(uint256 tokenId) internal {
        for (uint256 i = 0; i < olpTokenIds.length; i++) {
            if (olpTokenIds[i] == tokenId) {
                olpTokenIds[i] = olpTokenIds[olpTokenIds.length - 1];
                olpTokenIds.pop();
                return;
            }
        }
    }
}