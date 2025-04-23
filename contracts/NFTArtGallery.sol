// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTBase.sol";
import "./NFTSale.sol";
import "./NFTMetadata.sol";
import "./NFTCreator.sol";

contract NFTArtGallery is NFTBase, NFTSale, NFTMetadata, NFTCreator {
    constructor() ERC721("NFT Art Gallery", "NFTART") {}
}
