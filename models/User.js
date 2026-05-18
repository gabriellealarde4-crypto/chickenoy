// filepath: c:\FriedChicken\Backend\models\User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true
    },
    phone: { 
        type: String, 
        default: "" 
    },
    role: { 
        type: String, 
        default: "user" 
    },
    loginCount: { 
        type: Number, 
        default: 0 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    lastLogin: { 
        type: Date
    }
}, {
    collection: "users"
});

module.exports = mongoose.model("User", userSchema);