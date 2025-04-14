// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTArtGallery is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;    // Mapping from token ID to price
    mapping(uint256 => uint256) private _tokenPrices;
    
    // Token ID => Creator address
    mapping(uint256 => address) public creators;
    
    // Token ID => For Sale status
    mapping(uint256 => bool) private _tokenForSale;

    // Events
    event ArtworkCreated(uint256 indexed tokenId, address creator, string tokenURI, uint256 price);
    event ArtworkSold(uint256 indexed tokenId, address seller, address buyer, uint256 price);    
    event ArtworkPriceChanged(uint256 indexed tokenId, uint256 newPrice);
    event ArtworkListedForSale(uint256 indexed tokenId, address seller, uint256 price);
    event ArtworkRemovedFromSale(uint256 indexed tokenId, address owner);

    constructor() ERC721("NFT Art Gallery", "NFTART") {}    // Create a new NFT artwork
    function createArtwork(string memory tokenURI, uint256 price) public returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        _tokenPrices[newItemId] = price;
        creators[newItemId] = msg.sender;
        _tokenForSale[newItemId] = true; // New artwork is for sale by default

        emit ArtworkCreated(newItemId, msg.sender, tokenURI, price);

        return newItemId;
    }    // Buy an NFT artwork
    function buyArtwork(uint256 tokenId) public payable {
        address owner = ownerOf(tokenId);
        require(owner != msg.sender, "You already own this NFT");
        require(_tokenForSale[tokenId], "This NFT is not for sale");
        require(msg.value >= _tokenPrices[tokenId], "Insufficient payment");

        address payable seller = payable(owner);
        seller.transfer(msg.value);
        _transfer(owner, msg.sender, tokenId);
        
        // After purchase, NFT is no longer for sale
        _tokenForSale[tokenId] = false;

        emit ArtworkSold(tokenId, owner, msg.sender, msg.value);
    }

    // Update the price of an NFT artwork
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can update the price");
        _tokenPrices[tokenId] = newPrice;
        
        emit ArtworkPriceChanged(tokenId, newPrice);
    }

    // Get price of an NFT artwork
    function getPrice(uint256 tokenId) public view returns (uint256) {
        return _tokenPrices[tokenId];
    }

    // Get total number of artworks
    function getTotalArtworks() public view returns (uint256) {
        return _tokenIds.current();
    }

    // Check if a token exists
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }    // Get the creator of an artwork
    function getCreator(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return creators[tokenId];
    }
    
    // List an NFT for sale (after purchase or if unlisted)
    function listForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can list for sale");
        _tokenPrices[tokenId] = price;
        _tokenForSale[tokenId] = true;
        
        emit ArtworkListedForSale(tokenId, msg.sender, price);
    }
    
    // Remove an NFT from sale
    function removeFromSale(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can remove from sale");
        require(_tokenForSale[tokenId], "This NFT is not for sale");
        
        _tokenForSale[tokenId] = false;
        
        emit ArtworkRemovedFromSale(tokenId, msg.sender);
    }
    
    // Check if an NFT is for sale
    function isForSale(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenForSale[tokenId];
    }
}
