import { Accounts, Signers } from "./";

declare module "mocha" {
  export interface Context {
    accounts: Accounts;
    signers: Signers;
  }
}
