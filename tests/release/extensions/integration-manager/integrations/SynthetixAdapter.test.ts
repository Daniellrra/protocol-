import { randomAddress } from '@enzymefinance/ethers';
import {
  assetTransferArgs,
  ISynthetixAddressResolver,
  ISynthetixExchanger,
  SpendAssetsHandleType,
  StandardToken,
  synthetixTakeOrderArgs,
  takeOrderSelector,
} from '@enzymefinance/protocol';
import {
  ProtocolDeployment,
  createNewFund,
  deployProtocolFixture,
  getAssetBalances,
  synthetixAssignExchangeDelegate,
  synthetixResolveAddress,
  synthetixTakeOrder,
} from '@enzymefinance/testutils';
import { BigNumber, utils } from 'ethers';

const sbtcCurrencyKey = utils.formatBytes32String('sBTC');
const susdCurrencyKey = utils.formatBytes32String('sUSD');

let fork: ProtocolDeployment;
beforeEach(async () => {
  fork = await deployProtocolFixture();
});

describe('constructor', () => {
  it('sets state vars', async () => {
    const synthetixAdapter = fork.deployment.synthetixAdapter;

    const integrationManagerResult = await synthetixAdapter.getIntegrationManager();
    expect(integrationManagerResult).toMatchAddress(fork.deployment.integrationManager);

    const originatorResult = await synthetixAdapter.getSynthetixOriginator();
    expect(originatorResult).toMatchAddress(fork.config.synthetix.originator);

    const synthetixPriceFeedResult = await synthetixAdapter.getSynthetixPriceFeed();
    expect(synthetixPriceFeedResult).toMatchAddress(fork.deployment.synthetixPriceFeed);

    const synthetixResult = await synthetixAdapter.getSynthetix();
    expect(synthetixResult).toMatchAddress(fork.config.synthetix.snx);

    const trackingCodeResult = await synthetixAdapter.getSynthetixTrackingCode();
    expect(trackingCodeResult).toBe(fork.config.synthetix.trackingCode);
  });
});

describe('parseAssetsForMethod', () => {
  it('does not allow a bad selector', async () => {
    const synthetixAdapter = fork.deployment.synthetixAdapter;

    const args = synthetixTakeOrderArgs({
      incomingAsset: fork.config.synthetix.synths.sbtc,
      minIncomingAssetAmount: 1,
      outgoingAsset: fork.config.synthetix.susd,
      outgoingAssetAmount: 1,
    });

    await expect(
      synthetixAdapter.parseAssetsForMethod(randomAddress(), utils.randomBytes(4), args),
    ).rejects.toBeRevertedWith('_selector invalid');

    await expect(synthetixAdapter.parseAssetsForMethod(randomAddress(), takeOrderSelector, args)).resolves.toBeTruthy();
  });

  it('generates expected output', async () => {
    const synthetixAdapter = fork.deployment.synthetixAdapter;
    const incomingAsset = fork.config.synthetix.synths.sbtc;
    const minIncomingAssetAmount = utils.parseEther('1');
    const outgoingAsset = fork.config.synthetix.susd;
    const outgoingAssetAmount = utils.parseEther('1');

    const takeOrderArgs = synthetixTakeOrderArgs({
      incomingAsset,
      minIncomingAssetAmount,
      outgoingAsset,
      outgoingAssetAmount,
    });

    const result = await synthetixAdapter.parseAssetsForMethod(randomAddress(), takeOrderSelector, takeOrderArgs);

    expect(result).toMatchFunctionOutput(synthetixAdapter.parseAssetsForMethod, {
      spendAssetsHandleType_: SpendAssetsHandleType.None,
      incomingAssets_: [incomingAsset],
      spendAssets_: [outgoingAsset],
      spendAssetAmounts_: [outgoingAssetAmount],
      minIncomingAssetAmounts_: [minIncomingAssetAmount],
    });
  });
});

