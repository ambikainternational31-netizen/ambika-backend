const QRCode = require('qrcode');

class UPIPaymentService {
    constructor() {
        this.merchantUPI = process.env.MERCHANT_UPI_ID || 'rinkeshvaghasiya89-1@okicici'; // Replace with your actual UPI ID
        this.merchantName = process.env.MERCHANT_NAME || 'Ambika International';
    }

    /**
     * Generate UPI payment link
     * @param {Object} params Payment parameters
     * @returns {string} UPI payment link
     */
    generateUPILink({
        amount,
        transactionId,
        description = 'Payment to Ambika International'
    }) {
        const normalizedAmount = parseFloat(amount);
        if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
            throw new Error('Invalid amount for UPI payment link');
        }
        const amountString = normalizedAmount.toFixed(2).replace(/\.00$/, '');

        // Calculate the service fee (1% of the amount) - This will be handled internally after payment
        const serviceFee = parseFloat((normalizedAmount * 0.01).toFixed(2));
        const merchantAmount = parseFloat((normalizedAmount - serviceFee).toFixed(2));
        
        // Single payment URL for the full amount
        const upiUrl = `upi://pay?pa=${this.merchantUPI}&pn=${encodeURIComponent(this.merchantName)}&am=${amountString}&tn=${encodeURIComponent(description)}&tr=${transactionId}&cu=INR`;
        
        return {
            upiUrl,
            merchantAmount,
            serviceFee,
            totalAmount: normalizedAmount
        };
    }

    /**
     * Generate QR code for the payment
     * @param {string} upiUrl UPI payment link
     * @returns {Promise<string>} Base64 encoded QR code image
     */
    async generateQRCode(upiUrl) {
        try {
            const qrImage = await QRCode.toDataURL(upiUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            return qrImage;
        } catch (error) {
            throw new Error('Failed to generate QR code: ' + error.message);
        }
    }

    /**
     * Create a complete payment request with both UPI link and QR code
     * @param {Object} paymentDetails Payment details
     * @returns {Promise<Object>} Payment request with UPI link and QR code
     */
    async createPaymentRequest({
        amount,
        orderId,
        description
    }) {
        try {
            // Generate transaction ID (you might want to use a more sophisticated method)
            const transactionId = `TXN_${Date.now()}_${orderId}`;

            // Generate UPI payment links
            const paymentLinks = this.generateUPILink({
                amount,
                transactionId,
                description
            });

            // Generate single QR code for the full payment
            const qrCode = await this.generateQRCode(paymentLinks.upiUrl);

            // Return payment details
            return {
                success: true,
                data: {
                    transactionId,
                    totalAmount: amount,
                    merchantAmount: paymentLinks.merchantAmount,
                    serviceFee: paymentLinks.serviceFee,
                    upiLink: paymentLinks.upiUrl,
                    qrCode: qrCode,
                    merchantUPI: this.merchantUPI,
                    merchantName: this.merchantName,
                    timestamp: new Date().toISOString(),
                    orderId,
                    description
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new UPIPaymentService();