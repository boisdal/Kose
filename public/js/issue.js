const bindEditFieldButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
    $('.edit-field-button').off('click').on('click', (e) => {
        let tr = $(e.target).closest('tr')
        let fieldName = tr.attr('data-field-name')
        $.get(`/project/${projectKey}/issue/${rootIssueKey}/getfieldform/${fieldName}`, function(data) {
            let td = tr.find('td').last()
            let oldTdInnerHtml = td.html()
            td.html(data)
            tr.attr('data-old-td', oldTdInnerHtml)
            tr.addClass('edit-mode')
        })
    })
}

const bindSendFieldButton = function() {
    let projectKey = $('#kose-metadata').attr('data-projectKey')
    let rootIssueKey = $('#kose-metadata').attr('data-rootIssueKey')
    $('.send-field-button').off('click').on('click', (e) => {
        let tr = $(e.target).closest('tr')
        let fieldName = tr.attr('data-field-name')
        let fieldValue = tr.find('input').val() || tr.find('select').val() || tr.find('textarea').val()
        $.post(`/project/${projectKey}/issue/${rootIssueKey}/editfield/${fieldName}`, {value: fieldValue}, function(data) {
            tr.find('td').last().html(data)
        })
    })
}

const bindCancelFieldButton = function() {
    $('.cancel-field-button').off('click').on('click', (e) => {
        let tr = $(e.target).closest('tr')
        let td = tr.find('td').last()
        td.html(tr.attr('data-old-td'))
    })
}

const bindAllIssueEvents = function() {
    bindEditFieldButton()
    bindSendFieldButton()
    bindCancelFieldButton()
}

$('#issueNavLink').addClass('active')
$('#backlogNavLink').removeClass('active')
bindAllIssueEvents()