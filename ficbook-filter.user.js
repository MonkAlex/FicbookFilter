// ==UserScript==
// @name            Фильтр для Ficbook
// @description     Фильтровать фанфики по разным параметрам.
// @license         MIT
// @namespace       https://github.com/MonkAlex/FicbookFilter
// @include         htt*://ficbook.net/*
// @exclude         htt*://ficbook.net/home/collections?type=update
// @exclude         htt*://ficbook.net/home/change_*
// @grant           none
// @require         http://code.jquery.com/jquery-latest.min.js
// @downloadURL     https://raw.githubusercontent.com/MonkAlex/FicbookFilter/master/ficbook-filter.user.js
// @updateURL       https://raw.githubusercontent.com/MonkAlex/FicbookFilter/master/ficbook-filter.user.js
// @version         2018.11.10b
// @author          MonkAlex
// ==/UserScript==

/** Все фанфики на странице **/
let globalFanfics = new Set();

function setBannedAuthors(authorsId) {
    localStorage.setItem(
        'ficbookFilter.bannedAuthors',
        JSON.stringify(authorsId)
    )
}

function setBannedFanfics(fanficsId) {
    localStorage.setItem(
        'ficbookFilter.bannedFanfics',
        JSON.stringify(fanficsId)
    )
}

function setBannedDirections(directions) {
    localStorage.setItem('ficbookFilter.bannedDirections', JSON.stringify(directions))
}

function getBannedAuthors() {
    const str = localStorage.getItem('ficbookFilter.bannedAuthors');
    return str ? JSON.parse(str) : []
}

function getBannedFanfics() {
    const str = localStorage.getItem('ficbookFilter.bannedFanfics');
    return str ? JSON.parse(str) : []
}

function getBannedDirections() {
    const str = localStorage.getItem('ficbookFilter.bannedDirections');
    return str ? JSON.parse(str) : []
}

/**
 * Добавить кнопку "заблокировать".
 * @param root элемент, к которому прицепится кнопка.
 * @param title текст при наведении.
 * @param inSup true, если это кнопки у загловока, там дополнительно используется sup элемент.
 * @param fanfic контекст выполнения, по идее - фанфик.
 * @param click обработчик нажатия на кнопку.
 * @returns {HTMLElement} собственно кнопка, к которой потом можно повесить обработчик.
 */
function addButton(root, title, inSup, fanfic, click) {
    let button = document.createElement("button");
    button.innerHTML = '<svg viewBox="0 0 32 32" width="16" fill="rgb(180, 0, 0)">\n' +
        '<path d="M32 11.2c0 2.7-1.16 5.12-3.02 6.8H29L19 28c-1 1-2 2-3 2s-2-1-3-2L3.02 18A9.2 9.2 0 0 1 13.93 3.31L11 8l7 4-4 10 11-12-7-4 2.46-3.7A9.2 9.2 0 0 1 32 11.2z"></path>\n' +
        '</svg>';
    button.title = title;

    let bs = button.style;
    bs.verticalAlign = 'bottom';
    bs.padding = '0px';
    bs.background = 'none';
    bs.border = 'none';

    button.fanfic = fanfic;
    button.addEventListener("click", click);

    if (inSup) {
        let sup = document.createElement("sup");
        sup.className = "count";
        sup.appendChild(button);
        button = sup;
    }
    root.appendChild(button);
    return button;
}

class Fanfic {
    constructor(article) {
        this.title = article.querySelector("a.visit-link");
        this.author = article.querySelector("div.description ul.listing.list-inline li");
        this.authorLink = this.author.querySelector("a");
        this.authorId = parseInt(this.authorLink.href.match(/\/(\d+)+/)[1], 10);
        this.fanficId = parseInt(this.title.href.match(/\/(\d+)+/)[1], 10);
        this.direction = article.querySelector("div.direction i");
        this.directionName = this.direction.className.replace("icon-", "");
        this.article = article;

        // Add removing direction button
        this.directionBtn = addButton(this.direction, 'Забанить этот тип фанфиков', false, this, function () {
            this.fanfic.banDirection();
        });
        // Add removing fanfic button
        this.fanficBtn = addButton(this.title.parentElement, 'Забанить этот фанфик', true, this, function () {
            this.fanfic.banFanfic();
        });
        // Add removing author button
        this.authorBtn = addButton(this.author, 'Забанить этого автора', false, this, function () {
            this.fanfic.banAuthor();
        });
        this.resurrectBtn = addButton(this.title.parentElement, "Вернуть", true, this, function () {
            this.fanfic.restoreAll();
        });
        this.resurrectBtn.style.display = "none";
    }

