const express = require("express")
const jwt = require("jsonwebtoken")

const ContactMessage = require("../models/ContactMessage")
const User = require("../models/User")

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || "default-secret"

function optionalAuth(req) {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (!token) return null
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (error) {
        return null
    }
}

function requireAuth(req, res, next) {
    const verified = optionalAuth(req)
    if (!verified) return res.status(401).json({error: "Login required"})
    req.user = verified
    next()
}

router.post("/", async (req, res) => {
    try {
        const verified = optionalAuth(req)
        const name = String(req.body.name || "").trim()
        const phone = String(req.body.phone || "").trim()
        const email = String(req.body.email || "").trim()
        const subject = String(req.body.subject || "Customer Message").trim()
        const attachment = String(req.body.attachment || "")
        const message = String(req.body.message || "").trim() || (attachment ? "Photo or video attachment" : "")
        const attachmentName = String(req.body.attachmentName || "")

        if (!name || !phone || !message) {
            return res.status(400).json({error: "Name, phone, and message are required"})
        }

        const savedMessage = await ContactMessage.create({
            name,
            phone,
            email,
            userId: verified?.id || "",
            subject,
            message,
            attachment,
            attachmentName,
            source: req.body.source || "website",
            isRead: false,
            customerHasUnread: false,
            replies: [{sender: "customer", message, attachment, attachmentName}]
        })

        res.status(201).json({
            success: true,
            message: "Message sent. Chickenoy will contact you soon.",
            id: savedMessage._id
        })
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.get("/my-messages", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("email phone")
        const filters = [{userId: req.user.id}]
        if (user?.email) filters.push({email: user.email})
        if (user?.phone) filters.push({phone: user.phone})

        const messages = await ContactMessage.find({$or: filters}).sort({updatedAt: -1, createdAt: -1}).limit(100)
        res.json(messages)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/my-messages/read", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("email phone")
        const filters = [{userId: req.user.id}]
        if (user?.email) filters.push({email: user.email})
        if (user?.phone) filters.push({phone: user.phone})

        await ContactMessage.updateMany({$or: filters}, {$set: {customerHasUnread: false}})
        res.json({success: true})
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/my-messages/:id/reply", requireAuth, async (req, res) => {
    try {
        const attachment = String(req.body.attachment || "")
        const reply = String(req.body.message || "").trim() || (attachment ? "Photo or video attachment" : "")
        const attachmentName = String(req.body.attachmentName || "")
        if (!reply) return res.status(400).json({error: "Message is required"})

        const user = await User.findById(req.user.id).select("email phone")
        const filters = [{_id: req.params.id, userId: req.user.id}]
        if (user?.email) filters.push({_id: req.params.id, email: user.email})
        if (user?.phone) filters.push({_id: req.params.id, phone: user.phone})

        const message = await ContactMessage.findOne({$or: filters})
        if (!message) return res.status(404).json({error: "Conversation not found"})

        if (!message.replies.length) {
            message.replies.push({
                sender: "customer",
                message: message.message,
                attachment: message.attachment || "",
                attachmentName: message.attachmentName || "",
                createdAt: message.createdAt
            })
        }
        message.replies.push({sender: "customer", message: reply, attachment, attachmentName})
        message.message = reply
        message.isRead = false
        message.customerHasUnread = false
        message.updatedAt = new Date()
        await message.save()

        res.json(message)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

module.exports = router
