// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTBase.sol";

abstract contract NFTMetadata is NFTBase {
    function getPrice(uint256 tokenId) public view returns (uint256) {
        return _tokenPrices[tokenId];
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function isForSale(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenForSale[tokenId];
    }
}