    restoreAll() {
        let fullPage = true;
        let tempAuthors = getBannedAuthors();
        if (tempAuthors.includes(this.authorId)) {
            tempAuthors.splice(tempAuthors.indexOf(this.authorId), 1);
            setBannedAuthors(tempAuthors);
            console.warn('restore author ' + this.authorId);
        }
        let tempFanfics = getBannedFanfics();
        if (tempFanfics.includes(this.fanficId)) {
            tempFanfics.splice(tempFanfics.indexOf(this.fanficId), 1);
            setBannedFanfics(tempFanfics);
            fullPage = false;
            console.warn('restore fanfic ' + this.fanficId);
        }
        let tempDirections = getBannedDirections();
        if (tempDirections.includes(this.directionName)) {
            tempDirections.splice(tempDirections.indexOf(this.directionName), 1);
            setBannedDirections(tempDirections);
            console.warn('restore direction ' + this.directionName);
        }
        if (fullPage)
        {
            globalFanfics.forEach(function (fanfic) {
                if (!fanfic.getFanficBanned())
                    fanfic.unHideFanfic();
            })
        }
        else
            this.unHideFanfic();
    }

    banAuthor() {
        console.warn('hide author ' + this.authorId);
        let bannedAuthors = getBannedAuthors();
        bannedAuthors.push(this.authorId);
        setBannedAuthors(bannedAuthors);
        globalFanfics.forEach(function (fanfic) {
            if (fanfic.getFanficBanned())
                fanfic.hideFanfic();
        });
    }

    banFanfic() {
        console.warn('hide fanfic ' + this.fanficId);
        let bannedFanfics = getBannedFanfics();
        bannedFanfics.push(this.fanficId);
        setBannedFanfics(bannedFanfics);
        this.hideFanfic();
    }

    banDirection() {
        console.warn('hide direction ' + this.directionName);
        let bannedDirections = getBannedDirections();
        bannedDirections.push(this.directionName);
        setBannedDirections(bannedDirections);
        globalFanfics.forEach(function (fanfic) {
            if (fanfic.getFanficBanned())
                fanfic.hideFanfic();
        });
    }

    hideFanfic() {
        this.fanficBtn.style.display = "none";
        this.authorBtn.style.display = "none";
        this.directionBtn.style.display = "none";
        this.resurrectBtn.style.display = "";
        this.article.className += " fanfic-block-disliked";
        if (this.authorBanned())
            this.authorLink.className += " disliked-parameter-link";
        if (this.fanficBanned())
            this.title.className += " disliked-parameter-link";

        // TODO: fics can be hiden
        // $thumb.parent().parent().hide()
    }

    unHideFanfic() {
        this.resurrectBtn.style.display = "none";
        this.fanficBtn.style.display = "";
        this.authorBtn.style.display = "";
        this.directionBtn.style.display = "";
        this.article.className = this.article.className.replace(" fanfic-block-disliked", "");
        if (!this.authorBanned())
            this.authorLink.className = this.authorLink.className.replace(" disliked-parameter-link", "");
        if (!this.fanficBanned())
            this.title.className = this.title.className.replace(" disliked-parameter-link", "");

        // TODO: fics can be hiden
        // $thumb.parent().parent().hide()
    }

    getFanficBanned() {
        return this.fanficBanned() || this.authorBanned() || this.directionBanned();
    }

    directionBanned() {
        return getBannedDirections().includes(this.directionName);
    }

    authorBanned() {
        return getBannedAuthors().includes(this.authorId);
    }

    fanficBanned() {
        return getBannedFanfics().includes(this.fanficId);
    }
}


(function () {
    // Hide fanfics
    $('article.block').each(function () {
        let fanfic = new Fanfic(this);
        globalFanfics.add(fanfic);
        if (fanfic.getFanficBanned())
            fanfic.hideFanfic();
    });
})();
console.log("Ficbook filter " + GM_info.script.version + " loaded.");
