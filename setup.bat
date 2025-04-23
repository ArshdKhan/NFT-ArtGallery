@echo off
REM ===================================================
REM NFT Art Gallery - First Time Setup
REM ===================================================
REM
REM NOTE: The NFTArtGallery smart contract is modularized into NFTBase, NFTSale, NFTMetadata, and NFTCreator.
REM All modules are compiled and deployed together.
REM ===================================================

echo ===================================================
echo NFT Art Gallery - First Time Setup
echo ===================================================
echo.
echo The NFTArtGallery contract is split into 4 modules:
echo   - NFTBase.sol (minting, ownership)
echo   - NFTSale.sol (sales logic)
echo   - NFTMetadata.sol (read-only utilities)
echo   - NFTCreator.sol (creator utilities)
echo.
echo Installing root project dependencies...
call npm install

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Compiling smart contracts (modularized)...
call npx hardhat compile

echo.
echo Starting Ganache...
echo IMPORTANT: Please make sure Ganache is running on port 7545
echo Press any key when Ganache is running...
pause 

echo.
echo Deploying contracts to Ganache...
call npx hardhat run scripts/deploy.js --network ganache

echo.
echo ===================================================
echo First-time setup complete!
echo.
echo To start the application:
echo 1. Make sure Ganache is still running
echo 2. Run the start.bat file
echo ===================================================
echo.
pause
