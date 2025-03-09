const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Version = require('../models/Version.model')
const Issue = require('../models/Issue.model')
const { compareVersions } = require('compare-versions')
const { populatePreviousVersion, populateVersionIssueList } = require('../utils/version.utils')

router.get('/:projectKey/versions', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  let previousVersionNumber = '__first__'
  for (let version of versionList) {
    version.previousVersionNumber = previousVersionNumber
    previousVersionNumber = version.versionNumber
    await populateVersionIssueList(version)
  }
  res.render('pages/versionList.view.ejs', {user:req.user, project: project, versionList: versionList})
})

router.get('/:projectKey/versions/newform', ensureAuth, async (req, res) => {
  res.render('partials/version.part.ejs', {version: 'new', mode: 'edit'})
})

router.get('/:projectKey/versions/:versionNumber', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionNumber = req.params.versionNumber
  let version = await Version.findOne({projectId: project._id, versionNumber: versionNumber})
  res.render('pages/version.view.ejs', {user:req.user, project: project, version: version})
})

router.post('/:projectKey/versions/new', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let {newVersionNumber, versionTitle, versionDescription} = req.body
  if (versionTitle == '' || versionTitle == null) {versionTitle = 'Default Title'}
  let newVersion = {
    projectId: project._id,
    versionNumber : newVersionNumber,
    title: versionTitle,
    description: versionDescription,
    issueList: []
  }
  let version = await Version.create(newVersion)
  await populateVersionIssueList(version)
  await populatePreviousVersion(version)
  res.render('partials/version.part.ejs', {mode: 'list', version: version})
})

router.get('/:projectKey/versions/:versionNumber/geteditform', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionNumber = req.params.versionNumber
  let version = await Version.findOne({projectId: project._id, versionNumber: versionNumber})
  await populateVersionIssueList(version)
  await populatePreviousVersion(version)
  res.render('partials/version.part.ejs', {mode: 'edit', version: version})
})

router.post('/:projectKey/versions/:versionNumber/update', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionNumber = req.params.versionNumber
  let {newVersionNumber, versionTitle, versionDescription} = req.body
  if (versionTitle == '' || versionTitle == null) {versionTitle = 'Default Title'}
  let versionUpdateObject = {
    versionNumber : newVersionNumber,
    title: versionTitle,
    description: versionDescription
  }
  await Version.updateOne({projectId: project._id, versionNumber: versionNumber}, {$set: versionUpdateObject})
  let version = await Version.findOne({projectId: project._id, versionNumber: newVersionNumber})
  await populateVersionIssueList(version)
  await populatePreviousVersion(version)
  res.render('partials/version.part.ejs', {mode: 'list', version: version})
})

router.post('/:projectKey/versions/:versionNumber/delete', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionNumber = req.params.versionNumber
  await Version.deleteOne({projectId: project._id, versionNumber: versionNumber})
  res.json({status: 'ok'})
})

module.exports = router