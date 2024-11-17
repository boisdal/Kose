const router = require('express').Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const Project = require('../models/Project')

router.get('/', ensureGuest ,(req, res) => {
    res.render('pages/login')
  })

router.get("/home", ensureAuth, async(req,res)=>{
  accesses = req.user.accesses
  if (accesses.includes('*')) {
    criteria = {}
  } else {
    criteria = { key: { $in: accesses } }
  }
  let projects = await Project.find(criteria)
  res.render('pages/home', {userinfo:req.user, projects: projects})
})
module.exports=router;