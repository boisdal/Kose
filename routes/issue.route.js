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

router.get('/:projectKey/issue/newform', ensureAuth, async (req, res) => {
  res.render('partials/newIssueForm.part.ejs')
})

router.get('/:projectKey/issue/:issueKey/parentform', ensureAuth, async (req, res) => {
  let project = await Project.findOne({key: req.params.projectKey})
  let issue = await Issue.findOne({projectId: project._id, key: req.params.issueKey})
  res.render('partials/newParent.part.ejs', {project: project, issue: issue})
})

router.get('/:projectKey/issue/:issueKey', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  await populateIssueChildren(issue)
  res.render('pages/issue.view.ejs', {user:req.user, project: project, issue: issue})
})

router.post('/:projectKey/issue/new', ensureAuth, async (req, res) => {
  //TODO: Ajouter vérifications des valeurs saisies / sanitize
  let project = await Project.findOne({key: req.params.projectKey})
  let newKey = 0
  let highestKey = (await Issue.find({ projectId: project._id }).limit(1).sort('-key').select('key').exec())[0]
  if (highestKey) {
    newKey = (highestKey.key) + 1
  }  
  let newIssueJson = {
    projectId: project._id,
    key: newKey,
    title: req.body.title,
    estimation: Number(req.body.estimation),
    issueType: req.body.type,
    status: req.body.status
  }
  if (req.body.parent != 'new') {
    let parent = await Issue.findOne({projectId: project._id, key: Number(req.body.parent)})
    newIssueJson.parentIssue = parent._id
  }
  await Issue.create(newIssueJson)
  let rootIssueKey = Number(req.body.rootIssueKey)
  if (rootIssueKey == -1) {
    let rootIssueList = await Issue.find({projectId: project._id, parentIssue: null})
      for (let rootIssue of rootIssueList) {
        await populateIssueChildren(rootIssue)
      }
    res.render('partials/backlog.part.ejs', {project: project, rootIssueList: rootIssueList})
  } else {
    let rootIssue = await Issue.findOne({projectId: project._id, key: rootIssueKey})
    await populateIssueChildren(rootIssue)
    res.render('partials/backlog.part.ejs', {project: project, rootIssueList: [rootIssue]})
  }
})

router.get('/:projectKey/issue/:issueKey/geteditform', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  res.render('partials/issueEditForm.part.ejs', {issue: issue})
})

router.post('/:projectKey/issue/:issueKey/edit', ensureAuth, async (req, res) => {
  let project = await Project.findOne({key: req.params.projectKey})
  let issueKey = req.params.issueKey
  let updatedIssueJson = {
    key: issueKey,
    title: req.body.title,
    estimation: Number(req.body.estimation),
    issueType: req.body.type,
    status: req.body.status
  }
  // TODO: si issue a des child, propager le changement de statut si fini. Voir comment gérer le en cours.
  await Issue.updateOne({projectId: project._id, key: Number(issueKey)}, {$set: updatedIssueJson})
  let rootIssueKey = Number(req.body.rootIssueKey)
  if (rootIssueKey == -1) {
    let rootIssueList = await Issue.find({projectId: project._id, parentIssue: null})
      for (let rootIssue of rootIssueList) {
        await populateIssueChildren(rootIssue)
      }
    res.render('partials/backlog.part.ejs', {project: project, rootIssueList: rootIssueList})
  } else {
    let rootIssue = await Issue.findOne({projectId: project._id, key: rootIssueKey})
    await populateIssueChildren(rootIssue)
    res.render('partials/backlog.part.ejs', {project: project, rootIssueList: [rootIssue]})
  }
})

module.exports = router