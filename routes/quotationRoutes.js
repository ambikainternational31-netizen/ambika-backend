const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');

// Customer routes
router.post('/request', protect, quotationController.createQuotationRequest);
router.get('/my-requests', protect, quotationController.getQuotationRequests);

// Admin routes
router.get('/admin/requests', protect, quotationController.getAllQuotationRequests);
router.get('/admin/requests/:id', protect, quotationController.getQuotationById);
router.post('/admin/respond/:id', protect, quotationController.respondToQuotation);

module.exports = router;