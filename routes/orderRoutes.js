const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")

const Order = require("../models/Order")
const Menu = require("../models/Menu")

const ORDER_STATUSES = ["Processing", "Shipped", "To Receive", "Received", "Reviewed"]

router.post("/create", auth, async(req,res)=>{
    try {
        if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
            return res.status(400).json({error: "Order must contain at least one item"})
        }

        const normalizedItems = []

        for (const item of req.body.items) {
            const quantity = Number(item.quantity || 0)
            const price = Number(item.price || 0)

            if (!item.name || quantity < 1 || price < 0) {
                return res.status(400).json({error: "Order contains an invalid item"})
            }

            const normalizedItem = {
                menuItemId: item.menuItemId || "",
                name: item.name,
                quantity,
                price,
                image: item.image || "",
                category: item.category || ""
            }

            if (!item.menuItemId || !/^[0-9a-fA-F]{24}$/.test(item.menuItemId)) {
                normalizedItems.push(normalizedItem)
                continue
            }

            const menuItem = await Menu.findById(item.menuItemId)
            if (!menuItem) {
                return res.status(400).json({error: `${item.name} is no longer available`})
            }

            if (!menuItem.isAvailable || menuItem.stock < quantity) {
                return res.status(400).json({error: `${menuItem.name} has only ${menuItem.stock} left in stock`})
            }

            normalizedItems.push({
                ...normalizedItem,
                name: menuItem.name,
                price: Number(menuItem.price || price),
                image: menuItem.image || normalizedItem.image,
                category: menuItem.category || normalizedItem.category
            })
        }

        const order = new Order({
            ...req.body,
            items: normalizedItems,
            totalPrice: normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            userId: req.user.id,
            orderStatus: "Processing",
            statusHistory: [
                { status: "Browse", note: "Customer browsed the menu" },
                { status: "Select", note: "Customer selected food items" },
                { status: "Add to Cart", note: "Items were added to cart" },
                { status: req.body.paymentMethod === "GCASH" ? "Pay" : "Add to Cart", note: `${req.body.paymentMethod} order created` },
                { status: "Process", note: "Order sent to kitchen" }
            ]
        })

        await order.save()

        for (const item of req.body.items) {
            if (!item.menuItemId || !/^[0-9a-fA-F]{24}$/.test(item.menuItemId)) continue
            await Menu.findByIdAndUpdate(item.menuItemId, {
                $inc: { stock: -item.quantity, sold: item.quantity }
            })
        }

        res.json(order)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.get("/", auth, async(req,res)=>{
    try {
        const orders = await Order.find({userId: req.user.id}).sort({createdAt: -1})
        res.json(orders)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/:id/receive", auth, async(req,res)=>{
    try {
        const order = await Order.findOne({_id: req.params.id, userId: req.user.id})
        if (!order) return res.status(404).json({error: "Order not found"})

        if (!["To Receive", "Shipped"].includes(order.orderStatus)) {
            return res.status(400).json({error: "Only orders in To Receive can be marked as received"})
        }

        order.orderStatus = "Received"
        order.statusHistory.push({status: "Receive", note: "Customer received the order"})
        await order.save()

        res.json(order)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/:id/pay", auth, async(req,res)=>{
    try {
        const order = await Order.findOne({_id: req.params.id, userId: req.user.id})
        if (!order) return res.status(404).json({error: "Order not found"})

        order.paymentStatus = "Paid"
        order.statusHistory.push({status: "Pay", note: "Customer confirmed payment"})
        await order.save()

        res.json(order)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.patch("/:id/review", auth, async(req,res)=>{
    try {
        const rating = Number(req.body.rating)
        const comment = String(req.body.comment || "").trim()

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({error: "Rating must be between 1 and 5"})
        }

        const order = await Order.findOne({_id: req.params.id, userId: req.user.id})
        if (!order) return res.status(404).json({error: "Order not found"})

        if (!["Received", "Reviewed"].includes(order.orderStatus)) {
            return res.status(400).json({error: "You can review after receiving the order"})
        }

        order.review = {rating, comment, createdAt: new Date()}
        order.orderStatus = "Reviewed"
        order.statusHistory.push({status: "Review", note: "Customer submitted a review"})
        await order.save()

        res.json(order)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

module.exports = router
