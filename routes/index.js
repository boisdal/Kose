const router = require('express').Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')

router.get('/', ensureGuest ,(req, res) => {
    res.render('login')
  })

router.get("/log",ensureAuth, async(req,res)=>{
  console.log(req.user)
  res.render('index',{userinfo:req.user})
})
module.exports=router;