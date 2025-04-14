@echo off
echo ===================================================
echo NFT Art Gallery - Starting Application
echo ===================================================
echo.

echo IMPORTANT: Please make sure Ganache is running on port 7545
echo If you need to redeploy the contracts, press 'R'
echo Otherwise, press any other key to start the frontend...
set /p choice="Press R to redeploy or any other key to continue: "

if /i "%choice%"=="R" goto redeployContracts
goto startFrontend

:redeployContracts
echo.
echo Redeploying contracts to Ganache...
call npx hardhat run scripts/deploy.js --network ganache
echo Contract redeployment complete!
echo.

:startFrontend
echo.
echo Starting the frontend application...
cd frontend
start cmd /k npm start
cd ..

echo.
echo ===================================================
echo NFT Art Gallery is running!
echo.
echo Frontend: http://localhost:3000
echo.
echo REMINDER: Connect MetaMask to Ganache (http://127.0.0.1:7545, Chain ID: 1337)
echo and import a Ganache account using its private key.
echo ===================================================
echo.
echo Press any key to exit this window (the app will continue running)...
pause > nul
