const Issue = require('../models/Issue.model')
const Version = require('../models/Version.model')

const READY_STATUSES = ['ready', 'suggested']
const DONE_STATUSES = ['done', 'released']

function rollupBucket(status) {
    if (READY_STATUSES.includes(status)) return 'ready'
    if (DONE_STATUSES.includes(status)) return 'done'
    return 'doing'
}

const populateIssueChildren = async function(issue) {
    issue.childrenIssueList = await Issue.find({ parentIssue: issue._id })
    let version = await Version.findById(issue.versionId)
    issue.versionNumber = version?.versionNumber
    for (let childIssue of issue.childrenIssueList) {
        await populateIssueChildren(childIssue)
    }
    if (issue.childrenIssueList.length != 0) {
        issue.estimation = issue.childrenIssueList.map(i=>i.estimation).reduce((a,b)=>a+b)
        if (issue.childrenIssueList.every((e) => rollupBucket(e.status) === 'ready')) {
        issue.status = 'ready'
        } else if (issue.childrenIssueList.every((e) => rollupBucket(e.status) === 'done')) {
        issue.status = 'done'
        } else {
        issue.status = 'doing'
        }
        issue.chReadySp = issue.childrenIssueList.map(i=>i.chReadySp).reduce((a,b)=>a+b)
        issue.chDoingSp = issue.childrenIssueList.map(i=>i.chDoingSp).reduce((a,b)=>a+b)
        issue.chDoneSp = issue.childrenIssueList.map(i=>i.chDoneSp).reduce((a,b)=>a+b)
    } else {
        const bucket = rollupBucket(issue.status)
        issue.chReadySp = bucket === 'ready' ? issue.estimation : 0
        issue.chDoingSp = bucket === 'doing' ? issue.estimation : 0
        issue.chDoneSp = bucket === 'done' ? issue.estimation : 0
    }
}

module.exports = populateIssueChildren
