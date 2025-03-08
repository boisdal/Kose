const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Version = require('../models/Version.model')
const Issue = require('../models/Issue.model')
const { compareVersions } = require('compare-versions')
const populateIssueChildren = require('../utils/issue.utils')

router.get('/:projectKey/versions', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  let previousVersionNumber = '__first__'
  for (let version of versionList) {
    version.previousVersionNumber = previousVersionNumber
    previousVersionNumber = version.versionNumber
    version.issueList = await Issue.find({projectId: version.projectId, versionId: version._id})
    if (version.issueList.length > 0) {
        for (let versionIssue of version.issueList) {
        await populateIssueChildren(versionIssue)
        }
        if (version.issueList.every((e) => e.status == 'todo')) {
        version.status = 'todo'
        } else if (version.issueList.every((e) => e.status == 'done')) {
        version.status = 'done'
        } else {
        version.status = 'doing'
        }
        version.issueTodoSp = version.issueList.map(i=>i.chTodoSp).reduce((a,b)=>a+b)
        version.issueDoingSp = version.issueList.map(i=>i.chDoingSp).reduce((a,b)=>a+b)
        version.issueDoneSp = version.issueList.map(i=>i.chDoneSp).reduce((a,b)=>a+b)
    } else {
        version.status = 'todo'
        version.issueTodoSp = 0
        version.issueDoingSp = 0
        version.issueDoneSp = 0
    }
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
  version.issueList = await Issue.find({projectId: version.projectId, versionId: version._id})
  if (version.issueList.length > 0) {
      for (let versionIssue of version.issueList) {
      await populateIssueChildren(versionIssue)
      }
      if (version.issueList.every((e) => e.status == 'todo')) {
      version.status = 'todo'
      } else if (version.issueList.every((e) => e.status == 'done')) {
      version.status = 'done'
      } else {
      version.status = 'doing'
      }
      version.issueTodoSp = version.issueList.map(i=>i.chTodoSp).reduce((a,b)=>a+b)
      version.issueDoingSp = version.issueList.map(i=>i.chDoingSp).reduce((a,b)=>a+b)
      version.issueDoneSp = version.issueList.map(i=>i.chDoneSp).reduce((a,b)=>a+b)
  } else {
      version.status = 'todo'
      version.issueTodoSp = 0
      version.issueDoingSp = 0
      version.issueDoneSp = 0
  }
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  previousVersionNumber = '__first__'
  for (let versionIterator of versionList) {
    if (versionIterator.versionNumber == version.versionNumber) {break}
    previousVersionNumber = versionIterator.versionNumber
  }
  version.previousVersionNumber = previousVersionNumber
  res.render('partials/version.part.ejs', {mode: 'list', version: version})
})

module.exports = router