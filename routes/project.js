const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')

router.get('/:projectKey', ensureAuth ,(req, res) => {
    console.log(`Project key : ${req.params.projectKey}`)
    res.render('index', {userinfo:req.user})
  })

router.get('/home', ensureAuth, async(req,res)=>{
  console.log(`User logged in : ${req.user.displayName} (${req.user.email})`)
  res.render('index', {userinfo:req.user})
})
module.exports=router;