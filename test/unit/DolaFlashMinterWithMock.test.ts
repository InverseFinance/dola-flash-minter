import { expect, use } from "chai";
import { deployContract, deployMockContract, MockContract, MockProvider, solidity } from "ethereum-waffle";
import { utils } from "ethers";
import IERC3156FlashBorrowerABI from "../../artifacts/contracts/interfaces/IERC3156FlashBorrower.sol/IERC3156FlashBorrower.json";
import MockDolaABI from "../../artifacts/contracts/test/MockDola.sol/MockDola.json";
import DolaFlashMinterABI from "../../artifacts/contracts/test/TestDolaFlashMinter.sol/TestDolaFlashMinter.json";
import { DolaFlashMinter } from "../../typechain";
import { DOLA } from "../utils/utils";

use(solidity);

// Hardhat currently does not support mock interaction verification. We use the waffle provider directly in these tests
describe("Dola flash minter mock interactions", function () {
  let mockDola: MockContract;
  let mockBorrower: MockContract;

  let contract: DolaFlashMinter;

  const provider = new MockProvider();
  const [deployerWallet, treasuryWallet] = provider.getWallets();

  beforeEach(async () => {
    mockDola = await deployMockContract(deployerWallet, MockDolaABI.abi);
    mockBorrower = await deployMockContract(deployerWallet, IERC3156FlashBorrowerABI.abi);
    contract = (await deployContract(deployerWallet, DolaFlashMinterABI, [
      mockDola.address,
      treasuryWallet.address,
    ])) as DolaFlashMinter;
  });

  describe("Flash Loans", async function () {
    it("calls dependencies with correct values", async function () {
      await mockDola.mock.mint.returns();
      await mockDola.mock.burn.returns();
      await mockDola.mock.transferFrom.returns(true);
      await mockBorrower.mock.onFlashLoan.returns(await contract.CALLBACK_SUCCESS());
      const loanAmount = DOLA("1000000");
      const fee = await contract.flashFee(mockDola.address, loanAmount);

      const data = utils.toUtf8Bytes("invader");
      await contract.flashLoan(mockBorrower.address, mockDola.address, loanAmount, data);
      expect("mint").to.be.calledOnContractWith(mockDola, [mockBorrower.address, loanAmount]);
      expect("burn").to.be.calledOnContractWith(mockDola, [loanAmount]);
      expect("transferFrom").to.be.calledOnContractWith(mockDola, [
        mockBorrower.address,
        contract.address,
        fee.add(loanAmount),
      ]);

      expect("onFlashLoan").to.be.calledOnContractWith(mockBorrower, [
        deployerWallet.address,
        mockDola.address,
        loanAmount,
        fee,
        data,
      ]);
    });
  });
});
