const router = require('express').Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const Project = require('../models/Project')

router.get('/', ensureGuest ,(req, res) => {
    res.render('pages/login')
  })

router.get("/home", ensureAuth, async(req,res)=>{
  // TODO: traiter absence de projets avec page spéciale
  res.render('pages/home', {user:req.user, projectList: req.user.projectList})
})
module.exports=router;