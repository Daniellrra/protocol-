pragma solidity ^0.4.11;

/// @title Sphere Protocol Contract
/// @author Melonport AG <team@melonport.com>
/// @notice This is to be considered as an interface on how to access the underlying Sphere Contract
contract SphereInterface {

    // CONSTANT METHODS

    function getDataFeed() constant returns (address) { return DATAFEED; }
    function getExchange() constant returns (address) { return EXCHANGE; }

}
