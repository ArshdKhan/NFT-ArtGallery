import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import NFTArtGalleryContract from '../contracts/NFTArtGallery.json';

// Initialize ethers with MetaMask
export const initWeb3 = async () => {
  const provider = await detectEthereumProvider();
  
  if (!provider) {
    throw new Error('Please install MetaMask!');
  }
  
  // Request account access
  await provider.request({ method: 'eth_requestAccounts' });
  
  // Create ethers provider
  const ethersProvider = new ethers.BrowserProvider(window.ethereum);
  return ethersProvider;
};

// Get network ID
export const getNetworkId = async (provider) => {
  const network = await provider.getNetwork();
  return network.chainId;
};

// Get user accounts
export const getAccounts = async (provider) => {
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return [address];
};

// Initialize contract
export const initContract = async (provider, networkId) => {
  try {
    // Try to load the contract address from the saved file
    let contractAddress;
    
    try {
      // Import the contract address dynamically
      const contractAddresses = await import('../contracts/contract-address.json');
      contractAddress = contractAddresses.NFTArtGallery;
    } catch (error) {
      // Fallback to using the networks object if contract-address.json doesn't exist
      contractAddress = NFTArtGalleryContract.networks?.[networkId.toString()]?.address;
    }
    
    if (!contractAddress) {
      throw new Error('Contract not deployed to detected network');
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      contractAddress,
      NFTArtGalleryContract.abi,
      signer
    );
    
    return contract;
  } catch (error) {
    console.error('Error initializing contract:', error);
    throw error;
  }
};

// Convert wei to ether
export const weiToEther = (wei) => {
  return ethers.formatEther(wei.toString());
};

// Convert ether to wei
export const etherToWei = (ether) => {
  return ethers.parseEther(ether.toString());
};
