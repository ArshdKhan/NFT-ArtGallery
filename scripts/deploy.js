const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy NFTArtGallery
  const NFTArtGallery = await ethers.getContractFactory("NFTArtGallery");
  const nftArtGallery = await NFTArtGallery.deploy();

  await nftArtGallery.waitForDeployment();
  const nftArtGalleryAddress = await nftArtGallery.getAddress();

  console.log("NFTArtGallery deployed to:", nftArtGalleryAddress);

  // For easier frontend integration, save the contract address
  saveFrontendFiles(nftArtGalleryAddress);
}

function saveFrontendFiles(nftArtGalleryAddress) {
  const fs = require("fs");
  const path = require("path");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const contractAddressFile = path.join(contractsDir, "contract-address.json");
  fs.writeFileSync(contractAddressFile, JSON.stringify({ NFTArtGallery: nftArtGalleryAddress }, undefined, 2));

  // Copy ABI from artifacts
  const NFTArtGalleryArtifact = artifacts.readArtifactSync("NFTArtGallery");
  
  const nftArtGalleryFile = path.join(contractsDir, "NFTArtGallery.json");
  fs.writeFileSync(nftArtGalleryFile, JSON.stringify({
    abi: NFTArtGalleryArtifact.abi,
    networks: {
      "1337": {
        address: nftArtGalleryAddress
      }
    }
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
