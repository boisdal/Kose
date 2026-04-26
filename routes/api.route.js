const router = require('express').Router()
const { ensureApiAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Issue = require('../models/Issue.model')
const Version = require('../models/Version.model')
const { compareVersions } = require('compare-versions')
const populateIssueChildren = require('../utils/issue.utils')
const { populateVersionIssueList } = require('../utils/version.utils')

// ── Projects ──────────────────────────────────────────────────────────────────

router.get('/projects', ensureApiAuth, async (req, res) => {
  try {
    res.json({ projects: req.user.projectList })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/projects/:projectKey', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json({ project })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Issues ────────────────────────────────────────────────────────────────────

router.get('/projects/:projectKey/issues', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const filter = { projectId: project._id }
    if (req.query.status) filter.status = req.query.status
    if (req.query.versionNumber) {
      const version = await Version.findOne({ projectId: project._id, versionNumber: req.query.versionNumber })
      if (version) filter.versionId = version._id
    }
    if (req.query.parentIssueKey !== undefined) {
      if (req.query.parentIssueKey === 'null' || req.query.parentIssueKey === '') {
        filter.parentIssue = null
      } else {
        const parent = await Issue.findOne({ projectId: project._id, key: Number(req.query.parentIssueKey) })
        if (parent) filter.parentIssue = parent._id
      }
    }

    const issues = await Issue.find(filter)
    res.json({ issues })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/projects/:projectKey/issues/:issueKey', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const issue = await Issue.findOne({ projectId: project._id, key: Number(req.params.issueKey) })
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    await populateIssueChildren(issue)
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/projects/:projectKey/issues', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const highestKeyDoc = (await Issue.find({ projectId: project._id }).limit(1).sort('-key').select('key').exec())[0]
    const newKey = highestKeyDoc ? highestKeyDoc.key + 1 : 0

    const { title, issueType, status, estimation, versionNumber, parentIssueKey, description } = req.body

    let versionId = null
    if (versionNumber && versionNumber !== 'none') {
      const version = await Version.findOne({ projectId: project._id, versionNumber })
      if (version) versionId = version._id
    }

    const newIssueData = {
      projectId: project._id,
      key: newKey,
      title,
      issueType: issueType || 'task',
      status: status || 'todo',
      estimation: Number(estimation) || 0,
      versionId,
      description,
    }

    if (parentIssueKey !== undefined && parentIssueKey !== null) {
      const parent = await Issue.findOne({ projectId: project._id, key: Number(parentIssueKey) })
      if (parent) newIssueData.parentIssue = parent._id
    }

    const issue = await Issue.create(newIssueData)
    res.status(201).json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/projects/:projectKey/issues/:issueKey', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const issueKey = Number(req.params.issueKey)

    const { title, issueType, status, estimation, versionNumber, description } = req.body
    const updateObj = {}
    if (title !== undefined) updateObj.title = title
    if (issueType !== undefined) updateObj.issueType = issueType
    if (status !== undefined) updateObj.status = status
    if (estimation !== undefined) updateObj.estimation = Number(estimation)
    if (description !== undefined) updateObj.description = description
    if (versionNumber !== undefined) {
      if (versionNumber === null || versionNumber === 'none') {
        updateObj.versionId = null
      } else {
        const version = await Version.findOne({ projectId: project._id, versionNumber })
        if (version) updateObj.versionId = version._id
      }
    }

    await Issue.updateOne({ projectId: project._id, key: issueKey }, { $set: updateObj })
    const issue = await Issue.findOne({ projectId: project._id, key: issueKey })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/projects/:projectKey/issues/:issueKey', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const issueKey = Number(req.params.issueKey)
    const issue = await Issue.findOne({ projectId: project._id, key: issueKey })
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    await Issue.deleteOne({ projectId: project._id, key: issueKey })
    // Re-parent children to the deleted issue's parent
    await Issue.updateMany({ projectId: project._id, parentIssue: issue._id }, { parentIssue: issue.parentIssue })
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/projects/:projectKey/issues/:issueKey/parent', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const issueKey = Number(req.params.issueKey)

    let newParentId = null
    const { parentIssueKey } = req.body
    if (parentIssueKey !== null && parentIssueKey !== undefined) {
      const parent = await Issue.findOne({ projectId: project._id, key: Number(parentIssueKey) })
      if (parent) newParentId = parent._id
    }

    await Issue.updateOne({ projectId: project._id, key: issueKey }, { $set: { parentIssue: newParentId } })
    const issue = await Issue.findOne({ projectId: project._id, key: issueKey })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Versions ──────────────────────────────────────────────────────────────────

router.get('/projects/:projectKey/versions', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const versions = await Version.find({ projectId: project._id })
    versions.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
    for (const version of versions) {
      await populateVersionIssueList(version)
    }
    res.json({ versions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/projects/:projectKey/versions/:versionNumber', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const version = await Version.findOne({ projectId: project._id, versionNumber: req.params.versionNumber })
    if (!version) return res.status(404).json({ error: 'Version not found' })
    await populateVersionIssueList(version)
    res.json({ version })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/projects/:projectKey/versions', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const { versionNumber, title, description } = req.body
    const version = await Version.create({
      projectId: project._id,
      versionNumber,
      title: title || 'Default Title',
      description,
      issueList: [],
    })
    await populateVersionIssueList(version)
    res.status(201).json({ version })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/projects/:projectKey/versions/:versionNumber', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const { newVersionNumber, title, description } = req.body
    const updateObj = {}
    if (newVersionNumber !== undefined) updateObj.versionNumber = newVersionNumber
    if (title !== undefined) updateObj.title = title || 'Default Title'
    if (description !== undefined) updateObj.description = description
    await Version.updateOne({ projectId: project._id, versionNumber: req.params.versionNumber }, { $set: updateObj })
    const version = await Version.findOne({ projectId: project._id, versionNumber: newVersionNumber || req.params.versionNumber })
    await populateVersionIssueList(version)
    res.json({ version })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/projects/:projectKey/versions/:versionNumber', ensureApiAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ key: req.params.projectKey })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    await Version.deleteOne({ projectId: project._id, versionNumber: req.params.versionNumber })
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
