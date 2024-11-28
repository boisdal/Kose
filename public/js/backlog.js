$('#backlogNavLink').addClass('active')

$('#newIssueButton').on('click', (e) => {
    $('.issue-text').addClass('parent-choice')
    $('#newIssueZone').show()
})