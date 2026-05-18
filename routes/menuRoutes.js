const express = require("express")
const router = express.Router()

const Menu = require("../models/Menu")
const defaultMenu = require("../defaultMenu")

async function ensureDefaultMenu() {
    const count = await Menu.countDocuments()
    if (count > 0) return
    await Menu.insertMany(defaultMenu)
}

router.get("/", async(req,res)=>{
    try {
        await ensureDefaultMenu()
        const menu = await Menu.find()
        console.log(`GET /api/menu -> ${menu.length} items (requested from ${req.ip || req.headers['x-forwarded-for'] || 'unknown'})`)
        res.json(menu)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

router.post("/", async(req,res)=>{
    try {
        const item = new Menu(req.body)
        await item.save()
        res.json(item)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
})

module.exports = router
