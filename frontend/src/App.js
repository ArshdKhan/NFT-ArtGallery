import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Container, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Navigation from './components/Navigation';
import Home from './components/Home';
import Gallery from './components/Gallery';
import NFTDetails from './components/NFTDetails';
import CreateNFT from './components/CreateNFT';
import MyNFTs from './components/MyNFTs';

// Utils
import { initWeb3, getAccounts, getNetworkId, initContract } from './utils/ethersUtils';

function AppContent() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setLoading(true);
      setConnectionStatus('Connecting to wallet...');
      setError(null);
      
      // Initialize ethers provider
      const ethersProvider = await initWeb3();
      setWeb3(ethersProvider);

      // Get user accounts
      const userAccounts = await getAccounts(ethersProvider);
      setAccounts(userAccounts);

      // Get network ID and initialize contract
      const networkId = await getNetworkId(ethersProvider);
      const contractInstance = await initContract(ethersProvider, networkId);
      setContract(contractInstance);
      
      // Set up event listeners
      setupEventListeners();
      
      setLoading(false);
      setConnectionStatus('');
      
      // Refresh current page to show updated data
      navigate(location.pathname, { replace: true });
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error.message);
      setLoading(false);
      setConnectionStatus('');
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAccounts([]);
    setConnectionStatus('Wallet disconnected');
    
    // Clear the connection status after 3 seconds
    setTimeout(() => {
      setConnectionStatus('');
    }, 3000);
  };
  
  // Setup event listeners for wallet
  const setupEventListeners = () => {
    if (window.ethereum) {
      // Set up event listener for account changes
      window.ethereum.on('accountsChanged', async (newAccounts) => {
        if (newAccounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet();
        } else {
          setAccounts(newAccounts);
          // Refresh current page to show updated data
          navigate(location.pathname, { replace: true });
        }
      });

      // Set up event listener for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  };

  // Initialize on first load if wallet was previously connected
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.ethereum && window.ethereum.isConnected && window.ethereum.selectedAddress) {
          // Wallet is already connected, initialize
          await connectWallet();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setLoading(false);
      }
    };

    checkWalletConnection();

    // Clean up event listeners
    return () => {
      if (window.ethereum && window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);
  if (loading && !connectionStatus) {
    return (
      <Container className="text-center mt-5">
        <h2>Loading NFT Art Gallery...</h2>
        <p>Please make sure you have MetaMask installed and connected to Ganache network.</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="text-center mt-5">
        <h2>Error connecting to blockchain</h2>
        <p className="text-danger">{error}</p>
        <p>Please make sure you have MetaMask installed and connected to Ganache network.</p>
      </Container>
    );
  }

  return (
    <div className="App">
      <Navigation 
        account={accounts[0]} 
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet} 
      />
      {connectionStatus && (
        <Container className="mt-3">
          <Alert 
            variant={connectionStatus.includes('error') ? 'danger' : 
                   connectionStatus.includes('disconnect') ? 'warning' : 'info'}
          >
            {connectionStatus}
          </Alert>
        </Container>
      )}
      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/gallery" 
            element={<Gallery web3={web3} contract={contract} account={accounts[0]} />} 
          />
          <Route 
            path="/nft/:id" 
            element={<NFTDetails web3={web3} contract={contract} account={accounts[0]} />} 
          />
          <Route 
            path="/create" 
            element={<CreateNFT web3={web3} contract={contract} account={accounts[0]} />} 
          />
          <Route 
            path="/my-nfts" 
            element={<MyNFTs web3={web3} contract={contract} account={accounts[0]} />} 
          />
        </Routes>
      </Container>
    </div>
  );
}

// Wrapper component to provide navigation hooks
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
