/* global BigInt */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { weiToEther, etherToWei } from '../utils/ethersUtils';

const NFTDetails = ({ web3, contract, account }) => {
  const { id } = useParams();
  const navigate = useNavigate();  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(null);
  const [resalePrice, setResalePrice] = useState('');
  const [listingNft, setListingNft] = useState(false);
  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!contract) return;
      
      try {
        setLoading(true);
        
        // Check if token exists
        const exists = await contract.exists(id);
        if (!exists) {
          setError('This NFT does not exist.');
          setLoading(false);
          return;
        }
        
        // Get NFT details
        const tokenURI = await contract.tokenURI(id);        const owner = await contract.ownerOf(id);
        const creator = await contract.getCreator(id);
        const priceWei = await contract.getPrice(id);
        const isForSale = await contract.isForSale(id);
          // Fetch metadata from tokenURI
        let metadata;
        try {
          const { fetchIPFSContent } = await import('../utils/ipfsService');
          metadata = await fetchIPFSContent(tokenURI);
        } catch (metadataError) {
          console.error('Error fetching metadata:', metadataError);
          metadata = { 
            name: `NFT #${id}`, 
            description: 'No description available', 
            image: '' 
          };
        }        // Convert IPFS image URL to a data URL using Helia when possible
        let imageUrl = metadata.image || '';
        try {
          const { ipfsToHTTPURL } = await import('../utils/ipfsService');
          // Use the enhanced async version that tries Helia first
          imageUrl = await ipfsToHTTPURL(imageUrl);
          console.log(`Successfully loaded image for NFT #${id} detail view`);
        } catch (imageUrlError) {
          console.warn(`Failed to convert image URL for token #${id}:`, imageUrlError);
          imageUrl = 'https://dummyimage.com/400x400/fff/000&text=Image+Not+Available';
        }
          setNft({
          id,
          tokenURI,
          owner,
          creator,
          price: weiToEther(priceWei),
          priceWei,
          name: metadata.name,
          description: metadata.description,
          image: imageUrl,
          isOwnedByUser: owner.toLowerCase() === account?.toLowerCase(),
          isForSale: isForSale
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching NFT details:', err);
        setError('Failed to load NFT details. Please try again.');
        setLoading(false);
      }
    };
    
    if (contract && web3) {
      fetchNFTDetails();
    }
  }, [contract, web3, id, account]);  const handleBuy = async () => {
    if (!nft || !contract || !account) return;
    
    setBuying(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Double-check NFT details directly from contract before purchase
      try {
        const isForSale = await contract.isForSale(id);
        const priceWei = await contract.getPrice(id);
        const contractOwner = await contract.ownerOf(id);
        
        console.log("On-chain verification:");
        console.log("- Is for sale:", isForSale);
        console.log("- On-chain price (wei):", priceWei.toString());
        console.log("- On-chain owner:", contractOwner);
        
        // Ensure our UI state is synced with blockchain state
        if (!isForSale) {
          throw new Error("This NFT is not currently for sale according to the blockchain");
        }
        
        if (contractOwner.toLowerCase() === account.toLowerCase()) {
          throw new Error("You already own this NFT");
        }
          // Ensure we're sending the correct price
        if (priceWei.toString() !== nft.priceWei.toString()) {
          console.warn("Price mismatch between UI and blockchain. Using blockchain price...");
          nft.priceWei = priceWei;
        }
      } catch (verificationError) {
        console.error("Verification error:", verificationError);
        throw verificationError;
      }
      
      // Explicitly convert the ID to a number to ensure proper format
      const tokenId = Number(id);
        // Buy the NFT with explicit gas limit and value
      console.log(`Executing buyArtwork with tokenId: ${tokenId}, value: ${nft.priceWei.toString()}, nft.priceWei type: ${typeof nft.priceWei}`);
      
      // Convert price to BigInt if it's not already
      let valueToSend;
      if (typeof nft.priceWei === 'object' && nft.priceWei.toString) {
        // It's already an ethers BigNumber object
        valueToSend = nft.priceWei;
      } else if (typeof nft.priceWei === 'string') {
        // It's a string, parse it
        valueToSend = BigInt(nft.priceWei);
      } else {
        // Fallback
        valueToSend = nft.priceWei;
      }
      
      console.log("Final value being sent:", valueToSend.toString());
      
      const tx = await contract.buyArtwork(tokenId, {
        value: valueToSend,
        gasLimit: 600000 // Further increased gas limit
      });
      
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      setSuccess('NFT purchased successfully!');
      
      // Navigate to My NFTs page after a short delay
      setTimeout(() => {
        navigate('/my-nfts');
      }, 2000);
    } catch (err) {
      console.error('Error buying NFT:', err);
      
      // Extract a more user-friendly error message
      let errorMessage = 'Failed to buy NFT. Please try again.';
      
      if (err.message.includes("You already own this")) {
        errorMessage = "You already own this NFT.";
      } else if (err.message.includes("not for sale")) {
        errorMessage = "This NFT is not currently for sale.";
      } else if (err.message.includes("Insufficient payment")) {
        errorMessage = "Insufficient payment amount for this NFT.";
      } else if (err.message.includes("rejected")) {
        errorMessage = "Transaction was rejected. Please check your wallet.";
      } else if (err.message.includes("revert")) {
        errorMessage = "Transaction failed on the blockchain. The NFT may no longer be available or its status may have changed.";
      }
      
      setError(errorMessage);
    } finally {
      setBuying(false);
    }
  };
  // Handle listing NFT for sale
  const handleListForSale = async () => {
    if (!nft || !contract || !account || !resalePrice) return;
    
    setListingNft(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Convert price from ETH to Wei
      const priceInWei = etherToWei(resalePrice);
      
      console.log("Sending listForSale transaction...");
      // List the NFT for sale
      const tx = await contract.listForSale(id, priceInWei);
      
      console.log("Waiting for transaction confirmation...");
      // Wait for the transaction to be mined
      await tx.wait();
      
      console.log("Transaction confirmed, NFT listed for sale successfully");
      setSuccess('NFT listed for sale successfully!');
      
      // Update the NFT state using a function to ensure we're working with latest state
      setNft(prevNft => ({
        ...prevNft,
        price: resalePrice,
        priceWei: priceInWei,
        isForSale: true
      }));
      
      // Clear the input field
      setResalePrice('');
      
      // Navigate after a delay, passing state to indicate where we came from
      setTimeout(() => {
        console.log("Navigating to My NFTs page...");
        navigate('/my-nfts');
      }, 2000);
    } catch (err) {
      console.error('Error listing NFT for sale:', err);
      setError('Failed to list NFT for sale. Please try again.');
    } finally {
      setListingNft(false);
    }
  };
    // Handle updating price of a listed NFT
  const handleUpdatePrice = async () => {
    if (!nft || !contract || !account || !resalePrice) return;
    
    setListingNft(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Convert price from ETH to Wei
      const priceInWei = etherToWei(resalePrice);
      
      // Update the price
      const tx = await contract.updatePrice(id, priceInWei);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      setSuccess('NFT price updated successfully!');
      
      // Update the NFT state directly instead of reloading the page
      setNft({
        ...nft,
        price: resalePrice,
        priceWei: priceInWei
      });
      
      // Clear the input field
      setResalePrice('');
      
      // Navigate to MyNFTs page after a short delay without reloading
      setTimeout(() => {
        navigate('/my-nfts');
      }, 2000);
    } catch (err) {
      console.error('Error updating NFT price:', err);
      setError('Failed to update NFT price. Please try again.');
    } finally {
      setListingNft(false);
    }
  };
    // Handle removing NFT from sale
  const handleRemoveFromSale = async () => {
    if (!nft || !contract || !account) return;
    
    setListingNft(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Remove the NFT from sale
      const tx = await contract.removeFromSale(id);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      setSuccess('NFT removed from sale successfully!');
      
      // Update the NFT state directly instead of reloading the page
      setNft({
        ...nft,
        isForSale: false
      });
      
      // Navigate to MyNFTs page after a short delay without reloading
      setTimeout(() => {
        navigate('/my-nfts');
      }, 2000);
    } catch (err) {
      console.error('Error removing NFT from sale:', err);
      setError('Failed to remove NFT from sale. Please try again.');
    } finally {
      setListingNft(false);
    }
  };
  
  // Handle resale price input change
  const handleResalePriceChange = (e) => {
    setResalePrice(e.target.value);
  };

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading NFT details...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/gallery')}>
          Back to Gallery
        </Button>
      </Container>
    );
  }

  if (!nft) {
    return (
      <Container className="my-5">
        <Alert variant="warning">NFT not found.</Alert>
        <Button variant="primary" onClick={() => navigate('/gallery')}>
          Back to Gallery
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Button variant="light" onClick={() => navigate('/gallery')} className="mb-4">
        &larr; Back to Gallery
      </Button>
      
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}
      
      <Row>
        <Col md={6} className="mb-4">
          <img 
            src={nft.image} 
            alt={nft.name} 
            className="img-fluid rounded w-100" 
            style={{ maxHeight: '500px', objectFit: 'contain' }}
          />
        </Col>
        <Col md={6}>
          <h2>{nft.name}</h2>
          <p className="lead">{nft.description}</p>
          
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col>
                  <h5>Price</h5>
                  <p className="fw-bold">{nft.price} ETH</p>
                </Col>
                <Col>
                  <h5>Creator</h5>
                  <p className="text-truncate">{nft.creator}</p>
                </Col>
              </Row>
              
              <Row className="mt-2">
                <Col>
                  <h5>Owner</h5>
                  <p className="text-truncate">{nft.owner}</p>
                </Col>
                <Col>
                  <h5>Token ID</h5>
                  <p>#{nft.id}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
            {!nft.isOwnedByUser ? (
            // Buy button for NFTs that are for sale but not owned by the user
            nft.isForSale ? (
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleBuy}
                disabled={buying || !account}
                className="w-100"
              >
                {buying ? (
                  <>
                    <Spinner as="span" size="sm" animation="border" className="me-2" />
                    Processing...
                  </>
                ) : (
                  `Buy for ${nft.price} ETH`
                )}
              </Button>
            ) : (
              <Alert variant="secondary">
                This NFT is not currently for sale
              </Alert>
            )
          ) : (
            // Options for NFT owner - resale functionality
            <div>
              <Alert variant={nft.isForSale ? "success" : "info"}>
                {nft.isForSale 
                  ? `This NFT is currently listed for sale at ${nft.price} ETH` 
                  : "You own this NFT. You can list it for sale below."}
              </Alert>
                {nft.isForSale ? (
                <>
                  {/* Price update option when NFT is for sale */}
                  <div className="mt-3 mb-3">
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="New Price in ETH"
                        value={resalePrice}
                        onChange={handleResalePriceChange}
                        step="0.001"
                        min="0"
                      />
                      <Button 
                        variant="warning" 
                        onClick={handleUpdatePrice}
                        disabled={listingNft || !resalePrice}
                      >
                        {listingNft ? (
                          <>
                            <Spinner as="span" size="sm" animation="border" className="me-2" />
                            Processing...
                          </>
                        ) : (
                          'Update Price'
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Remove from sale button */}
                  <Button 
                    variant="danger" 
                    size="lg" 
                    onClick={handleRemoveFromSale}
                    disabled={listingNft}
                    className="w-100 mt-3"
                  >
                    {listingNft ? (
                      <>
                        <Spinner as="span" size="sm" animation="border" className="me-2" />
                        Processing...
                      </>
                    ) : (
                      'Remove from Sale'
                    )}
                  </Button>
                </>
              ) : (
                <div className="mt-3">
                  <div className="input-group mb-3">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Set Price in ETH"
                      value={resalePrice}
                      onChange={handleResalePriceChange}
                      step="0.001"
                      min="0"
                    />
                    <Button 
                      variant="success" 
                      onClick={handleListForSale}
                      disabled={listingNft || !resalePrice}
                    >
                      {listingNft ? (
                        <>
                          <Spinner as="span" size="sm" animation="border" className="me-2" />
                          Processing...
                        </>
                      ) : (
                        'List for Sale'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default NFTDetails;
