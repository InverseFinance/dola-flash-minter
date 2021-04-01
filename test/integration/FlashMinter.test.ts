import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import ERC20ABI from "../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";
import { DolaFlashMinter, Erc20, TestFlashBorrower } from "../../typechain";
import {
  deployContract,
  DOLA_ADDRESS,
  DOLA_WHALE,
  resetFork,
  sudo_AddDolaMinter,
  sudo_TransferToken,
} from "../utils/integration";
import { DOLA } from "../utils/utils";

describe("Flash loan integration", function () {
  let myWallet: Signer;
  let dolaContract: Erc20;
  let borrower: TestFlashBorrower;
  let flashMinter: DolaFlashMinter;
  beforeEach(async () => {
    await resetFork();
    [myWallet] = await ethers.getSigners();
    dolaContract = new Contract(DOLA_ADDRESS, ERC20ABI.abi, myWallet) as Erc20;
    flashMinter = await deployContract("MainnetDolaFlashMinter");
    borrower = await deployContract("TestFlashBorrower", [DOLA_ADDRESS, flashMinter.address]);
    await sudo_TransferToken(DOLA_ADDRESS, DOLA_WHALE, DOLA("100000.0"), borrower.address);
    await sudo_AddDolaMinter(flashMinter.address);
  });

  describe("Flash mint", function () {
    it("Borrow once", async function () {
      const borrowerInitialBalance = await dolaContract.balanceOf(borrower.address);
      const loanAmount = DOLA("100000000.0");
      const fee = await flashMinter.flashFee(dolaContract.address, loanAmount);

      await expect(borrower.borrow(loanAmount, 1))
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount);

      const borrowerFinalBalance = await dolaContract.balanceOf(borrower.address);

      expect(borrowerInitialBalance.sub(borrowerFinalBalance)).to.be.equal(fee);
    });

    it("Borrow thrice", async function () {
      const times = 3;
      const borrowerInitialBalance = await dolaContract.balanceOf(borrower.address);
      const loanAmount = DOLA("30000000.0");
      const fee = await flashMinter.flashFee(dolaContract.address, loanAmount.mul(times));

      await expect(borrower.borrow(loanAmount, times))
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount)
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount)
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount);

      const borrowerFinalBalance = await dolaContract.balanceOf(borrower.address);

      expect(borrowerInitialBalance.sub(borrowerFinalBalance)).to.be.equal(fee);
    });
  });
});
