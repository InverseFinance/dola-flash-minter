//SPDX-License-Identifier: None

pragma solidity ^0.8.0;

import "./interfaces/IERC3156FlashBorrower.sol";
import "./interfaces/IERC3156FlashLender.sol";
import "./utils/Ownable.sol";
import "./utils/Address.sol";
import "./ERC20/IERC20.sol";
import "./ERC20/SafeERC20.sol";

contract DolaFlashMinter is Ownable, IERC3156FlashLender {
    using SafeERC20 for IERC20;
    event FlashLoan(address receiver, address token, uint256 value);
    event FlashLoanRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    IERC20 public constant dola =
        IERC20(0x865377367054516e17014CcdED1e7d814EDC9ce4);
    address public treasury = 0x926dF14a23BE491164dCF93f4c468A50ef659D5B;
    uint256 public flashMinted;
    uint256 public flashLoanRate = 0.0008 ether;

    bytes32 public immutable CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");

    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 value,
        bytes calldata data
    ) external override returns (bool) {
        require(token == address(dola), "!dola");
        require(value <= type(uint112).max, "individual loan limit exceeded");
        flashMinted = flashMinted + value;
        require(flashMinted <= type(uint112).max, "total loan limit exceeded");

        // Step 1: Mint Dola to receiver
        dola.mint(address(receiver), value);
        emit FlashLoan(address(receiver), token, value);
        uint256 fee = flashFee(token, value);

        // Step 2: Make flashloan callback
        require(
            receiver.onFlashLoan(msg.sender, token, value, fee, data) ==
                CALLBACK_SUCCESS,
            "flash loan failed"
        );

        // Step 3: Retrieve (minted + fee) Dola from receiver
        dola.safeTransferFrom(address(receiver), address(this), value + fee);

        // Step 4: Burn minted Dola (fees accumulate in contract)
        dola.burn(value);

        flashMinted = flashMinted - value;
        return true;
    }

    // Collect fees and retreive any tokens sent to this contract by mistake
    function collect(address _token) external {
        if (_token == address(0)) {
            Address.sendValue(payable(treasury), address(this).balance);
        } else {
            uint256 balance = IERC20(_token).balanceOf(address(this));
            IERC20(_token).safeTransfer(treasury, balance);
        }
    }

    function setFlashLoanRate(uint256 _newRate) external onlyOwner {
        emit FlashLoanRateUpdated(flashLoanRate, _newRate);
        flashLoanRate = _newRate;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    function maxFlashLoan(address _token)
        external
        view
        override
        returns (uint256)
    {
        return _token == address(dola) ? type(uint112).max - flashMinted : 0;
    }

    function flashFee(address _token, uint256 _value)
        public
        view
        override
        returns (uint256)
    {
        require(_token == address(dola), "!dola");
        return (_value * flashLoanRate) / 1e18;
    }
}
