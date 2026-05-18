const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Order = require("../models/Order");
const ContactMessage = require("../models/ContactMessage");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

function requireAuth(req, res, next) {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Login required" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: "Session expired. Please log in again." });
    }
}

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }

        // Normalize input
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedName = name.trim();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ error: "Email already registered. Please login instead." });
        }

        // Hash password efficiently
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user object
        const newUser = new User({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            phone: (phone && phone.trim()) || ""
        });

        // Save to MongoDB
        const savedUser = await newUser.save();
        const token = jwt.sign({ id: savedUser._id }, JWT_SECRET);

        // Return response immediately with user info
        return res.status(201).json({ 
            message: "Registration successful!",
            success: true,
            token: token,
            id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            phone: savedUser.phone || ""
        });

    } catch (error) {
        console.error("Registration error:", error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            return res.status(409).json({ error: "Email already exists" });
        }
        
        return res.status(500).json({ error: "Registration failed. Please try again." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Update login activity
        await User.findByIdAndUpdate(user._id, {
            $inc: { loginCount: 1 },
            $set: { lastLogin: new Date() }
        });

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, JWT_SECRET);

        // Return user data at top level for easier access
        return res.status(200).json({ 
            success: true,
            message: "Login successful",
            token: token,
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || ""
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Login failed. Please try again." });
    }
});

router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("name email phone createdAt lastLogin loginCount");
        if (!user) return res.status(404).json({ error: "User not found" });

        const messageFilters = [{ userId: String(user._id) }];
        if (user.email) messageFilters.push({ email: user.email });
        if (user.phone) messageFilters.push({ phone: user.phone });

        const [orders, messages] = await Promise.all([
            Order.find({ userId: String(user._id) }).sort({ createdAt: -1 }).limit(20),
            ContactMessage.find({ $or: messageFilters }).sort({ createdAt: -1 }).limit(20)
        ]);

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || "",
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount || 0
            },
            stats: {
                orders: orders.length,
                messages: messages.length,
                unreadMessages: messages.filter(message => message.customerHasUnread).length,
                totalSpent: orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
            },
            orders,
            messages
        });
    } catch (error) {
        res.status(500).json({ error: "Unable to load profile. Please try again." });
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const newPassword = String(req.body.newPassword || "");
        const confirmPassword = String(req.body.confirmPassword || "");

        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: "Email, new password, and confirm password are required" });
        }

        if (newPassword.length < 5) {
            return res.status(400).json({ error: "Password must be at least 5 characters" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "No account found with that email" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: "Password updated. You can now log in with your new password." });
    } catch (error) {
        res.status(500).json({ error: "Password reset failed. Please try again." });
    }
});

module.exports = router;
