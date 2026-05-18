/**
 * SEED SAMPLE MENU ITEMS TO MONGODB
 * Run this file to populate the menu database
 * Usage: node seed-menu.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Menu = require("./models/Menu");

const sampleMenuItems = [
    {
        name: "Chicken Noy Party Platter",
        description: "Crispy chicken bites with shanghai and chicken skin for group sharing.",
        price: 1000,
        image: "/images/menu-item-1.png",
        category: "Combo",
        stock: 25,
        sold: 0,
        isAvailable: true
    },
    {
        name: "Chicken Noy Bilao",
        description: "Golden crispy chicken bites. Served fresh in a bilao for sharing.",
        price: 320,
        image: "/images/menu-item-2.png",
        category: "Chicken",
        stock: 50,
        sold: 0,
        isAvailable: true
    },
    {
        name: "Chicken Noy Ultimate Feast",
        description: "Large crispy fried chicken platter made for the whole family.",
        price: 1000,
        image: "/images/menu-item-3.png",
        category: "Feast",
        stock: 25,
        sold: 0,
        isAvailable: true
    },
    {
        name: "Chicken Noy Classic Fried Leg",
        description: "Tender chicken leg, crispy outside and juicy inside.",
        price: 25,
        image: "/images/menu-item-4.png",
        category: "Chicken",
        stock: 100,
        sold: 0,
        isAvailable: true
    },
    {
        name: "Chicken Noy Crispy Bundle",
        description: "Flavor-packed crispy chicken bites fried fresh for every order.",
        price: 500,
        image: "/images/menu-item-5.png",
        category: "Chicken",
        stock: 50,
        sold: 0,
        isAvailable: true
    }
];

async function seedMenu() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/Chickenoy";
        
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Clear existing menu items
        await Menu.deleteMany({});
        console.log("🗑️  Cleared existing menu items");

        // Insert sample items
        const insertedItems = await Menu.insertMany(sampleMenuItems);
        console.log(`✅ Added ${insertedItems.length} menu items`);

        insertedItems.forEach(item => {
            console.log(`   • ${item.name} - ₱${item.price}`);
        });

        await mongoose.disconnect();
        console.log("✅ Database connection closed");
        console.log("\n🎉 Menu seeded successfully!");

    } catch (error) {
        console.error("❌ Error seeding menu:", error.message);
        process.exit(1);
    }
}

seedMenu();
