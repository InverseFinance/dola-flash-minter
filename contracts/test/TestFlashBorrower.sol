// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IERC3156FlashBorrower.sol";
import "../interfaces/IERC3156FlashLender.sol";
import "../ERC20/IERC20.sol";

/* @dev THIS IS AN UNSAFE TEST IMPLEMENTATION. DO NOT USE.
 *      For the reference implementation see:
 *      https://eips.ethereum.org/EIPS/eip-3156
 */
contract TestFlashBorrower is IERC3156FlashBorrower {
    IERC20 public immutable dola;
    IERC3156FlashLender public immutable lender;
    uint256 public times;
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    constructor(IERC20 _dola, IERC3156FlashLender _lender) {
        dola = _dola;
        lender = _lender;
        _dola.approve(address(_lender), type(uint256).max);
    }

    function borrow(uint256 value, uint256 _times) public {
        times = _times - 1;
        lender.flashLoan(IERC3156FlashBorrower(this), address(dola), value, bytes("test"));
    }

    function onFlashLoan(
        address,
        address token,
        uint256 amount,
        uint256,
        bytes calldata data
    ) external override returns (bytes32) {
        // In real life we would check lender and initiator
        if (times > 0) {
            times = times - 1;
            lender.flashLoan(IERC3156FlashBorrower(this), token, amount, data);
        }
        return CALLBACK_SUCCESS;
    }
}
