// routes/blockchainRouter.js
import express from "express";
import {
    verifyArtisanIdentity,
    generateNFTCertificate,
    verifyProductAuthenticity,
    createSmartContract,
    executeSmartContract,
    getBlockchainHistory
} from "../controllers/blockchainController.js";

const blockchainRouter = express.Router();

// Blockchain identity verification
blockchainRouter.post("/verify-artisan", verifyArtisanIdentity);
blockchainRouter.post("/generate-nft", generateNFTCertificate);
blockchainRouter.post("/verify-product", verifyProductAuthenticity);

// Smart contracts
blockchainRouter.post("/smart-contract/create", createSmartContract);
blockchainRouter.post("/smart-contract/execute", executeSmartContract);

// History and tracking
blockchainRouter.get("/history/:entityId", getBlockchainHistory);

export default blockchainRouter;