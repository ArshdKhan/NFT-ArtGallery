import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { MemoryBlockstore } from 'blockstore-core/memory';

// Available CORS proxies that can help bypass CORS restrictions
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/', // Requires temporary access at https://cors-anywhere.herokuapp.com/corsdemo
  'https://api.allorigins.win/raw?url='
];

// List of CORS-friendly IPFS gateways sorted by reliability
const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://w3s.link/ipfs/', 
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/'
];

// Create a Helia node in memory for storing NFT data
// For production, consider using a persistent blockstore instead of memory
let heliaNode;
let fs;

// Enhanced Helia initialization to handle reinitialization after reload
const initHelia = async () => {
  if (!heliaNode) {
    try {
      console.log("Initializing Helia node...");

      // Import required modules for libp2p configuration
      const { createLibp2p } = await import('libp2p');
      const { webSockets } = await import('@libp2p/websockets');
      const { noise } = await import('@chainsafe/libp2p-noise');
      const { yamux } = await import('@chainsafe/libp2p-yamux');

      // Create a custom libp2p instance optimized for browser environments
      const libp2p = await createLibp2p({
        transports: [webSockets()],
        connectionEncryption: [noise()],
        streamMuxers: [yamux()],
        connectionManager: {
          minConnections: 1,
          maxConnections: 5,
        },
      });

      // Create a Helia node with custom libp2p configuration
      heliaNode = await createHelia({
        libp2p,
        blockstore: new MemoryBlockstore(),
        start: true,
      });

      // Create the UnixFS API for adding and retrieving files
      fs = unixfs(heliaNode);

      console.log("Helia node initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Helia node:", error);
      heliaNode = null;
      fs = null;
    }
  }

  return { heliaNode, fs };
};

