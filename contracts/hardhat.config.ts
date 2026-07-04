import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;