import { BigNumber, Contract, utils } from "ethers";
import hre from "hardhat";

export async function deployedContract<T extends Contract>(contractName: string, address: string): Promise<T> {
  return (await hre.ethers.getContractAt(contractName, address)) as T;
}

export function ETH(val: string | number): BigNumber {
  return utils.parseEther(val.toString());
}

export function DOLA(val: string | number): BigNumber {
  return utils.parseEther(val.toString());
}
