import { expect } from "chai";
import { Contract, Signer, utils } from "ethers";
import { ethers } from "hardhat";
import ERC20ABI from "../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";
import { DolaFlashMinter, Erc20, TestFlashBorrower } from "../../typechain";
import {
  deployContract,
  DOLA,
  DOLA_DECIMALS,
  DOLA_WHALE,
  resetFork,
  sudo_AddDolaMinter,
  sudo_TransferToken,
} from "../utils/integration";

describe("Flash loan integration", () => {
  let myWallet: Signer;
  let dolaContract: Erc20;
  let borrower: TestFlashBorrower;
  let flashMinter: DolaFlashMinter;
  beforeEach(async () => {
    await resetFork();
    [myWallet] = await ethers.getSigners();
    dolaContract = new Contract(DOLA, ERC20ABI.abi, myWallet) as Erc20;
    flashMinter = await deployContract("MainnetDolaFlashMinter");
    borrower = await deployContract("TestFlashBorrower", [DOLA, flashMinter.address]);
    await sudo_TransferToken(DOLA, DOLA_WHALE, utils.parseUnits("100000.0", DOLA_DECIMALS), borrower.address);
    await sudo_AddDolaMinter(flashMinter.address);
  });

  describe("Flash mint", () => {
    it("Borrow once", async () => {
      const loanAmount = utils.parseUnits("100000000.0", DOLA_DECIMALS);
      await expect(borrower.borrow(loanAmount, 1))
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount);
    });

    it("Borrow trice", async () => {
      const loanAmount = utils.parseUnits("30000000.0", DOLA_DECIMALS);
      await expect(borrower.borrow(loanAmount, 3))
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount)
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount)
        .to.emit(flashMinter, "FlashLoan")
        .withArgs(borrower.address, dolaContract.address, loanAmount);
    });
  });
});
