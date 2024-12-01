$('#backlogNavLink').addClass('active')

const bindAddButton = function() {
    $('#newIssueButton').on('click', () => {
        $('.issue-text').addClass('parent-choice')
        $('#newIssueZone').addClass('parent-choice')
        $('#newIssueZone').show()
        $('.parent-choice').on('click', (e) => {
            let parent = $(e.target).closest('div')
            let parentKey = parent.attr('data-issue-key')
            $('.parent-choice').off('click')
            $('.parent-choice').removeClass('parent-choice')
            $('#newIssueZone').hide()
            let potentialAddingZone = parent.parent().closest('.issue-root')
            if ((potentialAddingZone.find('.issue-root').length > 0)) {
                $.get(`/project/kose/issue/newform`, function (data) {
                    let form = $(data)
                    potentialAddingZone.children('.issue-root').last().after(form)
                    updateInputSize()
                    form.find('.send-button').on('click', (e) => {
                        bindSendButton(e, parentKey)
                    })
                })
            } else {
                $.get(`/project/kose/issue/${parentKey}/parentform`) //TODO: récupérer clé projet dynamiquement
            }
        })
    })
}

const bindSendButton = function(e, parentKey) {
    let issueText = $(e.target).parent()
    let issueType = issueText.find('.slick[placeholder="userstory"]').val()
    let issueStatus = issueText.find('.fa-option').val()
    let issueTitle = issueText.find('.slick[placeholder="title"]').val()
    let issueEstimation = issueText.find('.slick[placeholder="5"]').val()
    $.post('/project/kose/issue/new', {parent: parentKey, type: issueType, status: issueStatus, title: issueTitle, estimation: issueEstimation}, function(data) {
        $('.backlogRoot').replaceWith(data)
        bindFolding()
        bindAddButton()
    })
}

const updateInputSize = function() {
    $('.hidden-input').each((i, e) => {
        let hide = $(e)
        let input = hide.parent('.input-holder').children('.slick')
        if (input.val().length > 0) {
            hide.text(input.val())
        } else {
            hide.text(input.attr('placeholder'))
        }
        input.width(hide.width())
    })
}

const optionUpdate = function(e) {
    let newState = $(e).val()
    $(e).removeClass('todo-option doing-option done-option')
    if (newState == 'todo') {$(e).addClass('todo-option')}
    if (newState == 'doing') {$(e).addClass('doing-option')}
    if (newState == 'done') {$(e).addClass('done-option')}
}

const bindFolding = function() {
    $('.fold-button').on('click', (e) => {
        if (e.target.classList.contains('folded-chevron')) {
            $(e.target.parentElement.parentElement).children('.issue-root').removeClass('hidden-issue')
            $(e.target.parentElement).children('.bar').removeClass('hidden-bar')
            $(e.target).removeClass('folded-chevron')
        } else {
            $(e.target.parentElement.parentElement).children('.issue-root').addClass('hidden-issue')
            $(e.target.parentElement).children('.bar').addClass('hidden-bar')
            $(e.target).addClass('folded-chevron')
        }
        return false
    })
}

bindFolding()
bindAddButton()

$('.fa-check').parent().parent().find('.fa-chevron-down').click()

$('html').on('input', updateInputSize)