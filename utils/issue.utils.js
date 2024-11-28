const Issue = require('../models/Issue.model')

const populateIssueChildren = async function(issue) {
    issue.childrenIssueList = await Issue.find({ parentIssue: issue._id })
    for (let childIssue of issue.childrenIssueList) {
        await populateIssueChildren(childIssue)
    }
    if (issue.childrenIssueList.length != 0) {
        issue.estimation = issue.childrenIssueList.map(i=>i.estimation).reduce((a,b)=>a+b)
        if (issue.childrenIssueList.every((e) => e.status == 'todo')) {
        issue.status = 'todo'
        } else if (issue.childrenIssueList.every((e) => e.status == 'done')) {
        issue.status = 'done'
        } else {
        issue.status = 'doing'
        }
        issue.chTodoSp = issue.childrenIssueList.map(i=>i.chTodoSp).reduce((a,b)=>a+b)
        issue.chDoingSp = issue.childrenIssueList.map(i=>i.chDoingSp).reduce((a,b)=>a+b)
        issue.chDoneSp = issue.childrenIssueList.map(i=>i.chDoneSp).reduce((a,b)=>a+b)
    } else {
        if (issue.status == 'todo') {
        issue.chTodoSp = issue.estimation
        issue.chDoingSp = 0
        issue.chDoneSp = 0
        }
        if (issue.status == 'doing') {
        issue.chTodoSp = 0
        issue.chDoingSp = issue.estimation
        issue.chDoneSp = 0
        }
        if (issue.status == 'done') {
        issue.chTodoSp = 0
        issue.chDoingSp = 0
        issue.chDoneSp = issue.estimation
        }
    }
}

module.exports = populateIssueChildren