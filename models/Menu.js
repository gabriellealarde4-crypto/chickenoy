const mongoose = require("mongoose")

const MenuSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    image: String,
    category: String,
    stock: { type: Number, default: 50 },
    sold: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true }
})

MenuSchema.index({category: 1})

module.exports = mongoose.model("Menu",MenuSchema)
