const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const KORPO = "0xf970c93d00de94786f6fdabbc63180da1d981bc7";
const WETH = "0x4200000000000000000000000000000000000006";

// CANONICAL Uniswap V3 NonfungiblePositionManager on Base
// (0xb3b6e24f4a5071d2a9e42ec65d0379dce9986f42 has NO bytecode on Base!)
const POSITION_MANAGER = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

const FEE = 10000; // 1%
const TICK_LOWER = -887200;
const TICK_UPPER = 887200;
const WETH_TO_WRAP = ethers.parseEther("0.0005");
const KORPO_TO_ADD = ethers.parseEther("100");

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

const WETH_ABI = [
  "function deposit() payable",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

const POSITION_MANAGER_ABI = [
  "function createAndInitializePoolIfNecessary(address token0,address token1,uint24 fee,uint160 sqrtPriceX96) payable returns (address pool)",
  "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
];

function sqrtPriceX96FromToken1PerToken0(token1PerToken0) {
  const Q96 = 2n ** 96n;
  const scale = 10n ** 18n;
  const ratioX18 = ethers.parseUnits(token1PerToken0, 18);
  const sqrtRatioX18 = sqrtBigInt(ratioX18 * scale);
  return (sqrtRatioX18 * Q96) / scale;
}

function sqrtBigInt(value) {
  if (value < 0n) throw new Error("sqrt only works on non-negative values");
  if (value < 2n) return value;
  let x0 = value / 2n;
  let x1 = (x0 + value / x0) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) / 2n;
  }
  return x0;
}

async function approveIfNeeded(token, spender, amount, label) {
  const allowance = await token.allowance(wallet.address, spender);
  if (allowance >= amount) {
    console.log(`${label} allowance ok`);
    return;
  }
  const tx = await token.approve(spender, amount);
  console.log(`${label} approve: ${tx.hash}`);
  await tx.wait();
}

async function main() {
  console.log("Wallet:", wallet.address);

  // Verify PositionManager has bytecode
  const code = await provider.getCode(POSITION_MANAGER);
  if (code === "0x") {
    throw new Error("PositionManager has no bytecode on Base! Aborting.");
  }
  console.log("PositionManager bytecode OK:", code.slice(0, 18) + "...", `(${(code.length - 2) / 2} bytes)`);

  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH balance:", ethers.formatEther(ethBal));
  if (ethBal < ethers.parseEther("0.0012")) {
    throw new Error(`Need at least 0.0012 ETH for wrap + gas. Current: ${ethers.formatEther(ethBal)}`);
  }

  const korpo = new ethers.Contract(KORPO, ERC20_ABI, wallet);
  const weth = new ethers.Contract(WETH, WETH_ABI, wallet);
  const pm = new ethers.Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, wallet);

  const korpoBal = await korpo.balanceOf(wallet.address);
  console.log("KORPO balance:", ethers.formatEther(korpoBal));
  if (korpoBal < KORPO_TO_ADD) {
    throw new Error(`Need at least ${ethers.formatEther(KORPO_TO_ADD)} KORPO. Current: ${ethers.formatEther(korpoBal)}`);
  }

  // Wrap ETH if needed
  const wethBal = await weth.balanceOf(wallet.address);
  if (wethBal < WETH_TO_WRAP) {
    const toWrap = WETH_TO_WRAP - wethBal;
    const wrapTx = await weth.deposit({ value: toWrap, gasLimit: 100000n });
    console.log("WETH deposit:", wrapTx.hash);
    await wrapTx.wait();
  }

  await approveIfNeeded(weth, POSITION_MANAGER, WETH_TO_WRAP, "WETH");
  await approveIfNeeded(korpo, POSITION_MANAGER, KORPO_TO_ADD, "KORPO");

  // token0=WETH (lower address), token1=KORPO
  // Initial price: 200,000 KORPO per WETH = $0.02/KORPO at ~$4k ETH
  const sqrtPriceX96 = sqrtPriceX96FromToken1PerToken0("200000");
  console.log("sqrtPriceX96:", sqrtPriceX96.toString());

  const createTx = await pm.createAndInitializePoolIfNecessary(
    WETH, KORPO, FEE, sqrtPriceX96,
    { gasLimit: 600000n }
  );
  console.log("createAndInitializePoolIfNecessary:", createTx.hash);
  const createReceipt = await createTx.wait();
  console.log("create gas used:", createReceipt.gasUsed.toString());

  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  const mintParams = {
    token0: WETH,
    token1: KORPO,
    fee: FEE,
    tickLower: TICK_LOWER,
    tickUpper: TICK_UPPER,
    amount0Desired: WETH_TO_WRAP,
    amount1Desired: KORPO_TO_ADD,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: wallet.address,
    deadline,
  };

  const mintTx = await pm.mint(mintParams, { gasLimit: 900000n });
  console.log("mint:", mintTx.hash);
  const mintReceipt = await mintTx.wait();
  console.log("mint gas used:", mintReceipt.gasUsed.toString());
  console.log("DONE! KORPO/WETH pool created + first LP position minted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
