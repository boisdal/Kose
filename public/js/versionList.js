const bindVersionDetailClick = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.version-timeline > ul > li:not(.edit-mode)').off('click').on('click', (event) => {
        let versionLi = $(event.target).closest('.version-timeline > ul > li') || $(event.target)
        let versionNumber = versionLi.attr('data-version-number')
        window.location.href = `/project/${projectKey}/versions/${versionNumber}`
    })
}

const bindAddVersionButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('#newVersionButton').off('click').on('click', () => {
        $.get(`/project/${projectKey}/versions/newform`, (data) => {
            let newVersion = $(data)
            $('.version-timeline > ul').append(newVersion)
            newVersion.find('input.slick').first().focus()
            newVersion.get(0).scrollIntoView({behavior: "smooth", block: "end"})
            updateInputSize()
            bindAllVersionListEvents()
        })
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

const bindSendVersionButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.send-version-button').off('click').on('click', (event) => {
        let versionLi = $(event.target).closest('li')
        let oldVersionNumber = versionLi.attr('data-version-number')
        let newVersionNumber = versionLi.find('.slick[placeholder="0.0.0"]').val()
        let versionTitle = versionLi.find('input[placeholder="Insert title here ..."]').val()
        let versionDescription = versionLi.find('textarea[placeholder="Insert description here ..."]').val()
        console.log(versionTitle, versionDescription)
        if (oldVersionNumber == 'new') {
            $.post(`/project/${projectKey}/versions/new`, {newVersionNumber, versionTitle, versionDescription}, function(data) {
                let newVersionLi = $(data)
                let previousVersionNumber = newVersionLi.attr('data-previous-version-number')
                if (previousVersionNumber == '__first__') {
                    let newVersionNumber = newVersionLi.attr('data-version-number')
                    let formerFirstVersion = $('li[data-previous-version-number="__first__"]')
                    formerFirstVersion.attr('data-previous-version-number', newVersionNumber)
                    formerFirstVersion.before(newVersionLi)
                } else {
                    $(`li[data-version-number="${previousVersionNumber}"]`).after(newVersionLi)
                }
                versionLi.remove()
                bindAllVersionListEvents()
            })
        } else {
            $.post(`/project/${projectKey}/versions/${oldVersionNumber}/update`, {newVersionNumber, versionTitle, versionDescription}, function(data) {
                console.log(data)
            })
        }
    })
}

const bindEditVersionButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.edit-version-button').off('click').on('click', (event) => {
        
        return false
    })
}

const bindAllVersionListEvents = function() {
    bindVersionDetailClick()
    bindAddVersionButton()
    bindSendVersionButton()
    bindEditVersionButton()
    $('html').on('input', updateInputSize)
}

$('#versionNavLink').addClass('active')
bindAllVersionListEvents()