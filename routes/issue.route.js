const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Issue = require('../models/Issue.model')
const Version = require('../models/Version.model')
const { compareVersions } = require('compare-versions')
const populateIssueChildren = require('../utils/issue.utils')

router.get('/:projectKey/issue', ensureAuth, async (req, res) => {
  let key = req.params.projectKey
  let project = await Project.findOne({key: key})
  res.render('pages/issueList.view.ejs', {user:req.user, project: project})
})

router.get('/:projectKey/issue/:issueKey', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  await populateIssueChildren(issue)
  res.render('pages/issue.view.ejs', {user:req.user, project: project, issue: issue})
})

router.get('/:projectKey/issue/:issueKey/getfieldform/:fieldName', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  let fieldName = req.params.fieldName
  switch (fieldName) {
    case 'status':
      res.render('partials/statusIssueForm.part.ejs', {issue: issue})
      break
    case 'estimation':
      res.render('partials/estimationIssueForm.part.ejs', {issue: issue})
      break
    case 'versionId':
      res.render('partials/versionIssueForm.part.ejs', {issue: issue, versionList: versionList})
      break
    case 'description':
      res.render('partials/descriptionIssueForm.part.ejs', {issue: issue})
      break
  }
})

router.post('/:projectKey/issue/:issueKey/editfield/:fieldName', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let issueKey = req.params.issueKey
  let fieldName = req.params.fieldName
  let fieldValue = req.body.value
  let setJsonObject = {}
  if (fieldName == 'versionId' && fieldValue == 'none') {fieldValue = null}
  setJsonObject[fieldName] = fieldValue
  await Issue.updateOne({projectId: project._id, key: issueKey}, {$set: setJsonObject})
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  await populateIssueChildren(issue)
  switch (fieldName) {
    case 'status':
      res.render('partials/statusIssue.part.ejs', {issue: issue})
      break
    case 'estimation':
      res.render('partials/estimationIssue.part.ejs', {issue: issue})
      break
    case 'versionId':
      res.render('partials/versionIssue.part.ejs', {issue: issue})
      break
    case 'description':
      res.render('partials/descriptionIssue.part.ejs', {issue: issue})
      break
  }
})

module.exports = router