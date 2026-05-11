const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, { staticNetwork: true });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log("Wallet:", wallet.address);

const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WETH = "0x4200000000000000000000000000000000000006";

// Uniswap V3 NonfungiblePositionManager on Base
const POSITION_MANAGER = "0x036cbdd5a6c0c6a7e6e7ac8ce401e8efb6d880d0";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const POS_MGR_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

async function main() {
  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH:", ethers.formatEther(ethBal));

  const korpo = new ethers.Contract(KORPO, ERC20_ABI, wallet);
  const korpoBal = await korpo.balanceOf(wallet.address);
  console.log("KORPO:", ethers.formatEther(korpoBal));

  // Wrap ETH to WETH
  const wethWrap = ethers.parseEther("0.0004");
  console.log("\nWrapping", ethers.formatEther(wethWrap), "ETH...");
  const WETH_ABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
  ];
  const weth = new ethers.Contract(WETH, WETH_ABI, wallet);
  
  const wrapTx = await weth.deposit({ value: wethWrap, gasLimit: 100000n });
  console.log("Wrap tx:", wrapTx.hash);
  await wrapTx.wait();
  console.log("Wrapped!");

  // Price: 1 KORPO = $0.01, ETH = $2331
  // 1 KORPO = 0.00000429 WETH
  // KORPO per WETH = 233,100
  // token0 = WETH (0x42..), token1 = KORPO (0xf9..)
  // sqrtPriceX96 for 233100 KORPO/WETH
  
  const price = 233100; // KORPO per WETH (token1/token0)
  const sqrtPrice = Math.sqrt(price);
  const Q96 = 79228162514264337593543950336n;
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));
  console.log("sqrtPriceX96:", sqrtPriceX96.toString());
  
  const fee = 10000; // 1% fee tier
  
  // Create pool
  console.log("\nCreating KORPO/WETH pool on Uniswap V3...");
  const posMgr = new ethers.Contract(POSITION_MANAGER, POS_MGR_ABI, wallet);
  
  try {
    const createTx = await posMgr.createAndInitializePoolIfNecessary(
      WETH, KORPO, fee, sqrtPriceX96,
      { gasLimit: 5000000n }
    );
    console.log("Create pool tx:", createTx.hash);
    const receipt = await createTx.wait();
    console.log("Pool creation:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (e) {
    console.log("Create pool error:", e.message.slice(0, 400));
  }

  // Approve tokens
  console.log("\nApproving tokens for Position Manager...");
  const korpoApp = await korpo.approve(POSITION_MANAGER, ethers.parseEther("50"));
  await korpoApp.wait();
  console.log("KORPO approved");
  
  const wethApp = await weth.approve(POSITION_MANAGER, wethWrap);
  await wethApp.wait();
  console.log("WETH approved");

  // Add liquidity (full range)
  console.log("\nAdding liquidity (full range LP)...");
  const deadline = Math.floor(Date.now() / 1000) + 600;
  
  try {
    const mintTx = await posMgr.mint({
      token0: WETH,
      token1: KORPO,
      fee: fee,
      tickLower: -887200,
      tickUpper: 887200,
      amount0Desired: wethWrap,
      amount1Desired: ethers.parseEther("50"),
      amount0Min: 0n,
      amount1Min: 0n,
      recipient: wallet.address,
      deadline: deadline,
    }, { gasLimit: 5000000n });
    console.log("Mint tx:", mintTx.hash);
    const receipt2 = await mintTx.wait();
    console.log("Mint:", receipt2.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  } catch (e) {
    console.log("Mint error:", e.message.slice(0, 400));
  }

  // Final state
  const finalEth = await provider.getBalance(wallet.address);
  console.log("\nFinal ETH:", ethers.formatEther(finalEth));
  console.log("KORPO:", ethers.formatEther(await korpo.balanceOf(wallet.address)));
}

main().catch(e => console.error("FATAL:", e.message));