// Helper function to convert a File object to an ArrayBuffer
const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Helper function that prioritizes direct Helia IPFS node fetch for content
export const fetchIPFSContent = async (hash) => {
  // Extract just the CID from the hash, removing any gateway URLs or ipfs:// prefix
  let cid = hash;
  
  // Remove ipfs:// prefix if present
  if (cid.startsWith('ipfs://')) {
    cid = cid.replace('ipfs://', '');
  }
    // If the hash contains an existing gateway URL, extract just the CID part
  // eslint-disable-next-line no-useless-escape
  const gatewayPattern = /(https?:\/\/[^/]+\/ipfs\/)/;
  const match = cid.match(gatewayPattern);
  if (match) {
    cid = cid.substring(match[0].length);
  }
  
  // Handle nested gateway URLs (the problem we're seeing in logs)
  if (cid.includes('ipfs.io/ipfs/') || cid.includes('/ipfs/')) {
    // Fixed regex to avoid unnecessary escape character warning
    const nestedCidMatch = cid.match(/(?:ipfs\/|ipfs\/)([a-zA-Z0-9]+)/);
    if (nestedCidMatch && nestedCidMatch[1]) {
      cid = nestedCidMatch[1];
    }
  }
  
  // Trim any trailing slashes or whitespace
  cid = cid.trim().replace(/\/+$/, '');
  
  console.log(`Attempting to fetch IPFS content for cleaned CID: ${cid}`);
  
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
      // Continue if cache parsing fails
    }
  }
    // First try - direct IPFS node fetch with Helia (our preferred method)
  // This is now the ONLY initial method - we'll wait a full 10 seconds before trying HTTP methods
  let directFetchAttempted = false;
  
  try {
    console.log("Initializing Helia for direct fetch...");
    const { heliaNode, fs } = await initHelia();
    
    if (heliaNode && fs) {
      directFetchAttempted = true;
      console.log("Helia node ready, attempting direct IPFS fetch for CID:", cid);
      console.log("Giving Helia 10 seconds to fetch content directly from IPFS network...");
      
      try {
        // Convert string CID to CID object
        const { CID } = await import('multiformats/cid');
        const cidObj = CID.parse(cid);
        
        // Create an abort controller with a longer timeout (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Try to retrieve from IPFS directly with the extended timeout
        const chunks = [];
        const catPromise = (async () => {
          try {
            for await (const chunk of fs.cat(cidObj, { signal: controller.signal })) {
              chunks.push(chunk);
            }
            return true;
          } catch (e) {
            if (e.name === 'AbortError') {
              console.warn("IPFS fetch timed out after 10 seconds");
            }
            throw e;
          }
        })();
        
        await catPromise;
        clearTimeout(timeoutId);
        
        // Concatenate chunks and convert to JSON
        const decoder = new TextDecoder();
        const content = decoder.decode(new Uint8Array(chunks.flatMap(chunk => Array.from(chunk))));
        console.log("Successfully retrieved content via Helia");
        
        // Parse the JSON content
        const jsonContent = JSON.parse(content);
        
        // Cache the successful result
        sessionStorage.setItem(cacheKey, content);
        
        return jsonContent;
      } catch (heliaInnerError) {
        console.warn("Error fetching/processing data with Helia after 10 seconds:", heliaInnerError.message);
      }
    } else {
      console.warn("Helia node or fs not properly initialized");
    }
  } catch (heliaError) {
    console.warn("Helia direct fetch initialization failed:", heliaError.message);
  }// Log whether we tried direct fetch or not
  if (!directFetchAttempted) {
    console.log("Direct Helia fetch was skipped - this may indicate initialization problems");
  } else {
    console.log("Direct Helia fetch was attempted but failed, falling back to gateway methods");
  }
  
  // Based on current reliability analysis, prioritize these gateways
  const gatewaysTry = [
    'https://nftstorage.link/ipfs/',
    'https://w3s.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/'
  ];
  
  // Track gateway response times for future optimization
  const gatewayStats = {};
    // Function to create CORS-proxied URLs
  const createProxiedUrl = (url) => {
    // Try to use the first CORS proxy in our list
    return `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
  };
  
  // Try multiple gateways in parallel for faster responses
  try {
    console.log("Attempting parallel gateway fetches with CORS proxy support");
    
    // Create fetch promises for all gateways with timeouts
    const fetchPromises = gatewaysTry.map(gateway => {
      const directUrl = `${gateway}${cid}`;
      // Use a CORS proxy to avoid CORS issues
      const fetchUrl = createProxiedUrl(directUrl);
      const startTime = performance.now();
      
      console.log(`Trying proxied gateway: ${fetchUrl}`);
      
      return fetch(fetchUrl, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
        mode: 'cors'
      })
      .then(async response => {
        const endTime = performance.now();
        gatewayStats[gateway] = {
          time: endTime - startTime,
          status: response.status
        };
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return {
          gateway,
          data: await response.json()
        };
      })
      .catch(err => {
        console.log(`Gateway ${gateway} error: ${err.message}`);
        return null; // Return null for failed attempts
      });
    });
    
    // Use Promise.any to get the first successful response
    const responses = await Promise.allSettled(fetchPromises);
    const successfulResponse = responses
      .filter(res => res.status === 'fulfilled' && res.value !== null)
      .sort((a, b) => {
        // Sort by gateway stats if available
        const timeA = gatewayStats[a.value.gateway]?.time || Infinity;
        const timeB = gatewayStats[b.value.gateway]?.time || Infinity;
        return timeA - timeB;
      })[0];
    
    if (successfulResponse) {
      const { gateway, data } = successfulResponse.value;
      console.log(`Successfully fetched from gateway: ${gateway} in ${gatewayStats[gateway].time.toFixed(0)}ms`);
      
      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      
      return data;
    }
  } catch (parallelError) {
    console.warn("Parallel gateway fetches failed:", parallelError);
  }
    // If parallel fetches failed, try sequential with remaining gateways
  console.log("Parallel gateway fetches failed, trying sequential approach with CORS proxies");
  
  // Try each gateway+proxy combination in sequence until one works
  for (const gateway of gatewaysTry) {
    // For each gateway, try multiple CORS proxies
    for (const proxy of CORS_PROXIES) {
      try {
        const directUrl = `${gateway}${cid}`;
        const fetchUrl = `${proxy}${encodeURIComponent(directUrl)}`;
        
        console.log(`Trying sequentially: ${fetchUrl}`);
        
        const response = await fetch(fetchUrl, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000),
          mode: 'cors'
        });
        
        if (response.ok) {
          console.log(`Success with gateway: ${gateway} via proxy: ${proxy}`);
          
          try {
            const data = await response.json();
            // Cache the successful gateway+proxy combination
            sessionStorage.setItem(`best-cors-proxy-${gateway}`, proxy);
            // Cache the result
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
            return data;
          } catch (jsonError) {
            console.warn(`JSON parsing error from ${gateway} via ${proxy}:`, jsonError);
          }
        }
      } catch (error) {
        console.warn(`Gateway ${gateway} with proxy failed:`, error.message);
      }
    }
  }
  
  // Try subdomain-style gateway as a last resort with CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const subdomainGateway = `https://${cid}.ipfs.nftstorage.link/`;
      const fetchUrl = `${proxy}${encodeURIComponent(subdomainGateway)}`;
      
      console.log(`Trying subdomain gateway with CORS proxy: ${fetchUrl}`);
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        console.log(`Success with subdomain gateway via proxy: ${proxy}`);
        const data = await response.json();
        // Cache the successful proxy for subdomain gateways
        sessionStorage.setItem('best-cors-proxy-subdomain', proxy);
        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn(`Subdomain gateway with proxy ${proxy} failed:`, error.message);
    }
  }
  
  // As an absolute fallback, return minimal metadata
  console.error("All IPFS fetch attempts failed for CID:", cid);
  return {
    name: "Unavailable NFT",
    description: "Metadata could not be loaded",
    image: ""
  };
};

