// SPDX-License-Identifier: GPL-3.0

/*
    This file is part of the Enzyme Protocol.

    (c) Enzyme Council <council@enzyme.finance>

    For the full license information, please view the LICENSE
    file that was distributed with this source code.
*/

pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

/// @title FeeManager Interface
/// @author Enzyme Council <security@enzyme.finance>
/// @notice Interface for the FeeManager
interface IFeeManager {
    // No fees for the current release are implemented post-redeemShares
    enum FeeHook {
        Continuous,
        PreBuyShares,
        PostBuyShares,
        PreRedeemShares
    }
    enum SettlementType {
        None,
        Direct,
        Mint,
        Burn,
        MintSharesOutstanding,
        BurnSharesOutstanding
    }

    function getEnabledFeesForFund(address _comptrollerProxy) external view returns (address[] memory enabledFees_);

    function getFeeSharesOutstandingForFund(address _comptrollerProxy, address _fee)
        external
        view
        returns (uint256 sharesOutstanding_);

    function invokeHook(FeeHook _hook, bytes calldata _settlementData, uint256 _gav) external;
}
