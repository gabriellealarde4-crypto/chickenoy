const express = require("express")
const jwt = require("jsonwebtoken")

const Menu = require("../models/Menu")
const Order = require("../models/Order")
const User = require("../models/User")
const ContactMessage = require("../models/ContactMessage")
const ProductReview = require("../models/ProductReview")
const defaultMenu = require("../defaultMenu")

const router = express.Router()

const ADMIN_USERNAME = "ChickeNoy"
const ADMIN_PASSWORD = "12345"
const JWT_SECRET = process.env.JWT_SECRET || "default-secret"

function adminAuth(req, res, next) {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (!token) return res.status(401).json({error: "Admin login required"})

    try {
        const verified = jwt.verify(token, JWT_SECRET)
        if (verified.role !== "admin") {
            return res.status(403).json({error: "Admin access only"})
        }
        req.admin = verified
        next()
    } catch (error) {
        res.status(401).json({error: "Admin session expired. Please log in again."})
    }
}

async function ensureDefaultMenu() {
    const count = await Menu.countDocuments()
    if (count > 0) return
    await Menu.insertMany(defaultMenu)
}

router.post("/login", (req, res) => {
    const {username, password} = req.body

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({error: "Invalid admin username or password"})
    }

    const token = jwt.sign({role: "admin", username: ADMIN_USERNAME}, JWT_SECRET, {expiresIn: "8h"})
    res.json({success: true, token, username: ADMIN_USERNAME})
})

router.get("/summary", adminAuth, async (req, res) => {
    try {
        await ensureDefaultMenu()
        const [orders, users, menu, messages, productReviews] = await Promise.all([
            Order.find().sort({createdAt: -1}).limit(200),
            User.find().select("name email phone createdAt lastLogin loginCount").sort({createdAt: -1}).limit(200),
            Menu.find().sort({category: 1, name: 1}),
            ContactMessage.find().sort({updatedAt: -1, createdAt: -1}).limit(100),
            ProductReview.find().sort({submittedAt: -1}).limit(300)
        ])

        res.json({
            orders,
            users,
            menu,
            messages,
            productReviews,
            stats: {
                orders: orders.length,
                users: users.length,
                revenue: orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0),
                reviews: orders.filter(order => order.review && order.review.rating).length + productReviews.length,
                unreadMessages: messages.filter(message => !message.isRead).length
            }
        })
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/orders/:id", adminAuth, async (req, res) => {
    try {
        const allowedStatuses = ["Processing", "Shipped", "To Receive", "Received", "Reviewed"]
        const allowedPaymentStatuses = ["Pending", "Paid", "Failed"]
        const updates = {}

        if (req.body.orderStatus) {
            if (!allowedStatuses.includes(req.body.orderStatus)) {
                return res.status(400).json({error: "Invalid order status"})
            }
            updates.orderStatus = req.body.orderStatus
        }

        if (req.body.paymentStatus) {
            if (!allowedPaymentStatuses.includes(req.body.paymentStatus)) {
                return res.status(400).json({error: "Invalid payment status"})
            }
            updates.paymentStatus = req.body.paymentStatus
        }

        const order = await Order.findById(req.params.id)
        if (!order) return res.status(404).json({error: "Order not found"})

        Object.assign(order, updates)

        if (updates.orderStatus) {
            const flowLabel = updates.orderStatus === "Shipped" ? "Ship" : updates.orderStatus
            order.statusHistory.push({
                status: flowLabel,
                note: `Admin updated order to ${updates.orderStatus}`
            })
        }

        await order.save()
        res.json(order)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/menu/:id", adminAuth, async (req, res) => {
    try {
        const updates = {}
        const editableFields = ["name", "description", "price", "image", "category", "stock", "isAvailable"]

        editableFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field]
            }
        })

        if (updates.price !== undefined) updates.price = Number(updates.price)
        if (updates.stock !== undefined) updates.stock = Number(updates.stock)

        const item = await Menu.findByIdAndUpdate(req.params.id, updates, {new: true, runValidators: true})
        if (!item) return res.status(404).json({error: "Menu item not found"})

        res.json(item)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/messages/:id/read", adminAuth, async (req, res) => {
    try {
        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            {isRead: true},
            {new: true}
        )
        if (!message) return res.status(404).json({error: "Message not found"})
        res.json(message)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/messages/read-all", adminAuth, async (req, res) => {
    try {
        await ContactMessage.updateMany({isRead: false}, {$set: {isRead: true}})
        res.json({success: true})
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/messages/:id/reply", adminAuth, async (req, res) => {
    try {
        const attachment = String(req.body.attachment || "")
        const reply = String(req.body.message || "").trim() || (attachment ? "Photo or video attachment" : "")
        const attachmentName = String(req.body.attachmentName || "")
        if (!reply) return res.status(400).json({error: "Reply message is required"})

        const message = await ContactMessage.findById(req.params.id)
        if (!message) return res.status(404).json({error: "Message not found"})

        if (!message.replies.length) {
            message.replies.push({
                sender: "customer",
                message: message.message,
                attachment: message.attachment || "",
                attachmentName: message.attachmentName || "",
                createdAt: message.createdAt
            })
        }
        message.replies.push({sender: "admin", message: reply, attachment, attachmentName})
        message.customerHasUnread = true
        message.isRead = true
        message.updatedAt = new Date()
        await message.save()

        res.json(message)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

module.exports = router
