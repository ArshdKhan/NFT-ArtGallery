// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract NFTBase is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter internal _tokenIds;

    mapping(uint256 => uint256) internal _tokenPrices;
    mapping(uint256 => bool) internal _tokenForSale;
    mapping(uint256 => address) public creators;

    event ArtworkCreated(uint256 indexed tokenId, address creator, string tokenURI, uint256 price);

    function createArtwork(string memory tokenURI, uint256 price) public returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        _tokenPrices[newItemId] = price;
        creators[newItemId] = msg.sender;
        _tokenForSale[newItemId] = true;

        emit ArtworkCreated(newItemId, msg.sender, tokenURI, price);

        return newItemId;
    }

    function getTotalArtworks() public view returns (uint256) {
        return _tokenIds.current();
    }
}