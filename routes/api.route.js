const router = require('express').Router()
const mongoose = require('mongoose')
const { ensureApiAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Issue = require('../models/Issue.model')
const Version = require('../models/Version.model')
const Document = require('../models/Document.model')
const Release = require('../models/Release.model')
const { compareVersions } = require('compare-versions')
const populateIssueChildren = require('../utils/issue.utils')
const { populateVersionIssueList } = require('../utils/version.utils')

function userCanAccessProject(user, project) {
  if (!project) return false
  if (user.accesses && user.accesses.includes('*')) return true
  return user.accesses && user.accesses.includes(project.key)
}

async function resolveProjectByKey(req, res) {
  const project = await Project.findOne({ key: req.params.projectKey })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return null }
  if (!userCanAccessProject(req.user, project)) { res.status(403).json({ error: 'Forbidden' }); return null }
  return project
}

async function resolveIssueById(req, res) {
  if (!mongoose.isValidObjectId(req.params.issueId)) {
    res.status(400).json({ error: 'Invalid issue id' }); return null
  }
  const issue = await Issue.findById(req.params.issueId)
  if (!issue) { res.status(404).json({ error: 'Issue not found' }); return null }
  const project = await Project.findById(issue.projectId)
  if (!userCanAccessProject(req.user, project)) { res.status(403).json({ error: 'Forbidden' }); return null }
  return { issue, project }
}

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

    const { title, issueType, status, estimation, priority, versionNumber, parentIssueKey, description } = req.body

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
      status: status || 'ready',
      estimation: Number(estimation) || 0,
      priority: priority !== undefined ? Number(priority) : 0,
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

    const { title, issueType, status, estimation, priority, versionNumber, description } = req.body
    const updateObj = {}
    if (title !== undefined) updateObj.title = title
    if (issueType !== undefined) updateObj.issueType = issueType
    if (status !== undefined) updateObj.status = status
    if (estimation !== undefined) updateObj.estimation = Number(estimation)
    if (priority !== undefined) updateObj.priority = Number(priority)
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

// ── Agent task lifecycle ──────────────────────────────────────────────────────

router.post('/projects/:projectKey/issues/claim', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const agentUserId = req.body.agent_user_id || req.user._id
    if (!mongoose.isValidObjectId(agentUserId)) {
      return res.status(400).json({ error: 'Invalid agent_user_id' })
    }
    const issue = await Issue.findOneAndUpdate(
      { projectId: project._id, status: 'ready' },
      { $set: { status: 'in_progress', claimed_by: agentUserId, claimed_at: new Date() } },
      { sort: { priority: -1, createdAt: 1 }, returnDocument: 'after', new: true }
    )
    res.json({ issue: issue || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/issues/:issueId/complete', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    const { summary, artifacts } = req.body
    const update = { $set: { status: 'done' } }
    update.$push = {
      activity_log: {
        at: new Date(), author: req.user._id, kind: 'system',
        body: summary || 'Task completed.',
      },
    }
    if (Array.isArray(artifacts) && artifacts.length) {
      update.$push.artifacts = { $each: artifacts }
    }
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, update, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/issues/:issueId/release', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    const { reason } = req.body
    const blockedHints = /block|wait|stuck|cannot|unable/i
    const newStatus = reason && blockedHints.test(reason) ? 'blocked' : 'ready'
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $set: { status: newStatus, claimed_by: null, claimed_at: null },
      $push: { activity_log: { at: new Date(), author: req.user._id, kind: 'system', body: `Released task: ${reason || 'no reason given'}` } },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/issues/:issueId/comment', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    const { body, kind } = req.body
    if (!body) return res.status(400).json({ error: 'body is required' })
    const entryKind = ['comment', 'progress', 'system'].includes(kind) ? kind : 'comment'
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $push: { activity_log: { at: new Date(), author: req.user._id, kind: entryKind, body } },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Suggestions ───────────────────────────────────────────────────────────────

router.post('/projects/:projectKey/suggestions', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const { title, body, priority, rationale } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })
    const highest = (await Issue.find({ projectId: project._id }).limit(1).sort('-key').select('key').exec())[0]
    const newKey = highest ? highest.key + 1 : 0
    const description = rationale ? `${body || ''}\n\n---\n_Rationale:_ ${rationale}` : (body || '')
    const issue = await Issue.create({
      projectId: project._id,
      key: newKey,
      title,
      description,
      issueType: 'task',
      status: 'suggested',
      priority: priority || 0,
      origin: 'agent_suggestion',
      activity_log: [{ at: new Date(), author: req.user._id, kind: 'system', body: 'Suggested by agent.' }],
    })
    res.status(201).json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/projects/:projectKey/suggestions', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const issues = await Issue.find({ projectId: project._id, status: 'suggested' }).sort({ priority: -1, createdAt: 1 })
    res.json({ issues })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/issues/:issueId/approve', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    if (ctx.issue.status !== 'suggested') {
      return res.status(400).json({ error: 'Issue is not a suggestion' })
    }
    const edits = req.body.edits || {}
    const set = { status: 'ready', origin: 'human', parent_suggestion_id: ctx.issue._id }
    if (edits.title !== undefined) set.title = edits.title
    if (edits.body !== undefined) set.description = edits.body
    if (edits.priority !== undefined) set.priority = edits.priority
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $set: set,
      $push: { activity_log: { at: new Date(), author: req.user._id, kind: 'system', body: 'Suggestion approved.' } },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/issues/:issueId/reject', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    if (ctx.issue.status !== 'suggested') {
      return res.status(400).json({ error: 'Issue is not a suggestion' })
    }
    const { reason } = req.body
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $set: { status: 'done' },
      $push: { activity_log: { at: new Date(), author: req.user._id, kind: 'system', body: `Suggestion rejected: ${reason || 'no reason given'}` } },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Clarifications ────────────────────────────────────────────────────────────

