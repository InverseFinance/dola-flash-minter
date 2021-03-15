// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockDola is ERC20 {
    // solhint-disable-next-line no-empty-blocks
    constructor() ERC20("Dola USD Stablecoin", "DOLA") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function godApprove(
        address from,
        address to,
        uint256 amount
    ) public {
        _approve(from, to, amount);
    }
}