describe('takeOrder', () => {
  it('can only be called via the IntegrationManager', async () => {
    const [fundOwner] = fork.accounts;
    const synthetixAdapter = fork.deployment.synthetixAdapter;
    const incomingAsset = fork.config.synthetix.synths.sbtc;
    const minIncomingAssetAmount = utils.parseEther('1');
    const outgoingAsset = fork.config.synthetix.susd;
    const outgoingAssetAmount = utils.parseEther('1');

    const { vaultProxy } = await createNewFund({
      signer: fork.deployer,
      fundOwner,
      fundDeployer: fork.deployment.fundDeployer,
      denominationAsset: new StandardToken(fork.config.synthetix.susd, provider),
    });

    const takeOrderArgs = synthetixTakeOrderArgs({
      incomingAsset,
      minIncomingAssetAmount,
      outgoingAsset,
      outgoingAssetAmount,
    });

    const transferArgs = await assetTransferArgs({
      adapter: synthetixAdapter,
      selector: takeOrderSelector,
      encodedCallArgs: takeOrderArgs,
    });

    await expect(synthetixAdapter.takeOrder(vaultProxy, takeOrderSelector, transferArgs)).rejects.toBeRevertedWith(
      'Only the IntegrationManager can call this function',
    );
  });

  it('works as expected when called by a fund (synth to synth)', async () => {
    const [fundOwner] = fork.accounts;
    const synthetixAdapter = fork.deployment.synthetixAdapter;
    const synthetixAddressResolver = new ISynthetixAddressResolver(fork.config.synthetix.addressResolver, provider);
    const outgoingAsset = new StandardToken(fork.config.primitives.susd, whales.susd);
    const incomingAsset = new StandardToken(fork.config.synthetix.synths.sbtc, provider);

    const { comptrollerProxy, vaultProxy } = await createNewFund({
      signer: fundOwner,
      fundOwner,
      denominationAsset: new StandardToken(fork.config.primitives.susd, provider),
      fundDeployer: fork.deployment.fundDeployer,
    });

    // Load the SynthetixExchange contract
    const exchangerAddress = await synthetixResolveAddress({
      addressResolver: synthetixAddressResolver,
      name: 'Exchanger',
    });
    const synthetixExchanger = new ISynthetixExchanger(exchangerAddress, provider);

    // Delegate SynthetixAdapter to exchangeOnBehalf of VaultProxy
    await synthetixAssignExchangeDelegate({
      comptrollerProxy,
      addressResolver: synthetixAddressResolver,
      fundOwner,
      delegate: synthetixAdapter,
    });

    // Define order params
    const outgoingAssetAmount = utils.parseEther('100');
    const { 0: expectedIncomingAssetAmount } = await synthetixExchanger.getAmountsForExchange(
      outgoingAssetAmount,
      susdCurrencyKey,
      sbtcCurrencyKey,
    );

    // Get incoming asset balance prior to tx
    const [preTxIncomingAssetBalance] = await getAssetBalances({
      account: vaultProxy,
      assets: [incomingAsset],
    });

    // Seed fund and execute Synthetix order
    await outgoingAsset.transfer(vaultProxy, outgoingAssetAmount);
    await synthetixTakeOrder({
      comptrollerProxy,
      vaultProxy,
      integrationManager: fork.deployment.integrationManager,
      fundOwner,
      synthetixAdapter,
      outgoingAsset,
      outgoingAssetAmount,
      incomingAsset,
      minIncomingAssetAmount: expectedIncomingAssetAmount,
    });

    // Get incoming and outgoing asset balances after the tx
    const [postTxIncomingAssetBalance, postTxOutgoingAssetBalance] = await getAssetBalances({
      account: vaultProxy,
      assets: [incomingAsset, outgoingAsset],
    });

    // Assert the expected final token balances of the VaultProxy
    const incomingAssetAmount = postTxIncomingAssetBalance.sub(preTxIncomingAssetBalance);
    expect(incomingAssetAmount).toEqBigNumber(expectedIncomingAssetAmount);
    expect(postTxOutgoingAssetBalance).toEqBigNumber(BigNumber.from(0));
  });
});
