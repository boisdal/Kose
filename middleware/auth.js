const Project = require('../models/Project.model')
const User = require('../models/User.model')

module.exports = {
  ensureApiAuth: async function (req, res, next) {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing API key' })
    }
    const apiKey = authHeader.slice(7)
    const user = await User.findOne({ apiKey })
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' })
    }
    const accesses = user.accesses
    const criteria = accesses.includes('*') ? {} : { key: { $in: accesses } }
    const projectList = await Project.find(criteria)
    user.set({ projectList })
    req.user = user
    return next()
  },
  ensureAuth: async function (req, res, next) {
    if (req.isAuthenticated()) {
      accesses = req.user.accesses
      if (accesses.includes('*')) {
        criteria = {}
      } else {
        criteria = { key: { $in: accesses } }
      }
      let projectList = await Project.find(criteria)
      req.user.set({projectList: projectList})
      return next()
    } else {
      res.redirect('/')
    }
  },
  ensureGuest: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    } else {
      res.redirect('/home');
    }
  },
}
