const express = require("express")
const jwt = require("jsonwebtoken")

const ProductReview = require("../models/ProductReview")
const User = require("../models/User")

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || "default-secret"

async function getUserFromRequest(req) {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (!token) return null

    try {
        const verified = jwt.verify(token, JWT_SECRET)
        if (!verified.id) return null
        return User.findById(verified.id).select("name")
    } catch (error) {
        return null
    }
}

router.get("/", async (req, res) => {
    try {
        const reviews = await ProductReview.find().sort({ submittedAt: -1 }).limit(300)
        res.json(reviews)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post("/", async (req, res) => {
    try {
        const { productId, productName, productImage, rating, comment, userName } = req.body
        const numericRating = Number(rating)

        if (!productId || !productName || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ error: "Product and 1 to 5 star rating are required" })
        }

        const user = await getUserFromRequest(req)
        const review = await ProductReview.create({
            productId,
            productName,
            productImage: productImage || "",
            rating: numericRating,
            comment: comment || "",
            userName: user?.name || userName || "Customer",
            userId: user?._id?.toString() || "",
            submittedAt: new Date()
        })

        res.status(201).json(review)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router
