import { EthereumTestnetProvider } from '@crestproject/crestproject';
import { ICERC20 } from '@melonproject/protocol';
import { defaultForkDeployment } from '@melonproject/testutils';

const gasAssertionTolerance = 0.03; // 3%

async function snapshot(provider: EthereumTestnetProvider) {
  const { accounts, deployment, config } = await defaultForkDeployment(provider);

  return {
    accounts,
    deployment,
    config,
    cDai: new ICERC20(config.derivatives.compound.cdai, provider),
    cEth: new ICERC20(config.derivatives.compound.ceth, provider),
  };
}

describe('getRatesToUnderlyings', () => {
  it('returns rate for underlying token (cERC20)', async () => {
    const {
      config: {
        tokens: { dai: token },
      },
      deployment: { compoundPriceFeed },
      cDai: cERC20,
    } = await provider.snapshot(snapshot);

    const getRatesReceipt = await compoundPriceFeed.getRatesToUnderlyings(cERC20);

    // exchangeRate (base 1e18) = (totalCash + totalBorrows - totalReserves) / totalSupply
    const expectedRate = await cERC20.exchangeRateStored();
    const feedRate = await compoundPriceFeed.getRatesToUnderlyings.args(cERC20).call();

    expect(feedRate.rates_[0]).toEqBigNumber(expectedRate);
    expect(feedRate.underlyings_[0]).toMatchAddress(token);

    // Rounding up from 42295
    expect(getRatesReceipt).toCostLessThan('42300', gasAssertionTolerance);
  });

  it('returns rate for underlying token (cETH)', async () => {
    const {
      config: {
        tokens: { weth: token },
      },
      deployment: { compoundPriceFeed },
      cEth,
    } = await provider.snapshot(snapshot);

    const getRatesReceipt = await compoundPriceFeed.getRatesToUnderlyings(cEth);

    const expectedRate = await cEth.exchangeRateStored();
    const feedRate = await compoundPriceFeed.getRatesToUnderlyings.args(cEth).call();

    expect(feedRate.rates_[0]).toEqBigNumber(expectedRate);
    expect(feedRate.underlyings_[0]).toMatchAddress(token);

    // Rounding up from 30991
    expect(getRatesReceipt).toCostLessThan('31000', gasAssertionTolerance);
  });
});

// describe('expected values', () => {
// it('returns the expected value from the valueInterpreter (18 decimals)', async () => {
//   const {
//     deployment: { valueInterpreter },
//     config: {
//       deployer,
//       tokens: { dai },
//       derivatives: {
//         compound: { cdai: cdaiAddress },
//       },
//     },
//   } = await provider.snapshot(snapshot);
//   const cdai = new ICERC20(cdaiAddress, deployer);
//   const baseDecimals = await cdai.decimals();
//   const quoteDecimals = await dai.decimals();
//   expect(baseDecimals).toEqBigNumber(8);
//   expect(quoteDecimals).toEqBigNumber(18);
//   // cDai/usd price at 11/12/2020 had a price of 0,020886 USD.
//   // Source: <https://www.coingecko.com/en/coins/compound-dai/historical_data/usd?start_date=2020-11-12&end_date=2020-12-21
//   const canonicalAssetValue = await valueInterpreter.calcCanonicalAssetValue
//     .args(cdai, utils.parseUnits('1', baseDecimals), dai)
//     .call();
//   expect(canonicalAssetValue).toMatchFunctionOutput(valueInterpreter.calcCanonicalAssetValue, {
//     value_: BigNumber.from('20764289285628633'),
//     isValid_: true,
//   });
// });
// it('returns the expected value from the valueInterpreter (non 18 decimals)', async () => {
//   const {
//     deployment: { valueInterpreter },
//     config: {
//       deployer,
//       tokens: { usdc },
//       derivatives: {
//         compound: { cusdc: cusdcAddresses },
//       },
//     },
//   } = await provider.snapshot(snapshot);
//   const cusdc = new ICERC20(cusdcAddresses, deployer);
//   const baseDecimals = await cusdc.decimals();
//   const quoteDecimals = await usdc.decimals();
//   expect(baseDecimals).toEqBigNumber(8);
//   expect(quoteDecimals).toEqBigNumber(6);
//   // cusdc/usd price at 11/12/2020 had a price of $0.02138245
//   // source: https://www.coingecko.com/en/coins/compound-usd-coin/historical_data/usd?start_date=2020-11-12&end_date=2020-11-12#panel
//   const canonicalAssetValue = await valueInterpreter.calcCanonicalAssetValue
//     .args(cusdc, utils.parseUnits('1', baseDecimals), usdc)
//     .call();
//   expect(canonicalAssetValue).toMatchFunctionOutput(valueInterpreter.calcCanonicalAssetValue, {
//     value_: BigNumber.from('21382'),
//     isValid_: true,
//   });
// });
// });
