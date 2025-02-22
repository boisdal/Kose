const bindVersionDetailClick = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    $('.version-timeline > ul > li').off('click').on('click', (event) => {
        console.log('yooooooo')
        let versionLi = $(event.target).closest('.version-timeline > ul > li') || $(event.target)
        let versionNumber = versionLi.attr('data-version-number')
        window.location.href = `/project/${projectKey}/versions/${versionNumber}`
    })
}

const bindAllVersionListEvents = function() {
    bindVersionDetailClick()
}

$('#versionNavLink').addClass('active')
bindAllVersionListEvents()