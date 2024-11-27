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