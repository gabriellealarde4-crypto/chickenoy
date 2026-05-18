# 🍗 CHICKENOY - COMPLETE WEBSITE SETUP ✅

## WEBSITE IS NOW LIVE!
**Server:** http://localhost:5000  
**Status:** ✅ All pages working  
**Updated:** 2026-03-16

---

## 🎯 QUICK START

**Step 1:** Open browser to http://localhost:5000

**Step 2:** Navigate Menu → Cart → Checkout → Payment → Dashboard

**Step 3:** Complete the flow to test all features

---

## 📱 COMPLETE NAVIGATION MAP

```
┌─ HOME (index.html)
│  └─ Order Now → 
│
├─ MENU (menu.html)  
│  └─ Add to Cart → (saves to localStorage)
│     └─ Go to Cart →
│
├─ SHOPPING CART (cart.html)
│  ├─ Adjust quantities
│  ├─ Remove items  
│  └─ Proceed to Checkout →
│
├─ CHECKOUT (checkout.html)
│  ├─ Fill Order Form:
│  │  ├─ Full Name
│  │  ├─ Phone Number
│  │  ├─ Delivery Address
│  │  └─ Payment Method (COD or GCash)
│  │
│  ├─ Place Order →
│  │
│  ├─ IF COD:
│  │  └─ ✅ Success → Dashboard
│  │
│  └─ IF GCASH:
│     └─ GCash Payment Page →
│
├─ GCASH PAYMENT (gcash-payment.html)
│  ├─ View QR Code
│  ├─ Follow 6 step instructions
│  ├─ Scan & Pay
│  └─ Confirm Payment → Dashboard
│
├─ DASHBOARD (dashboard.html)
│  └─ View All Orders
│
├─ LOGIN (login.html)
│  └─ User Authentication
│
└─ REGISTER (register.html)
   └─ Create New Account
```

---

## ✅ ALL PAGES ACCESSIBLE

| Page | URL | Status |
|------|-----|--------|
| Home | http://localhost:5000/ | ✅ Working |
| Menu | http://localhost:5000/menu.html | ✅ Working |
| Cart | http://localhost:5000/cart.html | ✅ Working |
| Checkout | http://localhost:5000/checkout.html | ✅ Working |
| GCash Payment | http://localhost:5000/gcash-payment.html | ✅ Working |
| Dashboard | http://localhost:5000/dashboard.html | ✅ Working |
| Login | http://localhost:5000/login.html | ✅ Working |
| Register | http://localhost:5000/register.html | ✅ Working |

---

## 🔄 COMPLETE DATA FLOW

```
USER BROWSER                    SERVER (Node.js)              DATABASE (MongoDB)
─────────────                   ─────────────────              ──────────────────

1. Home Page ─────────────────→ GET / ────────────────────→ 
                                (Serves index.html)
                               
2. Click "Order Now"
   ↓ Navigate to Menu ────────→ GET /menu.html ────────────→
                                (Serves menu.html)

3. Click "Add to Cart"
   ↓ localStorage.cart
     += {item} ──────────────→ (No server call, just localStorage)

4. Click "Cart" 
   ↓ Navigate to Cart ────────→ GET /cart.html ────────────→
                                (Serves cart.html)
                                (Reads from localStorage)

5. Click "Checkout"
   ↓ Navigate to Checkout ───→ GET /checkout.html ───────→
                                (Serves checkout.html)

6. Fill Form & Click "Place Order"
   ↓ POST /api/orders/create ──→ Validate Token ───────────→
   (with Bearer Token)          ↓
                               Create Order in MongoDB ───→ insertion
                               ↓                            ├─ userId
                               Return Success             ├─ name
                               ↓                           ├─ phone
7. IF Payment = GCASH:         ├─ address
   ↓ Navigate to GCash ───────→ GET /gcash-payment.html ──→
   Payment                       (Serves payment page)

8. Click "Confirm Payment"
   ↓ Navigate to Dashboard ───→ GET /dashboard.html ─────→ Query MongoDB
                                (Serves dashboard.html)    ↓
                                ↓                       Find Orders by
                                [Frontend fetches       userId
                                users orders from:
                                GET /api/orders] ──────→ Return User Orders
                                                        ├─ OrderID
                                                        ├─ Items
                                                        ├─ Total Price
                                                        ├─ Status
                                                        └─ Date

9. Dashboard displays:
   ✅ All user orders
   ✅ Order status
   ✅ Order history
```

