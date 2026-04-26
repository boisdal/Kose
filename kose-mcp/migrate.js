#!/usr/bin/env node
// One-time migration: backfills existing issues to the new schema and
// leaves projects without a working_dir flagged for the settings UI.
// Usage: node kose-mcp/migrate.js
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', 'config', 'config.env') })

const Issue = require('../models/Issue.model')
const Project = require('../models/Project.model')

const STATUS_MAP = {
  todo: 'ready',
  doing: 'in_progress',
  done: 'done',
}

async function migrateIssues() {
  const issues = await Issue.find({}).lean()
  let touched = 0
  for (const issue of issues) {
    const set = {}
    if (STATUS_MAP[issue.status]) set.status = STATUS_MAP[issue.status]
    if (issue.origin === undefined) set.origin = 'human'
    if (!Array.isArray(issue.activity_log)) set.activity_log = []
    if (!Array.isArray(issue.artifacts)) set.artifacts = []
    if (issue.priority === undefined) set.priority = 0
    if (issue.claimed_by === undefined) set.claimed_by = null
    if (issue.claimed_at === undefined) set.claimed_at = null
    if (issue.clarification === undefined) set.clarification = null
    if (issue.parent_suggestion_id === undefined) set.parent_suggestion_id = null
    if (Object.keys(set).length === 0) continue
    await Issue.updateOne({ _id: issue._id }, { $set: set })
    touched++
  }
  console.log(`Issues touched: ${touched} / ${issues.length}`)
}

async function migrateProjects() {
  const projects = await Project.find({}).lean()
  let touched = 0
  let needsConfig = 0
  for (const project of projects) {
    const set = {}
    if (project.working_dir === undefined) set.working_dir = null
    if (project.discord_category_id === undefined) set.discord_category_id = null
    if (project.agent_user_id === undefined) set.agent_user_id = null
    if (!project.default_branch) set.default_branch = 'main'
    if (project.test_command === undefined) set.test_command = null
    if (Object.keys(set).length) {
      await Project.updateOne({ _id: project._id }, { $set: set })
      touched++
    }
    if (!project.working_dir) needsConfig++
  }
  console.log(`Projects touched: ${touched} / ${projects.length}`)
  if (needsConfig) {
    console.log(`WARNING: ${needsConfig} project(s) have no working_dir set. The agent will refuse to operate on them until you configure it via the project settings page.`)
  }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  await migrateIssues()
  await migrateProjects()
  await mongoose.disconnect()
  console.log('Migration complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
