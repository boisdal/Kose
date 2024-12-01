$('#backlogNavLink').addClass('active')

const bindAddButton = function() {
    $('#newIssueButton').on('click', () => {
        $('.issue-text').addClass('parent-choice')
        $('#newIssueZone').addClass('parent-choice')
        $('#newIssueZone').show()
        $('.parent-choice').on('click', (e) => {
            $(e.target).closest('.issue-container').find('.folded-chevron').click()
            let parent = $(e.target).closest('div')
            let parentKey = parent.attr('data-issue-key')
            $('.parent-choice').off('click')
            $('.parent-choice').removeClass('parent-choice')
            $('#newIssueZone').hide()
            let projectKey = $('#kose-metadata').attr('data-projectKey')
            if (parentKey == 'new') {
                $.get(`/project/${projectKey}/issue/newform`, function(data) {
                    let form = $(data)
                    $('.backlog-root').find('div').first().children().last().after(form)
                    updateInputSize()
                    form.find('.send-button').on('click', (e) => {
                        sendButtonAction(e, parentKey)
                    })
                    form.find('.slick').first().trigger('focus')
                    bindEnterKeyToSendButton(form)
                })
            } else {
                let potentialAddingZone = parent.parent().closest('.issue-root')
                if ((potentialAddingZone.find('.issue-root').length > 0)) {
                    $.get(`/project/${projectKey}/issue/newform`, function(data) {
                        let form = $(data)
                        potentialAddingZone.children('.issue-root').last().after(form)
                        updateInputSize()
                        form.find('.send-button').on('click', (e) => {
                            sendButtonAction(e, parentKey)
                        })
                        form.find('.slick').first().trigger('focus')
                        bindEnterKeyToSendButton(form)
                    })
                } else {
                    $.get(`/project/${projectKey}/issue/${parentKey}/parentform`, function(data) {
                        let issue = $(data)
                        potentialAddingZone.replaceWith(issue)
                        updateInputSize()
                        issue.find('.send-button').on('click', (e) => {
                            sendButtonAction(e, parentKey)
                        })
                        issue.find('.slick').first().trigger('focus')
                        bindEnterKeyToSendButton(issue)
                    }) 

                }
            }
        })
    })
}

const bindEnterKeyToSendButton = function(root) {
    root.find('.slick').on('keyup', (e) => {
        if (e.keyCode === 13) {
            if ('ontouchstart' in document.documentElement) {
                input = $(e.target)
                if (input.attr('enterkeyhint') == 'next') {
                    input.parent().parent().nextAll('.hasInput').find('.slick').first().trigger('focus')
                } else {
                    // input.trigger('blur')
                    root.find('.send-button').click()
                }
            } else {
                root.find('.send-button').click()
            }
        }
    })
}

const sendButtonAction = function(e, parentKey) {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
    let issueText = $(e.target).parent()
    let issueType = issueText.find('.slick[placeholder="userstory"]').val() || 'userstory'
    let issueStatus = issueText.find('.fa-option').val()
    let issueTitle = issueText.find('.slick[placeholder="title"]').val() || 'titre'
    let issueEstimation = issueText.find('.slick[placeholder="5"]').val() || '5'
    $.post(`/project/${projectKey}/issue/new`, {rootIssueKey: rootIssueKey, parent: parentKey, type: issueType, status: issueStatus, title: issueTitle, estimation: issueEstimation}, async function(data) {
        $('.backlog-root').replaceWith(data)
        await bindFolding()
        $('.fa-check').parent().parent().find('.fa-chevron-down').click()
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

const bindFolding = async function() {
    await $('.fold-button').on('click', (e) => {
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