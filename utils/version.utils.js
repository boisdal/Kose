const Issue = require('../models/Issue.model')
const Version = require('../models/Version.model')
const populateIssueChildren = require('../utils/issue.utils')
const { compareVersions } = require('compare-versions')

const populatePreviousVersion = async function(version) {
    let versionList = await Version.find({projectId: version.projectId})
    versionList.sort((a, b) => compareVersions(a.versionNumber, b.versionNumber))
    previousVersionNumber = '__first__'
    for (let versionIterator of versionList) {
        if (versionIterator.versionNumber == version.versionNumber) {break}
        previousVersionNumber = versionIterator.versionNumber
    }
    version.previousVersionNumber = previousVersionNumber
}

const populateVersionIssueList = async function(version) {
    version.issueList = await Issue.find({projectId: version.projectId, versionId: version._id})
  if (version.issueList.length > 0) {
      for (let versionIssue of version.issueList) {
      await populateIssueChildren(versionIssue)
      }
      if (version.issueList.every((e) => e.status == 'ready')) {
      version.status = 'ready'
      } else if (version.issueList.every((e) => e.status == 'done')) {
      version.status = 'done'
      } else {
      version.status = 'doing'
      }
      version.issueReadySp = version.issueList.map(i=>i.chReadySp).reduce((a,b)=>a+b)
      version.issueDoingSp = version.issueList.map(i=>i.chDoingSp).reduce((a,b)=>a+b)
      version.issueDoneSp = version.issueList.map(i=>i.chDoneSp).reduce((a,b)=>a+b)
  } else {
      version.status = 'ready'
      version.issueReadySp = 0
      version.issueDoingSp = 0
      version.issueDoneSp = 0
  }
}

module.exports = { populatePreviousVersion, populateVersionIssueList }
