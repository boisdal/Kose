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
        if (oldVersionNumber == 'new') {
            $.post(`/project/${projectKey}/versions/new`, {newVersionNumber, versionTitle, versionDescription}, function(data) {
                handlePostSendVersion(data, versionLi)
            })
        } else {
            $.post(`/project/${projectKey}/versions/${oldVersionNumber}/update`, {newVersionNumber, versionTitle, versionDescription}, function(data) {
                handlePostSendVersion(data, versionLi)
            })
        }
    })
}

const handlePostSendVersion = function(data, versionLi) {
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
}

const bindEditVersionButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.edit-version-button').off('click').on('click', (event) => {
        let versionLi = $(event.target).closest('li')
        let oldVersionNumber = versionLi.attr('data-version-number')
        $.get(`/project/${projectKey}/versions/${oldVersionNumber}/geteditform`, function(data) {
            let oldVersionLiHtml = versionLi.get(0).outerHTML
            let newVersionLi = $(data)
            versionLi.replaceWith(newVersionLi)
            newVersionLi.attr('data-old-vesrion-li-html', oldVersionLiHtml)
            updateInputSize()
            bindAllVersionListEvents()
        })
        return false
    })
}

const bindCancelVersionButton = function() {
    $('.cancel-version-button').off('click').on('click', (event) => {
        let versionLi = $(event.target).closest('li')
        if (versionLi.attr('data-version-number') == 'new') {
            versionLi.remove()
        } else {
            let oldVersionLiHtml = versionLi.attr('data-old-vesrion-li-html')
            versionLi.replaceWith(oldVersionLiHtml)
        }
        bindAllVersionListEvents()
    })
}

const bindCancelAllVersionButton = function() {
    $('#cancelAllButton').off('click').on('click', (event) => {
        $('.edit-mode .cancel-version-button').click()
        bindAllVersionListEvents()
    })
}

const bindSendAllVersionButton = function() {
    $('#sendAllButton').off('click').on('click', (event) => {
        $('.edit-mode .send-version-button').click()
        bindAllVersionListEvents()
    })
}

const bindEditAllVersionButton = function() {
    $('#editAllButton').off('click').on('click', (event) => {
        $('li:not(.edit-mode) .edit-version-button').click()
        bindAllVersionListEvents()
    })
}

const bindDeleteVersionButton = function() {
    $('.delete-version-button').off('click').on('click', (event) => {
        let projectKey = $('#kose-metadata').attr('data-projectKey')
        let versionLi = $(event.target).closest('li')
        let versionNumber = versionLi.attr('data-version-number')
        let versionTitle = versionLi.find('input[placeholder="Insert title here ..."]').val()
        if (confirm(`Delete version ${versionNumber} : ${versionTitle} ?`)) {
            $.post(`/project/${projectKey}/versions/${versionNumber}/delete`, function(data) {
                versionLi.remove()
                bindAllVersionListEvents()
            })
        }
        return false
    })
}

const bindAllVersionListEvents = function() {
    bindVersionDetailClick()
    bindAddVersionButton()
    bindSendVersionButton()
    bindEditVersionButton()
    bindCancelVersionButton()
    bindCancelAllVersionButton()
    bindSendAllVersionButton()
    bindEditAllVersionButton()
    bindDeleteVersionButton()
    $('html').on('input', updateInputSize)
}

$('#versionNavLink').addClass('active')
bindAllVersionListEvents()