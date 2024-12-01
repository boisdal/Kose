const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Issue = require('../models/Issue.model')
const populateIssueChildren = require('../utils/issue.utils')

router.get('/:projectKey/issue', ensureAuth, async (req, res) => {
  let key = req.params.projectKey
  let project = await Project.findOne({key: key})
  res.render('pages/issueList.view.ejs', {user:req.user, project: project})
})

router.get('/:projectKey/issue/:issueKey(\d*)', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  await populateIssueChildren(issue)
  res.render('pages/issue.view.ejs', {user:req.user, project: project, issue: issue})
})

router.get('/:projectKey/issue/:issueKey/parentform', ensureAuth, async (req, res) => {
  res.render('pages/wip.view.ejs')
})

router.get('/:projectKey/issue/newform', ensureAuth, async (req, res) => {
  res.render('partials/issueForm.part.ejs')
})

router.post('/:projectKey/issue/new', ensureAuth, async (req, res) => {
  // console.log(req.body)
  // console.log(req.params)
  //TODO: Ajouter vérifications des valeurs saisies / sanitize
  let project = await Project.findOne({key: req.params.projectKey})
  let parent = await Issue.findOne({projectId: project._id, key: Number(req.body.parent)})
  let newKey = ((await Issue.find({ projectId: project._id }).limit(1).sort('-key').select('key').exec())[0].key) + 1
  let newIssueJson = {
    projectId: project._id,
    key: newKey,
    parentIssue: parent._id,
    title: req.body.title,
    estimation: Number(req.body.estimation),
    issueType: req.body.type,
    status: req.body.status
  }
  await Issue.create(newIssueJson)
  let rootIssueList = await Issue.find({projectId: project._id, parentIssue: null})
    for (let rootIssue of rootIssueList) {
      await populateIssueChildren(rootIssue)
    }
    res.render('partials/backlog.part.ejs', {project: project, rootIssueList: rootIssueList})
})

module.exports = router