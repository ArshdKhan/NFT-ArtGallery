const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTArtGallery", function () {
  let NFTArtGallery;
  let nftArtGallery;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here
    NFTArtGallery = await ethers.getContractFactory("NFTArtGallery");
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a new NFTArtGallery contract before each test
    nftArtGallery = await NFTArtGallery.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nftArtGallery.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await nftArtGallery.name()).to.equal("NFT Art Gallery");
      expect(await nftArtGallery.symbol()).to.equal("NFTART");
    });
  });

  describe("Minting NFTs", function () {
    it("Should create a new token with correct owner and tokenURI", async function () {
      const tokenURI = "ipfs://QmTest";
      const price = ethers.parseEther("1.0");
      
      await nftArtGallery.createArtwork(tokenURI, price);
      
      expect(await nftArtGallery.ownerOf(1)).to.equal(owner.address);
      expect(await nftArtGallery.tokenURI(1)).to.equal(tokenURI);
      expect(await nftArtGallery.getPrice(1)).to.equal(price);
    });
  });

  describe("Trading NFTs", function () {
    it("Should allow buying an NFT", async function () {
      const tokenURI = "ipfs://QmTest";
      const price = ethers.parseEther("1.0");
      
      // Owner creates the NFT
      await nftArtGallery.createArtwork(tokenURI, price);
      
      // Get initial balance of owner
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      // addr1 buys the NFT
      await nftArtGallery.connect(addr1).buyArtwork(1, {value: price});
      
      // Check new ownership
      expect(await nftArtGallery.ownerOf(1)).to.equal(addr1.address);
      
      // Check that owner received payment
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(price);
    });

    it("Should not allow buying an NFT for less than its price", async function () {
      const tokenURI = "ipfs://QmTest";
      const price = ethers.parseEther("1.0");
      
      // Owner creates the NFT
      await nftArtGallery.createArtwork(tokenURI, price);
      
      // Try to buy with less than the price
      const lowPrice = ethers.parseEther("0.5");
      
      await expect(
        nftArtGallery.connect(addr1).buyArtwork(1, {value: lowPrice})
      ).to.be.revertedWith("Insufficient payment");
    });
  });
});
