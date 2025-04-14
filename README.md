# NFT Art Gallery Project

A full-stack NFT Art Gallery application that allows users to mint, view, and trade NFT artworks. The project uses Solidity smart contracts for the backend and React for the frontend, with Hardhat for contract development and Ganache for local blockchain testing.

## Features

- Mint new NFT artworks with images and metadata
- Browse all NFTs in the gallery
- View detailed information about each NFT
- Buy NFTs from other users
- Built on ERC721 token standard

## Tech Stack

- **Frontend**: React.js, Bootstrap, ethers.js
- **Backend**: Solidity smart contracts
- **Blockchain**: Ethereum (Ganache for local development)
- **Development Tools**: Hardhat
- **File Storage**: Helia (modern IPFS implementation)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer, LTS v20 recommended)
- [Ganache](https://www.trufflesuite.com/ganache) - Local Ethereum blockchain
- [MetaMask](https://metamask.io/) browser extension

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd NFTArtGallery
```

2. Install dependencies:
```
npm install
cd frontend
npm install
cd ..
```

3. Start Ganache:
   - Open Ganache application
   - Create a new workspace (QuickStart is fine for testing)
   - Make sure it's running on port 7545 (default setting)

4. Compile and deploy smart contracts using Hardhat:
```
npx hardhat compile
npx hardhat run scripts/deploy.js --network ganache
```

5. Start the frontend application:
```
cd frontend
npm start
```

6. Connect MetaMask to Ganache:
   - Add network to MetaMask (localhost:7545)
   - Import a Ganache account using the private key
   - Network settings:
     - Network Name: Ganache
     - RPC URL: http://127.0.0.1:7545
     - Chain ID: 1337
     - Currency Symbol: ETH

7. Visit `http://localhost:3000` in your browser

## How to Use

### Creating an NFT
1. Connect your MetaMask wallet
2. Click "Create Artwork" in the navigation bar
3. Fill in the artwork details (name, description, price)
4. Upload an image file
5. Click "Create NFT"
6. Confirm the transaction in MetaMask

### Viewing NFTs
1. Browse the gallery to see all minted NFTs
2. Click on an NFT card to view its details

### Buying NFTs
1. Connect your MetaMask wallet
2. Click on an NFT you don't own
3. Click "Buy" button
4. Confirm the transaction in MetaMask

## Project Structure

```
NFTArtGallery/
├── contracts/             # Solidity smart contracts
│   └── NFTArtGallery.sol  # Main NFT contract
├── scripts/               # Hardhat scripts
│   └── deploy.js          # Deployment script
├── test/                  # Contract tests
├── hardhat.config.js      # Hardhat configuration
└── frontend/              # React frontend
    ├── public/            # Static files
    └── src/               # Source files
        ├── components/    # React components
        ├── contracts/     # Contract ABIs
        └── utils/         # Utility functions
```

## Development Notes

- The project uses OpenZeppelin's ERC721 implementation
- Helia is used for storing NFT images and metadata
- ethers.js is used for interacting with the blockchain, as it's more modern and maintained than Web3.js
- Hardhat is used for smart contract development, providing better compatibility with Node.js 20

## Troubleshooting

- If you encounter issues with contract deployment, make sure Ganache is running and the network settings in hardhat.config.js match your Ganache configuration
- If the frontend can't connect to the blockchain, verify your MetaMask is connected to the correct network (Ganache)
- If NFT images don't load, it may be due to IPFS gateway issues - try a different gateway or run a local IPFS node

## License

This project is licensed under the MIT License.
