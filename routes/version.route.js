const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')

router.get('/:projectKey/version', ensureAuth, async (req, res) => {
  let key = req.params.projectKey
  let project = await Project.findOne({key: key})
  res.render('pages/version.view.ejs', {user:req.user, project: project})
})

module.exports = router