const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project')
const populateIssueChildren = require('../utils/issueUtils')

router.get('/:projectKey/issue', ensureAuth, async (req, res) => {
  let key = req.params.projectKey
  let project = await Project.findOne({key: key})
  res.render('pages/issueList', {user:req.user, project: project})
})

router.get('/:projectKey/issue/:issueKey', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  await populateIssueChildren(issue)
  res.render('pages/issue', {user:req.user, project: project, issue: issue})
})

module.exports = router