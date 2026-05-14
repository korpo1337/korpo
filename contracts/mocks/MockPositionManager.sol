// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockPositionManager is ERC721 {
    struct Position {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    mapping(uint256 => Position) private _positions;
    uint256 private _nextId = 1;

    constructor() ERC721("UniV3 Positions", "UNI-V3-POS") {}

    function mint(
        address to,
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) external returns (uint256) {
        uint256 tokenId = _nextId++;
        _positions[tokenId] = Position(token0, token1, fee, tickLower, tickUpper, liquidity);
        _mint(to, tokenId);
        return tokenId;
    }

    function positions(uint256 tokenId) external view returns (
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    ) {
        Position storage pos = _positions[tokenId];
        return (
            pos.token0,
            pos.token1,
            pos.fee,
            pos.tickLower,
            pos.tickUpper,
            pos.liquidity,
            0, 0, 0, 0
        );
    }
}