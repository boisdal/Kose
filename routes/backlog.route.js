const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Issue = require('../models/Issue.model')
const Version = require('../models/Version.model')
const { compareVersions } = require('compare-versions')
const populateIssueChildren = require('../utils/issue.utils')

router.get('/:projectKey/backlog', ensureAuth, async (req, res) => {
    let key = req.params.projectKey
    let project = await Project.findOne({key: key})
    const activeFilter = req.query.status || 'all'
    const filter = { projectId: project._id, parentIssue: null }
    if (activeFilter !== 'all') filter.status = activeFilter
    let rootIssueList = await Issue.find(filter)
    for (let rootIssue of rootIssueList) {
      await populateIssueChildren(rootIssue)
    }
    res.render('pages/backlog.view.ejs', {user:req.user, project: project, rootIssueList: rootIssueList, activeFilter})
})

router.get('/:projectKey/suggestions', ensureAuth, async (req, res) => {
  const project = await Project.findOne({key: req.params.projectKey})
  if (!project) return res.status(404).send('Project not found')
  const suggestions = await Issue.find({projectId: project._id, status: 'suggested'}).sort({priority: -1, createdAt: 1})
  res.render('pages/suggestions.view.ejs', {user: req.user, project, suggestions})
})

router.post('/:projectKey/suggestions/:issueKey/approve', ensureAuth, async (req, res) => {
  const project = await Project.findOne({key: req.params.projectKey})
  if (!project) return res.status(404).send('Project not found')
  const issue = await Issue.findOne({projectId: project._id, key: Number(req.params.issueKey)})
  if (!issue || issue.status !== 'suggested') return res.status(400).send('Not a suggestion')
  if (req.body.title) issue.title = req.body.title
  if (req.body.description) issue.description = req.body.description
  if (req.body.priority !== undefined && req.body.priority !== '') issue.priority = Number(req.body.priority)
  issue.status = 'ready'
  issue.origin = 'human'
  issue.parent_suggestion_id = issue._id
  issue.activity_log.push({at: new Date(), author: req.user._id, kind: 'system', body: 'Suggestion approved.'})
  await issue.save()
  res.redirect(`/project/${req.params.projectKey}/suggestions`)
})

router.post('/:projectKey/suggestions/:issueKey/reject', ensureAuth, async (req, res) => {
  const project = await Project.findOne({key: req.params.projectKey})
  if (!project) return res.status(404).send('Project not found')
  const issue = await Issue.findOne({projectId: project._id, key: Number(req.params.issueKey)})
  if (!issue || issue.status !== 'suggested') return res.status(400).send('Not a suggestion')
  const reason = (req.body.reason || '').trim() || 'no reason given'
  issue.status = 'done'
  issue.activity_log.push({at: new Date(), author: req.user._id, kind: 'system', body: `Suggestion rejected: ${reason}`})
  await issue.save()
  res.redirect(`/project/${req.params.projectKey}/suggestions`)
})

router.get('/:projectKey/settings', ensureAuth, async (req, res) => {
  const project = await Project.findOne({key: req.params.projectKey})
  if (!project) return res.status(404).send('Project not found')
  const User = require('../models/User.model')
  const userList = await User.find({}).select('_id username displayName')
  res.render('pages/projectSettings.view.ejs', {user: req.user, project, userList})
})

router.post('/:projectKey/settings', ensureAuth, async (req, res) => {
  const project = await Project.findOne({key: req.params.projectKey})
  if (!project) return res.status(404).send('Project not found')
  const {working_dir, default_branch, test_command, agent_user_id, discord_category_id} = req.body
  project.working_dir = working_dir || null
  project.default_branch = default_branch || 'main'
  project.test_command = test_command || null
  project.agent_user_id = agent_user_id || null
  project.discord_category_id = discord_category_id || null
  await project.save()
  res.redirect(`/project/${req.params.projectKey}/settings`)
})

router.get('/:projectKey/issue/newform', ensureAuth, async (req, res) => {
  let projectKey = req.params.projectKey
  let project = await Project.findOne({key: projectKey})
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  res.render('partials/newIssueForm.part.ejs', {versionList: versionList})
})

router.get('/:projectKey/issue/:issueKey/parentform', ensureAuth, async (req, res) => {
  let project = await Project.findOne({key: req.params.projectKey})
  let issue = await Issue.findOne({projectId: project._id, key: req.params.issueKey})
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  await populateIssueChildren(issue)
  res.render('partials/newParent.part.ejs', {project: project, issue: issue, versionList: versionList})
})

router.post('/:projectKey/issue/new', ensureAuth, async (req, res) => {
  //TODO: Ajouter vérifications des valeurs saisies / sanitize
  let project = await Project.findOne({key: req.params.projectKey})
  let newKey = 0
  let highestKey = (await Issue.find({ projectId: project._id }).limit(1).sort('-key').select('key').exec())[0]
  if (highestKey) {
    newKey = (highestKey.key) + 1
  }
  let issueVersion = req.body.version
  if (issueVersion == 'none') {issueVersion = null}
  let newIssueJson = {
    projectId: project._id,
    key: newKey,
    title: req.body.title,
    versionId: issueVersion,
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
  let versionList = await Version.find({projectId: project._id})
  versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: issueKey})
  await populateIssueChildren(issue)
  res.render('partials/editIssueForm.part.ejs', {issue: issue, versionList: versionList})
})

router.post('/:projectKey/issue/:issueKey/edit', ensureAuth, async (req, res) => {
  let project = await Project.findOne({key: req.params.projectKey})
  let issueKey = req.params.issueKey
  let issueVersion = req.body.version
  if (issueVersion == 'none') {issueVersion = null}
  let updatedIssueJson = {
    key: issueKey,
    title: req.body.title,
    versionId: issueVersion,
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

router.post('/:projectKey/issue/:issueKey/delete', ensureAuth, async (req, res) => {
  let project = await Project.findOne({key: req.params.projectKey})
  let issueKey = req.params.issueKey
  let issue = await Issue.findOne({projectId: project._id, key: Number(issueKey)})
  await Issue.deleteOne({projectId: project._id, key: Number(issueKey)})
  await Issue.updateMany({projectId: project._id, parentIssue: issue._id}, {parentIssue: issue.parentIssue})
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

router.post('/:projectKey/issue/:issueKey/adopt', ensureAuth, async (req, res) => {
  let project = await Project.findOne({key: req.params.projectKey})
  let issueKey = req.params.issueKey
  let newParentIssue = await Issue.findOne({projectId: project._id, key: Number(req.body.newParentKey)})
  await Issue.updateOne({projectId: project._id, key: Number(issueKey)}, {$set: {parentIssue: newParentIssue?._id}})
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