// Function to convert IPFS hash to a data URL by directly using Helia when possible
// Only falls back to gateway URLs when necessary
export const ipfsToHTTPURL = async (ipfsHash) => {
  if (!ipfsHash) return '';
  
  // Extract clean CID from any IPFS URL format
  let cid = ipfsHash;
  
  // Remove ipfs:// prefix if present
  if (cid.startsWith('ipfs://')) {
    cid = cid.replace('ipfs://', '');
  }
  
  // If the hash contains an existing gateway URL, extract just the CID part
  // eslint-disable-next-line 
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
  
  console.log(`Attempting to fetch image for CID: ${cid}`);

  try {
    // Try to fetch directly from Helia node - this is our preferred method
    const { heliaNode, fs } = await initHelia();
    if (heliaNode && fs) {
      console.log("Trying to fetch image directly from Helia IPFS node");
      
      // Convert string CID to CID object
      const { CID } = await import('multiformats/cid');
      try {
        const cidObj = CID.parse(cid);
        
        // Create a data URL from the content for direct display
        try {
          const chunks = [];
          for await (const chunk of fs.cat(cidObj)) {
            chunks.push(chunk);
          }
          
          // Combine all chunks
          const allBytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of chunks) {
            allBytes.set(chunk, offset);
            offset += chunk.length;
          }
          
          // Detect content type from first few bytes
          const contentType = detectMimeType(allBytes);
          
          // Create data URL for image display
          const base64 = bytesToBase64(allBytes);
          console.log("Successfully retrieved image via Helia");
          return `data:${contentType};base64,${base64}`;
        } catch (error) {
          console.warn("Error reading data from Helia:", error);
        }
      } catch (cidError) {
        console.warn("Invalid CID format:", cidError);
      }
    }
  } catch (error) {
    console.warn("Could not initialize Helia:", error);
  }
  
  console.log("Helia fetch failed for image, falling back to gateway method");
  // Fallback to gateway method if Helia didn't work
  return `https://nftstorage.link/ipfs/${cid}`;
};

// Helper function to convert bytes to base64
function bytesToBase64(bytes) {
  const binString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binString);
}

// Helper function to detect mime type from bytes
function detectMimeType(bytes) {
  // Simple mime type detection based on magic numbers
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'image/webp';
  } else {
    // Default to octet-stream if unknown
    return 'application/octet-stream';
  }
}

// Upload file to IPFS using Helia
export const uploadToIPFS = async (file) => {
  try {
    // Initialize Helia if not already done
    const { fs } = await initHelia();
    
    // Convert file to ArrayBuffer
    const content = await fileToArrayBuffer(file);
    
    // Add the file to IPFS
    const cid = await fs.addBytes(new Uint8Array(content));
    
    // Return the IPFS URL using the most reliable gateway
    return `${IPFS_GATEWAYS[0]}${cid.toString()}`;
  } catch (error) {
    console.error('Error uploading file to IPFS: ', error);
    throw error;
  }
};

// Upload metadata to IPFS using Helia
export const uploadMetadataToIPFS = async (metadata) => {
  try {
    // Initialize Helia if not already done
    const { fs } = await initHelia();
    
    // Convert metadata to bytes
    const metadataString = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(metadataString);
    
    // Add the metadata to IPFS
    const cid = await fs.addBytes(bytes);
    
    // Return the IPFS URL using the most reliable gateway
    return `${IPFS_GATEWAYS[0]}${cid.toString()}`;
  } catch (error) {
    console.error('Error uploading metadata to IPFS: ', error);
    throw error;
  }
};

// Export a function to get the current Helia instance
export const getHeliaInstance = () => {
  return { heliaNode, fs };
};
