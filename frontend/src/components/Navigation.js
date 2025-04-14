import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Navigation = ({ account, onConnectWallet, onDisconnectWallet }) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">NFT Art Gallery</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/gallery">Gallery</Nav.Link>
            <Nav.Link as={Link} to="/create">Create Artwork</Nav.Link>
            <Nav.Link as={Link} to="/my-nfts">My NFTs</Nav.Link>
          </Nav>
          <Nav>
            {account ? (
              <div className="d-flex align-items-center">
                <Navbar.Text className="me-3">
                  Connected: {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
                </Navbar.Text>
                <Button variant="outline-light" size="sm" onClick={onDisconnectWallet}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="outline-light" onClick={onConnectWallet}>
                Connect Wallet
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
