import { expect } from "chai";
import { MockContract } from "ethereum-waffle";
import { BigNumber, constants, Contract, utils } from "ethers";
import { waffle } from "hardhat";
import IERC3156FlashBorrowerABI from "../../artifacts/contracts/interfaces/IERC3156FlashBorrower.sol/IERC3156FlashBorrower.json";
import MockDolaABI from "../../artifacts/contracts/test/MockDola.sol/MockDola.json";
import DolaFlashMinterABI from "../../artifacts/contracts/test/TestDolaFlashMinter.sol/TestDolaFlashMinter.json";
import { DolaFlashMinter } from "../../typechain";
import { ETH } from "../utils/utils";

describe("Dola Flash Minter", function () {
  let mockDola: Contract;
  let mockBorrower: MockContract;

  let contract: DolaFlashMinter;
  let contractAsUser: DolaFlashMinter;

  const provider = waffle.provider;
  const [deployerWallet, userWallet, treasuryWallet] = provider.getWallets();
  const { deployMockContract, deployContract } = waffle;

  beforeEach(async () => {
    mockDola = await deployContract(deployerWallet, MockDolaABI);
    mockBorrower = await deployMockContract(deployerWallet, IERC3156FlashBorrowerABI.abi);
    contract = (await deployContract(deployerWallet, DolaFlashMinterABI, [
      mockDola.address,
      treasuryWallet.address,
    ])) as DolaFlashMinter;
    contractAsUser = contract.connect(userWallet);
  });

  describe("Flash Loan", async function () {
    it("performs flash loan correctly", async function () {
      await mockBorrower.mock.onFlashLoan.returns(await contract.CALLBACK_SUCCESS());

      const initialTotalSupply = await mockDola.totalSupply();
      const initialMinterBalance = await mockDola.balanceOf(contract.address);
      const loanAmount = 1000;
      const fee = await contract.flashFee(mockDola.address, loanAmount);
      await mockDola.godApprove(mockBorrower.address, contract.address, fee.add(loanAmount));

      await expect(contract.flashLoan(mockBorrower.address, mockDola.address, loanAmount, utils.toUtf8Bytes("invader")))
        .to.emit(contract, "FlashLoan")
        .withArgs(mockBorrower.address, mockDola.address, loanAmount);

      const finalMinterBalance = await mockDola.balanceOf(contract.address);
      const finalTotalSupply = await mockDola.totalSupply();

      expect(finalTotalSupply).to.be.equal(initialTotalSupply);
      expect(finalMinterBalance.sub(initialMinterBalance)).to.be.equal(fee);
      expect(await contract.flashMinted()).to.be.equal(constants.Zero);
    });

    it("fails with wrong callback success value", async function () {
      await mockBorrower.mock.onFlashLoan.returns(utils.formatBytes32String("rugged"));
      const initialTotalSupply = await mockDola.totalSupply();
      const initialMinterBalance = await mockDola.balanceOf(contract.address);
      const loanAmount = 1000;

      await expect(
        contract.flashLoan(mockBorrower.address, mockDola.address, loanAmount, utils.toUtf8Bytes("invader")),
      ).to.be.revertedWith("FLASH_MINTER:CALLBACK_FAILURE");

      const finalMinterBalance = await mockDola.balanceOf(contract.address);
      const finalTotalSupply = await mockDola.totalSupply();

      expect(finalTotalSupply).to.be.equal(initialTotalSupply);
      expect(finalMinterBalance).to.be.equal(initialMinterBalance);
      expect(await contract.flashMinted()).to.be.equal(constants.Zero);
    });

    it("fails with wrong dola address", async function () {
      const initialTotalSupply = await mockDola.totalSupply();

      const initialMinterBalance = await mockDola.balanceOf(contract.address);
      const loanAmount = 1000;

      await expect(
        contract.flashLoan(mockBorrower.address, mockBorrower.address, loanAmount, utils.toUtf8Bytes("invader")),
      ).to.be.revertedWith("FLASH_MINTER:NOT_DOLA");

      const finalMinterBalance = await mockDola.balanceOf(contract.address);
      const finalTotalSupply = await mockDola.totalSupply();

      expect(finalTotalSupply).to.be.equal(initialTotalSupply);
      expect(finalMinterBalance).to.be.equal(initialMinterBalance);
      expect(await contract.flashMinted()).to.be.equal(constants.Zero);
    });

    it("fails with individual limit breached", async function () {
      const initialTotalSupply = await mockDola.totalSupply();
      const initialMinterBalance = await mockDola.balanceOf(contract.address);
      const loanAmount = BigNumber.from(10).pow(34);

      await expect(
        contract.flashLoan(mockBorrower.address, mockDola.address, loanAmount, utils.toUtf8Bytes("invader")),
      ).to.be.revertedWith("FLASH_MINTER:INDIVIDUAL_LIMIT_BREACHED");
      const finalMinterBalance = await mockDola.balanceOf(contract.address);
      const finalTotalSupply = await mockDola.totalSupply();

      expect(finalTotalSupply).to.be.equal(initialTotalSupply);
      expect(finalMinterBalance).to.be.equal(initialMinterBalance);
      expect(await contract.flashMinted()).to.be.equal(constants.Zero);
    });
  });

  describe("Collection", async function () {
    it("collects ether", async function () {
      const initialBalance = await treasuryWallet.getBalance();
      const depositedEther = ETH("1.0");
      await deployerWallet.sendTransaction({
        to: contract.address,
        value: depositedEther,
      });

      await contract.collect(constants.AddressZero);

      const finalBalance = await treasuryWallet.getBalance();
      expect(finalBalance).to.be.equal(initialBalance.add(depositedEther));
    });

    it("collects token", async function () {
      const treasuryAddress = await treasuryWallet.getAddress();
      const initialBalance = await mockDola.balanceOf(treasuryAddress);
      const depositedDola = ETH("1.0");
      await mockDola.mint(contract.address, depositedDola);

      await contract.collect(mockDola.address);

      const finalBalance = await mockDola.balanceOf(treasuryAddress);
      expect(finalBalance).to.be.equal(initialBalance.add(depositedDola));
    });
  });

  describe("Setters", async function () {
    it("emits event when setting flash loan rate", async function () {
      const previousRate = await contract.flashLoanRate();
      const newRate = 10;
      await expect(contract.setFlashLoanRate(newRate))
        .to.emit(contract, "FlashLoanRateUpdated")
        .withArgs(previousRate, newRate);

      expect((await contract.flashLoanRate()).toNumber()).to.be.equal(newRate);
    });

    it("emits event when setting treasury", async function () {
      const previousTreasury = await contract.treasury();
      const newTreasury = await userWallet.getAddress();
      await expect(contract.setTreasury(newTreasury))
        .to.emit(contract, "TreasuryUpdated")
        .withArgs(previousTreasury, newTreasury);
      expect(await contract.treasury()).to.be.equal(newTreasury);
    });

    it("fails when setting treasury with zero address", async function () {
      const previousTreasury = await contract.treasury();
      await expect(contract.setTreasury(constants.AddressZero)).to.be.revertedWith("FLASH_MINTER:INVALID_TREASURY");
      expect(await contract.treasury()).to.be.equal(previousTreasury);
    });
  });

  describe("Views", async function () {
    it("returns max flash loan amount with dola", async function () {
      const maxLoan = await contract.maxFlashLoan(mockDola.address);
      expect(maxLoan).to.be.equal(BigNumber.from(2).pow(112).sub(1));
    });

    it("returns max flash loan amount with non dola", async function () {
      const maxLoan = await contract.maxFlashLoan(contract.address);
      expect(maxLoan).to.be.equal(constants.Zero);
    });

    it("calculates flash loan fee", async function () {
      const rate = await contract.flashLoanRate();
      const loanAmount = ETH("100");
      const fee = await contract.flashFee(mockDola.address, loanAmount);
      expect(fee).to.be.equal(loanAmount.mul(rate).div(constants.WeiPerEther));
    });

    it("fails to calculate flash loan fee when not dola", async function () {
      const loanAmount = ETH("100");
      await expect(contract.flashFee(contract.address, loanAmount)).to.be.revertedWith("FLASH_MINTER:NOT_DOLA");
    });
  });
  describe("ACL", async function () {
    it("forbids non owner to set flash loan rate", async function () {
      await expect(contractAsUser.setFlashLoanRate(10)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("forbids non owner to set treasury", async function () {
      await expect(contractAsUser.setTreasury(userWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });
  });
});
