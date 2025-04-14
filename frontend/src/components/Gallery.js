import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { weiToEther } from '../utils/ethersUtils';

const Gallery = ({ web3, contract, account }) => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        if (!contract) return;
        
        setLoading(true);
        
        // Get total number of NFTs
        const totalSupply = await contract.getTotalArtworks();
        
        // Fetch all NFTs
        const nftItems = [];
        for (let i = 1; i <= totalSupply; i++) {
          try {
            // Check if the token exists
            const exists = await contract.exists(i);
            if (!exists) continue;
            
            // Get NFT details
            const tokenURI = await contract.tokenURI(i);
            const owner = await contract.ownerOf(i);
            const creator = await contract.getCreator(i);
            const priceWei = await contract.getPrice(i);
              // Fetch metadata from tokenURI
            let metadata = null;
            try {
              const { fetchIPFSContent } = await import('../utils/ipfsService');
              metadata = await fetchIPFSContent(tokenURI);
            } catch (metadataError) {
              console.error(`Error fetching metadata for token #${i}:`, metadataError);
              metadata = { name: `NFT #${i}`, description: 'No description available', image: '' };
            }            // Convert IPFS image URL to a data URL using Helia when possible
            let imageUrl = metadata.image || '';
            try {
              const { ipfsToHTTPURL } = await import('../utils/ipfsService');
              // Use the enhanced async version that tries Helia first
              imageUrl = await ipfsToHTTPURL(imageUrl);
              console.log(`Successfully loaded image for NFT #${i}`);
            } catch (imageUrlError) {
              console.warn(`Failed to convert image URL for token #${i}:`, imageUrlError);
              imageUrl = 'https://dummyimage.com/400x400/fff/000&text=Image+Not+Available';
            }            // Only add NFTs that are currently for sale (not already owned privately)
            const isForSale = await contract.isForSale(i);
            
            // Skip this NFT if it's not for sale (already purchased and not listed for resale)
            if (!isForSale) continue;
            
            nftItems.push({
              id: i,
              owner,
              creator,
              price: weiToEther(priceWei),
              name: metadata.name,
              description: metadata.description,
              image: imageUrl,
              isOwnedByUser: owner.toLowerCase() === account?.toLowerCase()
            });
          } catch (tokenError) {
            console.error(`Error fetching token #${i}:`, tokenError);
          }
        }
        
        setNfts(nftItems);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError('Failed to load NFTs. Please try again.');
        setLoading(false);
      }
    };
    
    if (contract && web3) {
      fetchNFTs();
    }
  }, [contract, web3, account]);

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading NFT Gallery...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h2 className="mb-4">NFT Art Gallery</h2>
      
      {nfts.length === 0 ? (
        <Alert variant="info">
          No NFTs have been created yet. Be the first to <Link to="/create">create an NFT</Link>!
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {nfts.map((nft) => (
            <Col key={nft.id}>
              <Card as={Link} 
                to={`/nft/${nft.id}`} 
                className="h-100 text-decoration-none" 
                style={{ color: 'inherit' }}
              >                <Card.Img 
                  variant="top" 
                  src={nft.image || 'https://dummyimage.com/400x400/fff/000&text=Image+Not+Available'} 
                  alt={nft.name}
                  style={{ height: '200px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://dummyimage.com/400x400/fff/000&text=Image+Not+Available';
                  }}
                />
                <Card.Body>
                  <Card.Title>{nft.name}</Card.Title>
                  <Card.Text className="text-truncate">{nft.description}</Card.Text>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between">
                  <span>Price: {nft.price} ETH</span>
                  {nft.isOwnedByUser && <span className="text-success">You own this</span>}
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Gallery;
