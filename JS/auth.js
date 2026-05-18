document.getElementById("loginForm").addEventListener("submit", function(e){

e.preventDefault()

const email = document.getElementById("email").value
const password = document.getElementById("password").value

window.ChickenoyApi.request("/api/auth/login", {

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({email,password})

})

.then(data=>{

alert("Login successful")

localStorage.setItem("token",data.data.token)

})

})
