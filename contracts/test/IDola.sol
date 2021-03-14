pragma solidity ^0.8.0;

interface IDola {
    /**
     * @dev Adds a minter
     * @param minter The minter to add
     */
    function addMinter(address minter) external;
}
