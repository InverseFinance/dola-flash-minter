import { config as dotenvConfig } from "dotenv";
import { BigNumber, Contract, ContractFactory, Signer, utils } from "ethers";
import hre, { ethers } from "hardhat";
import { resolve } from "path";
import ERC20ABI from "../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";
import IDolaABI from "../../artifacts/contracts/test/IDola.sol/IDola.json";

import { Erc20 } from "../../typechain";
import { IDola } from "../../typechain/IDola";
dotenvConfig({ path: resolve(__dirname, "./.env") });

const SAFE_CHECKPOINT = 12035088;
export const NOUR = "0x3fcb35a1cbfb6007f9bc638d388958bc4550cb28";
export const DOLA_ADDRESS = "0x865377367054516e17014CcdED1e7d814EDC9ce4";
export const DOLA_WHALE = "0x41f6e96fa35b6dd35044e171e0f6d163a3a77f53";
export const DOLA_DECIMALS = 18;

export async function sudo_AddDolaMinter(minter: string): Promise<void> {
  return sudo(NOUR, (signer: Signer) => {
    const tokenContract = new Contract(DOLA_ADDRESS, IDolaABI.abi, signer) as IDola;
    return tokenContract.addMinter(minter);
  });
}
export async function sudo_TransferToken(
  token: string,
  owner: string,
  amount: BigNumber,
  recipient: string,
): Promise<void> {
  return sudo(owner, (signer: Signer) => {
    const tokenContract = new Contract(token, ERC20ABI.abi, signer) as Erc20;
    return tokenContract.transfer(recipient, amount);
  });
}

async function sudo(sudoUser: string, block: (signer: Signer) => Promise<unknown>) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [sudoUser],
  });
  const signer = await ethers.provider.getSigner(sudoUser);
  await block(signer);
}

export async function sentEth(to: string, amount: string, wallet: Signer): Promise<void> {
  const tx = {
    to,
    value: utils.parseEther(amount),
  };

  await wallet.sendTransaction(tx);
}

export async function resetFork(): Promise<void> {
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_TOKEN}`,
          blockNumber: SAFE_CHECKPOINT,
        },
      },
    ],
  });
}

export async function deployContract<T extends Contract>(contractName: string, args: Array<unknown> = []): Promise<T> {
  const contractFactory: ContractFactory = await hre.ethers.getContractFactory(contractName);
  const contract: Contract = await contractFactory.deploy(...args);
  await contract.deployed();
  return contract as T;
}
