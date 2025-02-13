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
                    $('.backlog-root').find('div').first().append(form)
                    updateInputSize()
                    bindNewIssueFormButtons(form, parentKey)
                })
            } else {
                let potentialAddingZone = parent.parent().closest('.issue-root')
                if ((potentialAddingZone.find('.issue-root').length > 0)) {
                    $.get(`/project/${projectKey}/issue/newform`, function(data) {
                        let form = $(data)
                        potentialAddingZone.children('.issue-root').last().after(form)
                        updateInputSize()
                        bindNewIssueFormButtons(form, parentKey)
                    })
                } else {
                    $.get(`/project/${projectKey}/issue/${parentKey}/parentform`, function(data) {
                        let issue = $(data)
                        let form = issue.find('.issue-root')
                        let oldIssue = potentialAddingZone[0].outerHTML
                        potentialAddingZone.replaceWith(issue)
                        issue.attr('old-issue', oldIssue)
                        updateInputSize()
                        bindNewIssueFormButtons(form, parentKey)
                    }) 

                }
            }
        })
    })
}

const bindNewIssueFormButtons = function(form, parentKey) {
    form.find('.send-button').on('click', (e) => {
        let projectKey = $('#kose-metadata').attr('data-projectKey')
        let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
        let issueText = $(e.target).parent()
        let issueType = issueText.find('.slick[placeholder="userstory"]').val() || 'userstory'
        let issueStatus = issueText.find('.fa-option').val()
        let issueTitle = issueText.find('.slick[placeholder="title"]').val() || 'titre'
        let issueEstimation = issueText.find('.slick[placeholder="5"]').val() || '5'
        $.post(`/project/${projectKey}/issue/new`, {rootIssueKey: rootIssueKey, parent: parentKey, type: issueType, status: issueStatus, title: issueTitle, estimation: issueEstimation}, async function(data) {
            $('.backlog-root').replaceWith(data)
            bindAllShit()
        })
    })
    form.find('.cancel-button').on('click', (e) => {
        let issueRoot = $(e.target).parent().parent()
        // TODO: checker si cancel d'un edit (old-issue-text)
        let parentRoot = issueRoot.parent().closest('.issue-root')
        issueRoot.remove()
        console.log()
        if (parentRoot.find('.issue-root').length == 0) {
            parentRoot.replaceWith($(parentRoot.attr('old-issue')))
        }
    })
    form.find('.slick').first().trigger('focus')
    bindEnterKeyToSendButton(form)
    bindDeleteKeyToCancelButton(form)
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

const bindDeleteKeyToCancelButton = function(root) {
    root.find('.slick').on('keyup', (e) => {
        if (e.keyCode === 46) {
            root.find('.cancel-button').click()
        }
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

const bindEditAllButton = function() {
    // TODO:
}

const bindSendAllButton = function() {
    $('#sendAllButton').on('click', async () => {
        nbOfForms = $('.send-button').length
        for (let [i, e] of document.querySelectorAll('.send-button').entries()) {
            let parentKey = $(e).closest('.issue-root').parent().children('.issue-container').children('.issue-text').attr('data-issue-key')
            let projectKey = $('#kose-metadata').attr('data-projectKey')
            let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
            let issueText = $(e).parent()
            let issueType = issueText.find('.slick[placeholder="userstory"]').val() || 'userstory'
            let issueStatus = issueText.find('.fa-option').val()
            let issueTitle = issueText.find('.slick[placeholder="title"]').val() || 'titre'
            let issueEstimation = issueText.find('.slick[placeholder="5"]').val() || '5'
            // TODO: séparer le cas edit du cas new 
            await $.post(`/project/${projectKey}/issue/new`, {rootIssueKey: rootIssueKey, parent: parentKey, type: issueType, status: issueStatus, title: issueTitle, estimation: issueEstimation}, function(data) {
                if (i == nbOfForms - 1) {
                    // Only if last form in list should it refresh and rebind
                    $('.backlog-root').replaceWith(data)
                    bindAllShit()
                }
            })
        }
    })
}

const bindCancelAllButton = function() {
    $('#cancelAllButton').on('click', async () => {
        $('.cancel-button').each((i, e) => {
            let issueRoot = $(e).parent().parent()
            let parentRoot = issueRoot.parent().closest('.issue-root')
            issueRoot.remove()
            console.log()
            if (parentRoot.find('.issue-root').length == 0) {
                parentRoot.replaceWith($(parentRoot.attr('old-issue')))
            }
        })
    })
}

const bindEditButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.edit-button').on('click', (e) => {
        let issueText = $(e.target).parent('.issue-text')
        // TODO: ajout du old-issue-text dans les data de l'element
        let key = issueText.attr('data-issue-key')
        $.get(`/project/${projectKey}/issue/${key}/geteditform`, function(data) {
            let newIssueText = $(data)
            issueText.replaceWith(newIssueText)
            updateInputSize()
            newIssueText.find('.send-button').on('click', async (e) => {
                let projectKey = $('#kose-metadata').attr('data-projectKey')
                let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
                let issueText = $(e.target).parent()
                let issueType = issueText.find('.slick[placeholder="userstory"]').val() || 'userstory'
                let issueStatus = issueText.find('.fa-option').val()
                let issueTitle = issueText.find('.slick[placeholder="title"]').val() || 'titre'
                let issueEstimation = issueText.find('.slick[placeholder="5"]').val() || '5'
                await $.post(`/project/${projectKey}/issue/${key}/edit`, {rootIssueKey: rootIssueKey, type: issueType, status: issueStatus, title: issueTitle, estimation: issueEstimation}, function(data) {
                    $('.backlog-root').replaceWith(data)
                    bindAllShit()
                })
            })
        })
    })
}

const bindDeleteButton = function() {
    // TODO:
}

const bindAllShit = function() { // TODO: faire une passe pour utiliser cette fonction au max (s'assurer de pas de double bind)
    bindDeleteButton()
    bindEditButton()
    bindFolding()
    bindAddButton()
    bindEditAllButton()
    bindSendAllButton()
    bindCancelAllButton()
    $('.fa-check').parent().parent().find('.fa-chevron-down').click() // TODO: trouver mieux
    $('html').on('input', updateInputSize)
}

bindAllShit()