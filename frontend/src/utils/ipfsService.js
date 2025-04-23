import axios from 'axios';

// Pinata API configuration - reading from environment variables
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY; 
const PINATA_SECRET_API_KEY = process.env.REACT_APP_PINATA_SECRET_API_KEY;
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// Function to upload a file to IPFS via Pinata
export const uploadToIPFS = async (file) => {
  try {
    console.log("Uploading file to Pinata IPFS...");
    const formData = new FormData();
    formData.append('file', file);
    
    // Add options for Pinata pinning
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: file.type,
        size: file.size,
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Configure options for the file being uploaded
    const options = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', options);

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
      }
    );

    console.log("File uploaded successfully to Pinata:", response.data);
    
    // Return the IPFS hash/CID
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading file to Pinata IPFS: ', error);
    throw error;
  }
};

// Function to upload JSON metadata to IPFS via Pinata
export const uploadMetadataToIPFS = async (metadata) => {
  try {
    console.log("Uploading metadata to Pinata IPFS...");
    
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
      }
    );

    console.log("Metadata uploaded successfully to Pinata:", response.data);
    
    // Return the IPFS hash/CID
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading metadata to Pinata IPFS: ', error);
    throw error;
  }
};

// Function to convert IPFS hash to HTTP URL using Pinata gateway
export const ipfsToHTTPURL = (ipfsHash) => {
  if (!ipfsHash) return '';
  
  // Extract clean CID from any IPFS URL format
  let cid = ipfsHash;
  
  // Remove ipfs:// prefix if present
  if (cid.startsWith('ipfs://')) {
    cid = cid.replace('ipfs://', '');
  }
  
  // If the hash contains an existing gateway URL, extract just the CID part
  const gatewayPattern = /(https?:\/\/[^\/]+\/ipfs\/)/;
  const match = cid.match(gatewayPattern);
  if (match) {
    cid = cid.substring(match[0].length);
  }
  
  // Handle nested gateway URLs
  if (cid.includes('ipfs.io/ipfs/') || cid.includes('/ipfs/')) {
    const nestedCidMatch = cid.match(/(?:ipfs\/|ipfs\/)([a-zA-Z0-9]+)/);
    if (nestedCidMatch && nestedCidMatch[1]) {
      cid = nestedCidMatch[1];
    }
  }
  
  // Return the Pinata gateway URL
  return `${PINATA_GATEWAY}${cid}`;
};

// Function to fetch IPFS content via Pinata gateway
export const fetchIPFSContent = async (hash) => {
  // Extract just the CID from the hash
  let cid = hash;
  
  // Remove ipfs:// prefix if present
  if (cid.startsWith('ipfs://')) {
    cid = cid.replace('ipfs://', '');
  }
  
  // If the hash contains an existing gateway URL, extract just the CID part
  const gatewayPattern = /(https?:\/\/[^\/]+\/ipfs\/)/;
  const match = cid.match(gatewayPattern);
  if (match) {
    cid = cid.substring(match[0].length);
  }
  
  // Trim any trailing slashes or whitespace
  cid = cid.trim().replace(/\/+$/, '');
  
  console.log(`Attempting to fetch IPFS content for CID: ${cid}`);
  
  try {
    // Create a cache key for this CID
    const cacheKey = `ipfs-content-${cid}`;
    
    // Check if we have a cached response for this CID
    const cachedContent = sessionStorage.getItem(cacheKey);
    if (cachedContent) {
      try {
        console.log("Found cached content for CID:", cid);
        return JSON.parse(cachedContent);
      } catch (e) {
        console.warn("Error parsing cached content:", e);
      }
    }
    
    // Fetch from Pinata gateway
    const response = await fetch(`${PINATA_GATEWAY}${cid}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the successful result
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error(`Error fetching from Pinata gateway: ${error.message}`);
    
    // As a fallback, return minimal metadata
    return {
      name: "Unavailable NFT",
      description: "Metadata could not be loaded",
      image: ""
    };
  }
};

// Function to check if Pinata API keys are configured
export const isPinataConfigured = () => {
  return PINATA_API_KEY && PINATA_API_KEY !== "YOUR_PINATA_API_KEY" && 
         PINATA_SECRET_API_KEY && PINATA_SECRET_API_KEY !== "YOUR_PINATA_SECRET_API_KEY";
};
