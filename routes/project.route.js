const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project.model')
const Issue = require('../models/Issue.model')
const populateIssueChildren = require('../utils/issue.utils')

router.get('/:projectKey', ensureAuth, async (req, res) => {
  let key = req.params.projectKey
  let project = await Project.findOne({key: key})
  // TODO: Traiter cas où clé projet inexistante
  // TODO: S'assurer des droits du user
  let rootIssueList = await Issue.find({projectId: project._id, parentIssue: null})
  for (let rootIssue of rootIssueList) {
    await populateIssueChildren(rootIssue)
  }
  res.render('pages/project.view.ejs', {user:req.user, project: project, rootIssueList: rootIssueList})
})



module.exports=router;