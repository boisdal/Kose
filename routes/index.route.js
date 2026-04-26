const router = require('express').Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const Issue = require('../models/Issue.model')

function timeAgo(date) {
  if (!date) return 'no activity'
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

router.get('/', ensureGuest, (req, res) => {
  res.render('pages/login.view.ejs', { error: null })
})

router.get('/home', ensureAuth, async (req, res) => {
  const projectData = await Promise.all(
    req.user.projectList.map(async (project) => {
      const [latestIssue, issues] = await Promise.all([
        Issue.findOne({ projectId: project._id }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
        Issue.find({ projectId: project._id }).select('status estimation').lean(),
      ])
      const lastActivity = latestIssue ? latestIssue.updatedAt : null
      const stats = { todo: { count: 0, sp: 0 }, doing: { count: 0, sp: 0 }, done: { count: 0, sp: 0 } }
      for (const issue of issues) {
        const s = issue.status
        if (stats[s]) { stats[s].count++; stats[s].sp += issue.estimation || 0 }
      }
      return { project, stats, lastActivity, lastActivityStr: timeAgo(lastActivity) }
    })
  )
  projectData.sort((a, b) => {
    if (!a.lastActivity) return 1
    if (!b.lastActivity) return -1
    return b.lastActivity - a.lastActivity
  })
  res.render('pages/home.view.ejs', { user: req.user, projectData })
})

module.exports = router
