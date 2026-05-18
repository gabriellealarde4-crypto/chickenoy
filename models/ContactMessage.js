const mongoose = require("mongoose")

const ContactMessageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    userId: { type: String, default: "" },
    subject: { type: String, trim: true, default: "Customer Message" },
    message: { type: String, required: true, trim: true },
    attachment: { type: String, default: "" },
    attachmentName: { type: String, default: "" },
    source: { type: String, default: "website" },
    isRead: { type: Boolean, default: false },
    customerHasUnread: { type: Boolean, default: false },
    replies: [
        {
            sender: { type: String, enum: ["customer", "admin"], required: true },
            message: { type: String, required: true, trim: true },
            attachment: { type: String, default: "" },
            attachmentName: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

ContactMessageSchema.index({ isRead: 1, createdAt: -1 })
ContactMessageSchema.index({ userId: 1, createdAt: -1 })
ContactMessageSchema.index({ updatedAt: -1 })

module.exports = mongoose.model("ContactMessage", ContactMessageSchema)
