//SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "../DolaFlashMinter.sol";

contract TestDolaFlashMinter is DolaFlashMinter {
    // solhint-disable-next-line no-empty-blocks
    constructor(address _dola, address _treasury) DolaFlashMinter(_dola, _treasury) {}
}
