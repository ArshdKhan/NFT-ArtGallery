import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container className="py-5">
      <Row className="justify-content-center text-center">
        <Col md={8}>
          <h1 className="display-4 mb-4">Welcome to NFT Art Gallery</h1>
          <p className="lead mb-4">
            Create, showcase, buy, and sell unique digital artwork as NFTs on the Ethereum blockchain.
            Our platform provides an easy way to mint NFTs and share your creativity with the world.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Button as={Link} to="/gallery" variant="primary" size="lg">
              Browse Gallery
            </Button>
            <Button as={Link} to="/create" variant="outline-primary" size="lg">
              Create NFT
            </Button>
          </div>
        </Col>
      </Row>
      
      <Row className="mt-5 pt-5">
        <Col md={4} className="mb-4">
          <h3>Create</h3>
          <p>
            Mint your digital artwork as an NFT on the Ethereum blockchain.
            Simply upload your image, add details, and set your price.
          </p>
        </Col>
        <Col md={4} className="mb-4">
          <h3>Showcase</h3>
          <p>
            Display your NFT art in our digital gallery for collectors
            and art enthusiasts from around the world to discover.
          </p>
        </Col>
        <Col md={4} className="mb-4">
          <h3>Buy & Sell</h3>
          <p>
            Trade NFTs securely through smart contracts.
            Purchase artworks you love or sell your creations.
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