router.post('/issues/:issueId/clarify', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    const { question } = req.body
    if (!question) return res.status(400).json({ error: 'question is required' })
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $set: {
        status: 'blocked',
        clarification: { question, asked_at: new Date(), channel_id: null, answered: false, answer: null, answered_at: null },
      },
      $push: { activity_log: { at: new Date(), author: req.user._id, kind: 'system', body: `Clarification requested: ${question}` } },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/issues/:issueId/clarify/resolve', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    const { answer } = req.body
    if (!answer) return res.status(400).json({ error: 'answer is required' })
    if (!ctx.issue.clarification) return res.status(400).json({ error: 'No pending clarification' })
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $set: {
        status: 'ready',
        'clarification.answer': answer,
        'clarification.answered': true,
        'clarification.answered_at': new Date(),
      },
      $push: { activity_log: { at: new Date(), author: req.user._id, kind: 'system', body: `Clarification answered: ${answer}` } },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/issues/:issueId/clarification/channel', ensureApiAuth, async (req, res) => {
  try {
    const ctx = await resolveIssueById(req, res)
    if (!ctx) return
    const { channel_id } = req.body
    const issue = await Issue.findByIdAndUpdate(ctx.issue._id, {
      $set: { 'clarification.channel_id': channel_id },
    }, { new: true })
    res.json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Documents ─────────────────────────────────────────────────────────────────

router.get('/projects/:projectKey/docs', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const docs = await Document.find({ project_id: project._id }).select('slug title version updated_at').sort({ slug: 1 })
    res.json({ docs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/projects/:projectKey/docs/:slug', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const doc = await Document.findOne({ project_id: project._id, slug: req.params.slug })
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json({ doc })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/projects/:projectKey/docs/:slug', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const { title, body } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })
    const existing = await Document.findOne({ project_id: project._id, slug: req.params.slug })
    if (existing) {
      existing.title = title
      existing.body = body || ''
      existing.version += 1
      existing.updated_at = new Date()
      existing.updated_by = req.user._id
      await existing.save()
      return res.json({ doc: existing })
    }
    const doc = await Document.create({
      project_id: project._id,
      slug: req.params.slug,
      title,
      body: body || '',
      version: 1,
      updated_at: new Date(),
      updated_by: req.user._id,
    })
    res.status(201).json({ doc })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Releases ──────────────────────────────────────────────────────────────────

router.post('/versions/:versionId/release', ensureApiAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.versionId)) {
      return res.status(400).json({ error: 'Invalid version id' })
    }
    const version = await Version.findById(req.params.versionId)
    if (!version) return res.status(404).json({ error: 'Version not found' })
    const project = await Project.findById(version.projectId)
    if (!userCanAccessProject(req.user, project)) return res.status(403).json({ error: 'Forbidden' })
    const { notes, tag, commits } = req.body
    const release = await Release.create({
      version_id: version._id,
      notes: notes || '',
      tag: tag || null,
      commits: Array.isArray(commits) ? commits : [],
      published_at: new Date(),
    })
    await Issue.updateMany(
      { projectId: project._id, versionId: version._id, status: 'done' },
      { $set: { status: 'released' } }
    )
    res.status(201).json({ release })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/versions/:versionId/release-notes', ensureApiAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.versionId)) {
      return res.status(400).json({ error: 'Invalid version id' })
    }
    const version = await Version.findById(req.params.versionId)
    if (!version) return res.status(404).json({ error: 'Version not found' })
    const project = await Project.findById(version.projectId)
    if (!userCanAccessProject(req.user, project)) return res.status(403).json({ error: 'Forbidden' })
    const issues = await Issue.find({
      projectId: project._id,
      versionId: version._id,
      status: { $in: ['done', 'released'] },
    }).sort({ issueType: 1, key: 1 })
    const groups = {}
    for (const i of issues) {
      const t = i.issueType || 'task'
      if (!groups[t]) groups[t] = []
      groups[t].push(i)
    }
    const lines = [`# ${version.title || version.versionNumber}`, '']
    for (const t of Object.keys(groups).sort()) {
      lines.push(`## ${t.charAt(0).toUpperCase() + t.slice(1)}`)
      for (const i of groups[t]) lines.push(`- ${i.title} (#${i.key})`)
      lines.push('')
    }
    res.json({ notes: lines.join('\n') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Project context (planner convenience) ─────────────────────────────────────

router.get('/projects/:projectKey/context', ensureApiAuth, async (req, res) => {
  try {
    const project = await resolveProjectByKey(req, res)
    if (!project) return
    const issues = await Issue.find({ projectId: project._id }).select('key title status priority claimed_by clarification updatedAt origin').lean()
    const summary = { ready: 0, in_progress: 0, blocked: 0, suggested: 0, done: 0, released: 0, doing: 0 }
    for (const i of issues) if (summary[i.status] !== undefined) summary[i.status]++
    const recent = await Issue.find({ projectId: project._id })
      .sort({ updatedAt: -1 }).limit(10)
      .select('key title status updatedAt').lean()
    const openClarifications = issues
      .filter(i => i.clarification && !i.clarification.answered)
      .map(i => ({ issue_id: i._id, key: i.key, title: i.title, question: i.clarification.question, channel_id: i.clarification.channel_id }))
    res.json({
      project,
      open_issues_summary: summary,
      recent_activity: recent,
      open_clarifications: openClarifications,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
