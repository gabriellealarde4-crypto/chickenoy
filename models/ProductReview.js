const mongoose = require("mongoose")

const ProductReviewSchema = new mongoose.Schema({
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true, trim: true },
    productImage: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: "" },
    userName: { type: String, trim: true, default: "Customer" },
    userId: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now }
})

ProductReviewSchema.index({ submittedAt: -1 })

module.exports = mongoose.model("ProductReview", ProductReviewSchema)
