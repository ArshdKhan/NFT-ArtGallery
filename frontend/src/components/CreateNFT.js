import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { uploadToIPFS, uploadMetadataToIPFS } from '../utils/ipfsService';
import { etherToWei } from '../utils/ethersUtils';

const CreateNFT = ({ web3, contract, account }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account || !contract || !web3) {
      setError('Please connect your wallet to create an NFT.');
      return;
    }
    
    if (!formData.name || !formData.description || !formData.price || !file) {
      setError('Please fill all fields and upload an image.');
      return;
    }
    
    try {
      setLoading(true);
      setStatus('Uploading image to IPFS...');
      setError(null);
      
      // 1. Upload image to IPFS
      const imageUrl = await uploadToIPFS(file);
      
      // 2. Create metadata
      const metadata = {
        name: formData.name,
        description: formData.description,
        image: imageUrl
      };
      
      // 3. Upload metadata to IPFS
      setStatus('Creating metadata and uploading to IPFS...');
      const tokenURI = await uploadMetadataToIPFS(metadata);
        // 4. Mint NFT
      setStatus('Minting your NFT...');
      const priceInWei = etherToWei(formData.price);
      
      const tx = await contract.createArtwork(tokenURI, priceInWei);
      await tx.wait();
      
      setStatus('Success! NFT created.');
      setSuccess(true);
      
      // Reset form after successful creation
      setFormData({
        name: '',
        description: '',
        price: ''
      });
      setFile(null);
      setPreview(null);
      
      // Redirect to gallery after 2 seconds
      setTimeout(() => {
        navigate('/gallery');
      }, 2000);
    } catch (err) {
      console.error('Error creating NFT:', err);
      setError('Failed to create NFT. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Create New NFT Artwork</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && (
        <Alert variant="success">
          NFT created successfully! Redirecting to gallery...
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Artwork Name</Form.Label>
          <Form.Control
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter the name of your artwork"
            disabled={loading}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your artwork"
            rows={3}
            disabled={loading}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Price (ETH)</Form.Label>
          <Form.Control
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter price in ETH"
            step="0.01"
            disabled={loading}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Label>Upload Artwork</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            required
          />
          <Form.Text className="text-muted">
            Supported formats: JPG, PNG, GIF. Max size: 10MB
          </Form.Text>
        </Form.Group>
        
        {preview && (
          <Card className="mb-4">
            <Card.Header>Preview</Card.Header>
            <Card.Body className="text-center">
              <img 
                src={preview} 
                alt="Preview" 
                className="img-fluid mb-2" 
                style={{ maxHeight: '300px' }}
              />
              <Card.Title>{formData.name || 'Untitled'}</Card.Title>
              <Card.Text>{formData.description || 'No description'}</Card.Text>
              <Card.Text>Price: {formData.price || '0'} ETH</Card.Text>
            </Card.Body>
          </Card>
        )}
        
        <Button 
          variant="primary" 
          type="submit" 
          size="lg" 
          disabled={loading || !account}
          className="w-100"
        >
          {loading ? (
            <>
              <Spinner as="span" size="sm" animation="border" className="me-2" />
              {status}
            </>
          ) : (
            'Create NFT'
          )}
        </Button>
      </Form>
    </Container>
  );
};

export default CreateNFT;
