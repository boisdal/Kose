const bindVersionDetailClick = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.version-timeline > ul > li').off('click').on('click', (event) => {
        let versionLi = $(event.target).closest('.version-timeline > ul > li') || $(event.target)
        let versionNumber = versionLi.attr('data-version-number')
        window.location.href = `/project/${projectKey}/versions/${versionNumber}`
    })
}

const bindAddVersionButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('#newVersionButton').off('click').on('click', () => {
        $.get(`/project/${projectKey}/versions/newform`, (data) => {
            $('.version-timeline > ul').append(data)
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

const bindAllVersionListEvents = function() {
    bindVersionDetailClick()
    bindAddVersionButton()
    $('html').on('input', updateInputSize)
}

$('#versionNavLink').addClass('active')
bindAllVersionListEvents()