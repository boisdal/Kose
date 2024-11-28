const Project = require('../models/Project')

module.exports = {
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