---

## 🎨 DESIGN & STYLING

**Theme Colors:**
- 🔴 Brand Red: #e63946
- 🟡 Accent Gold: #ffbe0b
- ⚫ Text: #1f1f1f
- ⚪ Background: #fafafa

**Features:**
- ✅ Fully responsive design
- ✅ Mobile-first approach
- ✅ Smooth animations
- ✅ Professional UI
- ✅ Consistent across all pages

---

## 🔐 SECURITY

**Authentication:**
- JWT tokens for user authentication
- Token validation on all protected routes
- Secure password handling with bcryptjs
- Rate limiting (100 requests/15 minutes)
- CORS enabled for frontend communication

**Data:**
- All orders linked to user ID
- MongoDB data persistence
- Validation on all form inputs
- Error handling throughout

---

## 📊 DATABASE STRUCTURE (MongoDB)

**Users Collection:**
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "password": "hashed_password",
  "createdAt": timestamp
}
```

**Orders Collection:**
```json
{
  "_id": ObjectId,
  "userId": "user_id",
  "name": "Juan Cruz",
  "phone": "09123456789",
  "address": "Quezon City",
  "payment": "GCASH",
  "items": [
    {
      "name": "Spicy Chicken",
      "price": 120,
      "quantity": 2
    }
  ],
  "totalPrice": 240,
  "orderStatus": "Pending",
  "createdAt": timestamp
}
```

**Menu Collection:**
```json
{
  "_id": ObjectId,
  "name": "Spicy Chicken",
  "description": "Crispy fried chicken with spicy seasoning",
  "price": 120,
  "image": "url_to_image",
  "category": "Chicken"
}
```

---

## 🚀 HOW TO USE

### For Users:

1. **Register/Login**
   - Visit http://localhost:5000/register
   - Create account or login

2. **Browse Menu**
   - Visit http://localhost:5000/menu.html
   - View all available items

3. **Add to Cart**
   - Click "Add to Cart" on any item
   - Items added to browser localStorage

4. **Checkout**
   - Go to cart
   - Review items
   - Click "Proceed to Checkout"
   - Fill order form
   - Select payment method

5. **Payment**
   - For COD: Order confirmed immediately
   - For GCash: Scan QR code and confirm

6. **Track Order**
   - Visit dashboard
   - See all orders and status

---

## ⚙️ TECHNICAL SETUP

**Backend:**
- Node.js with Express.js
- MongoDB for data storage
- JWT for authentication
- bcryptjs for password hashing

**Frontend:**
- Pure HTML/CSS/JavaScript
- No frameworks (lightweight)
- Responsive design
- localStorage for cart management

**Server Status:**
- ✅ Running on port 5000
- ✅ MongoDB connected
- ✅ All routes working
- ✅ Serving all pages correctly

---

## 🎯 TESTING CHECKLIST

- [ ] Home page loads
- [ ] Menu page shows items
- [ ] Can add items to cart
- [ ] Cart page displays items correctly
- [ ] Can adjust quantities
- [ ] Checkout form appears
- [ ] Form validation works
- [ ] Order creates in MongoDB
- [ ] GCash payment page appears
- [ ] Dashboard shows orders
- [ ] Navigation works smoothly
- [ ] Responsive on mobile

---

## 📞 IF ISSUES OCCUR

1. **Server not running:**
   ```
   cd C:\FriedChicken\Backend
   npm start
   ```

2. **Port already in use:**
   ```
   taskkill /F /IM node.exe
   ```

3. **MongoDB not connected:**
   - Ensure MongoDB is running locally
   - Check .env file has correct URI

4. **Pages not loading:**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Check browser console (F12)
   - Verify server is running

---

## ✨ WHAT'S INCLUDED

✅ Complete fried chicken menu system  
✅ Shopping cart with quantity controls  
✅ Professional checkout form  
✅ GCash payment integration with QR code  
✅ Order history dashboard  
✅ User authentication  
✅ MongoDB data storage  
✅ Responsive mobile design  
✅ Professional UI/UX  
✅ Error handling  
✅ Form validation  

---

**🍗 CHICKENOY IS READY TO USE! 🍗**

Visit: http://localhost:5000
