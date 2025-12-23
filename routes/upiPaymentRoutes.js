const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const UPIPaymentController = require('../controllers/upiPaymentController');

// Generate UPI payment request for an order
router.get('/generate/:orderId', protect, UPIPaymentController.generatePaymentRequest);

// Generate QR code for UPI collect request
router.post('/collect-qr', protect, UPIPaymentController.generateCollectQR);

// Check payment status
router.post('/status', protect, UPIPaymentController.checkPaymentStatus);

// Verify UPI payment
router.post('/verify', protect, UPIPaymentController.verifyPayment);

module.exports = router;