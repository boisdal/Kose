const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project')

router.get('/:projectKey', ensureAuth , async (req, res) => {
  key = req.params.projectKey
  let project = await Project.findOne({ key: key })
  res.render('pages/project', {userinfo:req.user, project: project})
})

module.exports=router;