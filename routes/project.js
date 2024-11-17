const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project')

router.get('/:projectKey', ensureAuth , async (req, res) => {
  key = req.params.projectKey
  project = await Project.findOne({ key: key })
  res.render('pages/home', {userinfo:req.user})
})

module.exports=router;