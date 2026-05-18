const mongoose = require("mongoose")

const OrderSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    items: [
        {
            menuItemId: String,
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            image: String,
            category: String
        }
    ],
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: "Pending" },
    orderStatus: { type: String, default: "Processing" },
    statusHistory: [
        {
            status: String,
            note: String,
            date: { type: Date, default: Date.now }
        }
    ],
    review: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: Date
    },
    createdAt: { type: Date, default: Date.now },
    userId: String
})

OrderSchema.index({ userId: 1, _id: 1 })

module.exports = mongoose.model("Order", OrderSchema)
