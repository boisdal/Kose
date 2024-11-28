const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')
const Project = require('../models/Project')
const Issue = require('../models/Issue')
const populateIssueChildren = require('../utils/issueUtils')

router.get('/:projectKey/backlog', ensureAuth, async (req, res) => {
    let key = req.params.projectKey
    let project = await Project.findOne({key: key})
    // TODO: Traiter cas où clé projet inexistante
    // TODO: S'assurer des droits du user
    let rootIssueList = await Issue.find({projectId: project._id, parentIssue: null})
    for (let rootIssue of rootIssueList) {
      await populateIssueChildren(rootIssue)
    }
    res.render('pages/backlog', {user:req.user, project: project, rootIssueList: rootIssueList})
})

module.exports = router