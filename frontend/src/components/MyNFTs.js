import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { weiToEther } from '../utils/ethersUtils';

const MyNFTs = ({ web3, contract, account }) => {
  const [myNfts, setMyNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {    const fetchMyNFTs = async () => {
      if (!contract || !account) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get total number of NFTs
        const totalSupply = await contract.getTotalArtworks();
        
        // Fetch all NFTs owned by the user
        const nftItems = [];
        for (let i = 1; i <= totalSupply; i++) {
          try {
            // Check if the token exists
            const exists = await contract.exists(i);
            if (!exists) continue;
            
            // Check if the user owns this NFT
            const owner = await contract.ownerOf(i);
            if (owner.toLowerCase() !== account.toLowerCase()) continue;
            
            // Get NFT details
            const tokenURI = await contract.tokenURI(i);
            const creator = await contract.getCreator(i);            
            const priceWei = await contract.getPrice(i);
            
            // Fetch metadata from tokenURI
            let metadata;
            try {
              const { fetchIPFSContent } = await import('../utils/ipfsService');
              metadata = await fetchIPFSContent(tokenURI);
            } catch (metadataError) {
              console.error(`Error fetching metadata for token #${i}:`, metadataError);
              metadata = { 
                name: `NFT #${i}`, 
                description: 'No description available', 
                image: '' 
              };
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
            }
              // Check if the NFT is currently for sale
            const isForSale = await contract.isForSale(i);
            
            nftItems.push({
              id: i,
              owner,
              creator,
              price: weiToEther(priceWei),
              name: metadata.name,
              description: metadata.description,
              image: imageUrl,
              isCreator: creator.toLowerCase() === account.toLowerCase(),
              isForSale: isForSale
            });
          } catch (tokenError) {
            console.error(`Error fetching token #${i}:`, tokenError);
          }
        }
        
        setMyNfts(nftItems);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError('Failed to load your NFTs. Please try again.');
        setLoading(false);
      }
    };
    
    if (contract && web3 && account) {
      fetchMyNFTs();
    }
  }, [contract, web3, account]);

  if (!account) {
    return (
      <Container className="my-5">
        <Alert variant="warning">
          Please connect your wallet to view your NFTs.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading your NFTs...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h2 className="mb-4">My NFTs</h2>
      
      {myNfts.length === 0 ? (
        <Alert variant="info">
          You don't own any NFTs yet. <Link to="/gallery">Browse the gallery</Link> to purchase NFTs or <Link to="/create">create your own</Link>!
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {myNfts.map((nft) => (
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
                </Card.Body>                <Card.Footer>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Price: {nft.price} ETH</span>
                    {nft.isCreator && <span className="text-info">You created this</span>}
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className={nft.isForSale ? "text-success" : "text-warning"}>
                      {nft.isForSale ? "Listed for sale" : "Not for sale"}
                    </span>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MyNFTs;
