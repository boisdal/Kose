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
  let projectList = await Project.find(criteria)
  // TODO: traiter absence de projets avec page spéciale
  // TODO: changer barre de nav pour mettre icone projet et selecteur projet
  res.render('pages/home', {userinfo:req.user, projectList: projectList})
})
module.exports=router;