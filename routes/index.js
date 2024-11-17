const router = require('express').Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')

router.get('/', ensureGuest ,(req, res) => {
    res.render('pages/login')
  })

router.get("/home", ensureAuth, async(req,res)=>{
  res.render('pages/home', {userinfo:req.user})
})
module.exports=router;