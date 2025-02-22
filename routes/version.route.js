const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Version = require('../models/Version.model')
const { compareVersions } = require('compare-versions')

router.get('/:projectKey/versions', ensureAuth, async (req, res) => {
  let projetctKey = req.params.projectKey
  let project = await Project.findOne({key: projetctKey})
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  res.render('pages/versionList.view.ejs', {user:req.user, project: project, versionList: versionList})
})

router.get('/:projectKey/versions/:versionNumber', ensureAuth, async (req, res) => {
  let projetctKey = req.params.projectKey
  let project = await Project.findOne({key: projetctKey})
  let versionNumber = req.params.versionNumber
  let version = await Version.findOne({projectId: project._id, versionNumber: versionNumber})
  res.render('pages/version.view.ejs', {user:req.user, project: project, version: version})
})

module.exports = router