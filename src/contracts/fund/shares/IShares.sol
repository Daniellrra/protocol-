pragma solidity 0.5.15;

/// @notice Token representing ownership of the Fund
interface IShares {
    function createFor(address who, uint amount) external;
    function destroyFor(address who, uint amount) external;
}

interface ISharesFactory {
    function createInstance(address _hub) external returns (address);
}

