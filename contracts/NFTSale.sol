// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTBase.sol";

abstract contract NFTSale is NFTBase {
    event ArtworkSold(uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ArtworkPriceChanged(uint256 indexed tokenId, uint256 newPrice);
    event ArtworkListedForSale(uint256 indexed tokenId, address seller, uint256 price);
    event ArtworkRemovedFromSale(uint256 indexed tokenId, address owner);

    function buyArtwork(uint256 tokenId) public payable {
        address owner = ownerOf(tokenId);
        require(owner != msg.sender, "You already own this NFT");
        require(_tokenForSale[tokenId], "This NFT is not for sale");
        require(msg.value >= _tokenPrices[tokenId], "Insufficient payment");

        address payable seller = payable(owner);
        seller.transfer(msg.value);
        _transfer(owner, msg.sender, tokenId);
        _tokenForSale[tokenId] = false;

        emit ArtworkSold(tokenId, owner, msg.sender, msg.value);
    }

    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can update the price");
        _tokenPrices[tokenId] = newPrice;
        emit ArtworkPriceChanged(tokenId, newPrice);
    }

    function listForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can list for sale");
        _tokenPrices[tokenId] = price;
        _tokenForSale[tokenId] = true;
        emit ArtworkListedForSale(tokenId, msg.sender, price);
    }

    function removeFromSale(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can remove from sale");
        require(_tokenForSale[tokenId], "This NFT is not for sale");
        _tokenForSale[tokenId] = false;
        emit ArtworkRemovedFromSale(tokenId, msg.sender);
    }
}