// SPDX-License-Identifier: GPL-3.0

/*
    This file is part of the Enzyme Protocol.

    (c) Enzyme Council <council@enzyme.finance>

    For the full license information, please view the LICENSE
    file that was distributed with this source code.
*/

pragma solidity >=0.6.0 <0.9.0;

import "openzeppelin-solc-0.6/token/ERC20/IERC20.sol";

/// @title ICompoundV2CERC20 Interface
/// @author Enzyme Council <security@enzyme.finance>
interface ICompoundV2CERC20 is IERC20 {
    function accrueInterest() external returns (uint256);

    function borrow(uint256) external returns (uint256);

    function borrowBalanceStored(address) external view returns (uint256);

    function decimals() external view returns (uint8);

    function mint(uint256) external returns (uint256);

    function redeem(uint256) external returns (uint256);

    function repayBorrow(uint256) external returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function underlying() external returns (address);
}
