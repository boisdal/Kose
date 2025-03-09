if (!($('#issueNavLink').hasClass('active'))) {
    $('#backlogNavLink').addClass('active')
}

const bindAddButton = function() {
    $('#newIssueButton').off('click')
    $('#newIssueButton').on('click', () => {
        $('.issue-text').addClass('parent-choice')
        $('#newIssueZone').addClass('parent-choice')
        $('#newIssueZone').show()
        $('.parent-choice').off('click')
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
                    bindAllStructureEvents()
                    form.find('.slick').first().trigger('focus')
                })
            } else {
                let potentialAddingZone = parent.parent().closest('.issue-root')
                if ((potentialAddingZone.find('.issue-root').length > 0)) {
                    $.get(`/project/${projectKey}/issue/newform`, function(data) {
                        let form = $(data)
                        potentialAddingZone.children('.issue-root').last().after(form)
                        bindAllStructureEvents()
                        potentialAddingZone.find('.folded-chevron').click()
                        form.find('.slick').first().trigger('focus')
                    })
                } else {
                    $.get(`/project/${projectKey}/issue/${parentKey}/parentform`, function(data) {
                        let issue = $(data)
                        let form = issue.find('.issue-root')
                        let oldIssue = potentialAddingZone[0].outerHTML
                        potentialAddingZone.replaceWith(issue)
                        issue.attr('data-old-issue', oldIssue)
                        bindAllStructureEvents()
                        issue.find('.folded-chevron').click()
                        form.find('.slick').first().trigger('focus')
                    }) 

                }
            }
        })
    })
}

const bindQuickSendDeleteKeys = function(root) {
    $('.slick').off('keyup')
    $('.slick').on('keyup', (e) => {
        if (e.keyCode === 13) {
            if ('ontouchstart' in document.documentElement) {
                input = $(e.target)
                if (input.attr('enterkeyhint') == 'next') {
                    input.parent().parent().nextAll('.hasInput').find('.slick').first().trigger('focus')
                } else {
                    // input.trigger('blur')
                    $('#sendAllButton').click()
                }
            } else {
                $('#sendAllButton').click()
            }
        }
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
    $('.fold-button').off('click')
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
    $('#editAllButton').off('click')
    $('#editAllButton').on('click', async () => {
        $('.edit-button').click()
    })
}

const bindSendAllButton = function() {
    $('#sendAllButton').off('click')
    $('#sendAllButton').on('click', async () => {
        nbOfForms = $('.cancel-button').length
        // console.log(`Sending all forms currently in edition : ${nbOfForms} forms to send.`)
        for (let [i, e] of document.querySelectorAll('.cancel-button').entries()) {
            let parentKey = $(e).closest('.issue-root').parent().children('.issue-container').children('.issue-text').attr('data-issue-key') || 'new'
            let projectKey = $('#kose-metadata').attr('data-projectKey')
            let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
            let issueText = $(e).parent()
            let issueType = issueText.find('.slick[placeholder="userstory"]').val() || 'userstory'
            let issueStatus = issueText.find('.fa-option').val()
            let issueTitle = issueText.find('.slick[placeholder="title"]').val() || 'titre'
            let issueVersion = issueText.find('.version-select').val()
            let issueEstimation = issueText.find('.slick[placeholder="5"]').val() || '5'
            let formType = issueText.attr('data-form-type')
            if (formType == 'new') {
                await $.post(`/project/${projectKey}/issue/new`, {rootIssueKey: rootIssueKey, parent: parentKey, type: issueType, status: issueStatus, title: issueTitle, version: issueVersion, estimation: issueEstimation}, function(data) {
                    if (i == nbOfForms - 1) {
                        // Only if last form in list should it refresh and rebind
                        $('.backlog-root').replaceWith(data)
                        bindAllStructureEvents()
                    }
                })
            }
            else if (formType == 'edit') {
                let issueKey = issueText.attr('data-issue-key')
                await $.post(`/project/${projectKey}/issue/${issueKey}/edit`, {rootIssueKey: rootIssueKey, parent: parentKey, type: issueType, status: issueStatus, title: issueTitle, version: issueVersion, estimation: issueEstimation}, function(data) {
                    if (i == nbOfForms - 1) {
                        // Only if last form in list should it refresh and rebind
                        $('.backlog-root').replaceWith(data)
                        bindAllStructureEvents()
                    }
                })
            } else {
                console.log(`form type not supported : ${formType}`)
            }
        }
    })
}

const bindCancelAllButton = function() {
    $('#cancelAllButton').off('click')
    $('#cancelAllButton').on('click', async () => {
        $('.cancel-button').each((i, e) => {
            let formType = $(e).parent().attr('data-form-type')
            if (formType == 'new') {
                let issueRoot = $(e).parent().parent()
                let parentRoot = issueRoot.parent().closest('.issue-root')
                issueRoot.remove()
                console.log()
                if (parentRoot.find('.issue-root').length == 0) {
                    parentRoot.replaceWith($(parentRoot.attr('data-old-issue')))
                }
            } else if (formType == 'edit') {
                canceledIssueText = $(e).closest('.issue-text')
                canceledIssueText.replaceWith($(canceledIssueText.attr('data-old-issue-text')))
            } else {
                console.log(`form type not supported : ${formType}`)
            }
        })
        bindAllStructureEvents()
    })
}           

const bindEditButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.edit-button').off('click')
    $('.edit-button').on('click', (e) => {
        let issueText = $(e.target).parent('.issue-text')
        let oldIssueText = issueText[0].outerHTML
        let key = issueText.attr('data-issue-key')
        $.get(`/project/${projectKey}/issue/${key}/geteditform`, function(data) {
            let newIssueText = $(data)
            issueText.replaceWith(newIssueText)
            newIssueText.attr('data-old-issue-text', oldIssueText) 
            updateInputSize()
            bindAllStructureEvents()
        })
    })
}

const bindCancelButton = function() {
    $('.cancel-button').off('click')
    $('.cancel-button').on('click', (e) => {
        let formType = $(e.target).parent().attr('data-form-type')
        if (formType == 'new') {
            let issueRoot = $(e.target).parent().parent()
            let parentRoot = issueRoot.parent().closest('.issue-root')
            issueRoot.remove()
            console.log()
            if (parentRoot.find('.issue-root').length == 0) {
                parentRoot.replaceWith($(parentRoot.attr('data-old-issue')))
                bindAllStructureEvents()
            }
        } else if (formType == 'edit') {
            canceledIssueText = $(e.target).closest('.issue-text')
            canceledIssueText.replaceWith($(canceledIssueText.attr('data-old-issue-text')))
            bindAllStructureEvents()
        } else {
            console.log(`form type not supported : ${formType}`)
        }
    })
}

const bindDeleteButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
    $('.delete-button').off('click')
    $('.delete-button').on('click', (e) => {
        let issueText = $(e.target).closest('.issue-text')
        let issueKey = issueText.attr('data-issue-key')
        let issueTitle = issueText.find('.value').eq(1).text().replaceAll('"', '')
        if (confirm(`Delete issue n°${issueKey} : ${issueTitle} ?`)) {
            $.post(`/project/${projectKey}/issue/${issueKey}/delete`, {rootIssueKey: rootIssueKey}, function(data) {
                $('.backlog-root').replaceWith(data)
                bindAllStructureEvents()
            })
        }
    })
}

const bindAdoptModeButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
    $('#adoptModeButton').off('click').on('click', () => {
        $('.backlog-root').addClass('adopt-mode-child')
        $('.child-adopt-button').off('click').on('click', async (e) => {
            // When moving issue is selected
            let button = $(e.target)
            let movingIssueKey = button.closest('.issue-text').attr('data-issue-key')
            // console.log(`Moving issue n°${movingIssueKey}`)
            $('.backlog-root').removeClass('adopt-mode-child')
            $('.backlog-root').addClass('adopt-mode-parent')
            let descendantAdoptButtonList = button.closest('.issue-root').find('.parent-adopt-button')
            descendantAdoptButtonList.addClass('disabled')
            $('.parent-adopt-button').off('click').not(descendantAdoptButtonList).on('click', (e) => {
                let parentIssueAdoptButton = $(e.target)
                let parentIssueKey = parentIssueAdoptButton.closest('.issue-text').attr('data-issue-key')
                // console.log(`Chosen new parent for issue n°${movingIssueKey} is issue n°${parentIssueKey}`)
                $.post(`/project/${projectKey}/issue/${movingIssueKey}/adopt`, {rootIssueKey: rootIssueKey, newParentKey: parentIssueKey}, function(data) {
                    $('.backlog-root').replaceWith(data)
                    bindAllStructureEvents()
                })
            })
        })
    })
}

const bindAllStructureEvents = function() {
    updateInputSize()
    bindEditButton()
    bindDeleteButton()
    bindCancelButton()
    bindFolding()
    bindAddButton()
    bindEditAllButton()
    bindSendAllButton()
    bindCancelAllButton()
    bindQuickSendDeleteKeys()
    bindAdoptModeButton()
    $('.fa-check').parent().parent().find('.fa-chevron-down').click() // TODO: trouver mieux
    $('html').on('input', updateInputSize)
}

bindAllStructureEvents()