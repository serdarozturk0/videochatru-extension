let settings = {},
    api = 1,
    local = {ips: []},
    stage = 0,
    search = 0,
    found = 0,
    curInfo = {},
    curIps = [],
    needToClear = false,
    needToCheckTarget = false,
    play = 0,
    map,
    countBeforeSaveStats = 0,
    tim,
    dc,
    faceApiLoaded = false,
    buttons = $(".buttons")[0],
    chat = $(".chat")[0],
    resize,
    language = window.navigator.language.slice(0, 2),
    timeout,
    requestToStartTiming = 0,
    requestToSkip = false,
    torrenstsConfirmed = false

if (language === "pt")
    language = "pt-BR"
else if (language === "zh")
    language = "zh-CN"

const s = document.createElement('script');
s.src = chrome.runtime.getURL('injection/ip-api.js');
s.onload = () => s.remove();
(document.head || document.documentElement).appendChild(s);

const c = document.createElement('link');
c.rel = "stylesheet";
c.href = chrome.runtime.getURL('libs/css/css-tooltip.min.css');

const cs = document.createElement('link');
cs.rel = "stylesheet";
cs.href = chrome.runtime.getURL("libs/css/tooltipster.bundle.min.css");

const dark = document.createElement('link');
dark.rel = "stylesheet";
dark.id = "darkMode"
if (location.href.includes('videochatru')) {
    chrome.storage.sync.set({lastInstanceOpened: "https://videochatru.com/embed/"})
    dark.href = chrome.runtime.getURL("resources/dark-mode.css");
} else if (location.href.includes('ome.tv')) {
    chrome.storage.sync.set({lastInstanceOpened: "https://ome.tv/embed/"})
    dark.href = chrome.runtime.getURL("resources/dark-mode-ometv.css");
}

const css = document.createElement('style')
css.textContent = "small {font-size: xx-small!important;}";

chrome.storage.local.get(null, function (result) {
    local = result;
})

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === "sync")
        chrome.storage.sync.get(null, function (result) {
            settings = result;
        });
});


try {
    let new_el = $(document.createElement("div"))

    new_el[0].innerHTML = chrome.i18n.getMessage("loginWindow")

    new_el[0].style.marginTop = "15px"
    new_el[0].style.marginBottom = "15px"

    new_el.insertAfter(document.querySelector('[data-tr="sign_in_to"]'))
    $(".login-popup__item.right")[0].style.overflowY = "auto"
} catch (e) {
    console.dir(e)
}

$(document).arrive(".ban-popup__unban_msg.tr", function (el) {
    try {
        Arrive.unbindAllArrive();
        let new_el = $(el).clone()
        new_el.css('height', '30px');
        new_el.css('line-height', '26px');
        new_el[0].innerHTML = ''

        let newAvoidBan = createElement("b", {
            innerText: `${chrome.i18n.getMessage("extension_name")}: `,
        }, [
            createElement("a", {
                innerText: "I was banned. What should I do now?",
                style: "text-decoration: none!important; cursor: pointer;",
                onclick: () => {
                    Swal.fire({
                        heightAuto: false,
                        icon: 'info',
                        title: chrome.i18n.getMessage('avoidBanSwalTitle'),
                        html: chrome.i18n.getMessage('avoidBanSwalInnerHTML')
                    })
                }
            })
        ])
        $(newAvoidBan).appendTo(new_el)

        new_el.insertAfter(el)
    } catch (e) {
        console.dir('ban injection failed')
        console.dir(e)
    }
});

function stopAndStart(delay) {
    requestToSkip = false

    if (typeof delay !== "undefined") {
        document.getElementsByClassName('buttons__button stop-button')[0].click()
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            document.getElementsByClassName('buttons__button start-button')[0].click()
        }, delay)
    } else {
        requestToStartTiming = +new Date()
        document.getElementsByClassName('buttons__button stop-button')[0].click()
    }
}

const onUpdateIP = function (mutations) {

    if (remoteIP.innerText === "-" || remoteIP.innerText === "")
        return

    let newIp = remoteIP.innerText.replace("[", "").replace("]", "")

    if (curIps.includes(newIp)) {
        return
    }

    console.dir("IP CHANGE DETECTED")
    requestToSkip = false
    if (local.ips.includes(remoteIP.innerText)) {
        settings.stats.countDup++
        console.dir("old ip")
        if (settings.skipSound)
            ban.play()
        stopAndStart()
    } else {
        curIps.push(newIp)
        console.dir(curIps)
        settings.stats.countNew++
        console.dir("new ip")
        switch (api) {
            case 2:
                doLookupRequest2(newIp)
                break;
            case 1:
                doLookupRequest1(newIp)
                break;
            default:
                break;
        }

    }
}

function doLookupRequest1(ip) {
    console.dir('sending request to ip-api.com...')
    $.getJSON("http://ip-api.com/json/" + ip, {
        lang: language,
        fields: "status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
    })
        .done(function (json) {
            console.dir('ip-api.com responded: 200')
            processData(json, ip)
        })
        .fail(function (jqxhr) {
            console.dir(`ip-api.com request failed: ${jqxhr.status}`)
            console.dir(jqxhr)
            remoteInfo.innerHTML = DOMPurify.sanitize("<b>HTTP ERROR " + jqxhr.status + "</b>")
            if (settings.enableTargetCity || settings.enableTargetRegion) {
                if (jqxhr.status === 429) {
                    stopAndStart(5000)
                }
            }
        });
}

function doLookupRequest2(ip) {
    chrome.runtime.sendMessage({remoteIP: ip, language: language}, function (response) {
        console.dir(`request to send ip-api request sent to service worker: ${response}`)
    });
}

function checkTorrents(ip) {
    if (settings.torrentsEnable) {
        if (torrenstsConfirmed || !settings.torrentsInfo) {
            let url = `https://iknowwhatyoudownload.com/${chrome.i18n.getMessage("@@ui_locale")}/peer/?ip=${ip}`
            chrome.runtime.sendMessage({checkTorrents: true, url: url}, function (response) {
                console.dir(`request to open iknowwhatyoudownload in the new tab/window: ${response}`)
            });
        } else {
            Swal.fire({
                title: 'iknowwhatyoudownload',
                heightAuto: false,
                showCancelButton: true,
                confirmButtonText: chrome.i18n.getMessage("YKWYDConfirmButtonText"),
                cancelButtonText: chrome.i18n.getMessage("YKWYDCancelButtonText"),
                html: chrome.i18n.getMessage("YKWYDHtml"),
                reverseButtons: true,
            }).then((result) => {
                if (result.isConfirmed) {
                    torrenstsConfirmed = true;
                    let url = `https://iknowwhatyoudownload.com/${chrome.i18n.getMessage("iknowwhatyoudownload_lang")}/peer/?ip=${ip}`
                    chrome.runtime.sendMessage({checkTorrents: true, url: url}, function (response) {
                        console.dir(`request to open iknowwhatyoudownload in the new tab/window: ${response}`)
                    });
                }
            })
        }
    }
}

function processData(json, ip) {
    if (!curIps.includes(ip)) {
        return
    }

    if (settings.minimalism) {
        setTimeout(() => {
            if ($('span[data-tr="connection"]').length === 1) {
                if (json.status === "success") {
                    let ipApiString = `<b>${json.city} (${json.regionName}), ${json.country}.</b>`

                    if (json.mobile) {
                        ipApiString += `<br>${chrome.i18n.getMessage("minimalismExplainMobile")}`
                    }
                    if (json.proxy) {
                        ipApiString += `<br>${chrome.i18n.getMessage("minimalismExplainProxy")}`
                    }
                    if (json.hosting) {
                        ipApiString += `<br>${chrome.i18n.getMessage("minimalismExplainHosting")}`
                    }

                    $('<br><span>' + DOMPurify.sanitize(ipApiString) + '</span>').appendTo($(".message-bubble")[0])
                }
            }
        }, 250)
        return
    }

    curInfo = json
    startDate = +new Date() / 1000
    let strings = []
    let newInnerHTML = ''
    let newIpDiv = createElement('div')
    if (settings.showMoreEnabledByDefault && (json.mobile || json.proxy || json.hosting)) {
        if (json.mobile)
            strings.push(`<small>MOBILE [${chrome.i18n.getMessage('apiMobile')}]</small>`)
        if (json.proxy)
            strings.push(`<small>PROXY [${chrome.i18n.getMessage('apiProxy')}]</small>`)
        if (json.hosting)
            strings.push(`<small>HOSTING [${chrome.i18n.getMessage('apiHosting')}]</small>`)
    }

    if (settings.hideMobileLocation && json.mobile) {
        newInnerHTML = chrome.i18n.getMessage("apiCountry") + json.country + " [" + json.countryCode + "] </br></br>"

        newInnerHTML += chrome.i18n.getMessage("apiCT") + `${json.city}/${json.regionName}</br>`
        try {
            newInnerHTML += "<b>TZ: </b><sup class='remoteTZ'>" + json.timezone + "</sup> (<sup class = 'remoteTime'>" + new Date().toLocaleTimeString("ru", {timeZone: json.timezone}).slice(0, -3) + "</sup>) </br>"
        } catch {
            newInnerHTML += "<b>TZ: </b><sup class='remoteTZ'>" + json.timezone + "</sup> (<sup class = 'remoteTime'>" + "???" + "</sup>) </br>"
        }
        newInnerHTML += "<b>TM: </b><sup class='remoteTM'>" + secondsToHms(+new Date() / 1000 - startDate) + "</sup>"

    } else {
        newInnerHTML = chrome.i18n.getMessage("apiCountry") + json.country + " [" + json.countryCode + "] </br>"

        newInnerHTML += "</br>" +
            chrome.i18n.getMessage("apiCity") + json.city + " (" + json.region + ") </br>" +
            chrome.i18n.getMessage("apiRegion") + json.regionName + "</br>"
        try {
            newInnerHTML += "<b>TZ: </b><sup class='remoteTZ'>" + json.timezone + "</sup> (<sup class = 'remoteTime'>" + new Date().toLocaleTimeString("ru", {timeZone: json.timezone}).slice(0, -3) + "</sup>) </br>"
        } catch {
            newInnerHTML += "<b>TZ: </b><sup class='remoteTZ'>" + json.timezone + "</sup> (<sup class = 'remoteTime'>" + "???" + "</sup>) </br>"
        }
        newInnerHTML += "<b>TM: </b><sup class='remoteTM'>" + secondsToHms(+new Date() / 1000 - startDate) + "</sup>"
    }

    if (settings.showISP) {
        newInnerHTML += `<br><small style="font-size: x-small!important;"><b>${json.isp}</b></small>`
    }

    if (strings.length > 0)
        newInnerHTML += "</br>" + strings.join('<small> || </small>')


    newIpDiv.innerHTML += DOMPurify.sanitize(newInnerHTML)
    if (needToClear) {
        needToClear = false
        $(ipApiContainer).parent().children(':not(#ipApiContainer)').remove()
        $(ipApiContainer).children().remove();
    }
    $(newIpDiv).appendTo(ipApiContainer)
    console.dir("RENDER ++")

    if (settings.torrentsEnable && !json.mobile && !json.proxy && !json.hosting) {
        newIpDiv.innerHTML += `<br><br>`
        $(createElement('button', {
            innerHTML: "<b>" + chrome.i18n.getMessage("YKWYDButtonText") + "</b>",
            onclick: () => {
                checkTorrents(DOMPurify.sanitize(json.query))
            }
        })).appendTo(newIpDiv)
    }

    if ((settings.enableTargetCity || settings.enableTargetRegion) && needToCheckTarget) {
        if (settings.skipMobileTarget && json.mobile) {
            if (curIps.indexOf(ip) + 1 === curIps.length) {
                stopAndStart()
            }
            return
        } else {
            if (settings.enableTargetCity) {
                if (!settings.targetCity.includes(json.city)) {
                    if (curIps.indexOf(ip) + 1 === curIps.length) {
                        stopAndStart()
                    }
                    return
                } else {
                    needToCheckTarget = false
                    if (settings.targetSound) {
                        targetSound.play()
                        console.dir(`FOUND TARGET CITY: ${settings.targetCity}`)
                    }
                }
            }
            if (settings.enableTargetRegion) {
                if (!settings.targetRegion.includes(json.regionName)) {
                    if (curIps.indexOf(ip) + 1 === curIps.length) {
                        stopAndStart()
                    }
                    return
                } else {
                    needToCheckTarget = false
                    if (settings.targetSound) {
                        targetSound.play()
                        console.dir(`FOUND TARGET REGION: ${settings.targetRegion}`)
                    }
                }
            }
        }
    }

    updateMap(curInfo)

    return true
}

function updateMap(json) {
    if (!$(mapTabButton).hasClass("active") || Object.keys(curInfo).length === 0) {
        return
    }

    if (typeof marker !== 'undefined')
        map.removeLayer(marker)

    if (typeof circle !== 'undefined')
        map.removeLayer(circle)

    if (settings.hideMobileLocation && json.mobile) {
        circle = L.circle([json.lat, json.lon], 300000, {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.2
        })

        map.setView(new L.LatLng(json.lat, json.lon), 5);
        marker = new L.Marker([json.lat, json.lon]);
    } else {
        circle = L.circle([json.lat, json.lon], 30000, {
            color: 'blue',
            fillColor: '#808080',
            fillOpacity: 0.1
        })

        map.setView(new L.LatLng(json.lat, json.lon), 13);
        marker = new L.Marker([json.lat, json.lon]);
    }

    map.addLayer(circle)
    map.addLayer(marker)
}

const onChangeStage = function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.attributeName === "class") {

            if (stage === 3) {
                settings.stats.time += parseInt((Date.now() - play) / 1000)
            }

            const attributeValue = $(mutation.target).prop(mutation.attributeName);
            if (attributeValue.includes("s-search")) {
                if (remoteIP.innerText !== "")
                    remoteIP.innerText = "-"
                stage = 1
                curIps = []
                needToClear = true
                needToCheckTarget = true
                // console.dir("СТАДИЯ ПОИСКА")
                // offline.play()

                clearInterval(tim)
                localStage.innerText = 1
                // remoteFace.innerHTML = ''
                if (play < search) {
                    // console.log("Dialog ended before even started")
                }

                search = Date.now()
            } else if (attributeValue.includes("s-found")) {
                // console.dir("СТАДИЯ НАШЕЛ")

                // remoteFace.innerHTML = ''
                stage = 2
                localStage.innerText = 2
                needToCheckTarget = true

                found = Date.now()
                if (requestToSkip)
                    stopAndStart()
            } else if (attributeValue.includes("s-play")) {
                // online.play()
                // console.dir("СТАДИЯ ВОСПРОИЗВЕДЕНИЯ")

                stage = 3
                localStage.innerText = 3

                clearInterval(tim)
                tim = setTimeout(detectGender, 0)

                play = Date.now()
                console.log("Loading took: ", parseFloat((play - found) / 1000).toFixed(2), "sec")


                if (requestToSkip || remoteIP.innerText === "-") {
                    requestToStartTiming = +new Date()
                    document.getElementsByClassName('buttons__button stop-button')[0].click()
                } else
                    settings.stats.countAll++
            } else if (attributeValue.includes("s-stop")) {
                // offline.play()
                clearInterval(tim)
                // console.dir("СТАДИЯ СТОП")
                if (remoteIP.innerText !== "")
                    remoteIP.innerText = "-"
                curIps = []
                // remoteInfo.innerHTML = ''
                needToClear = true
                remoteFace.innerHTML = ''

                nsfwInfo.style.display = "none"

                stage = 0
                localStage.innerText = 0

                if (requestToStartTiming !== 0 && +new Date() - requestToStartTiming < 1000) {
                    requestToStartTiming = 0
                    document.getElementsByClassName('buttons__button start-button')[0].click()
                }
            }

            updStats(false)
        }
    });
}

function syncBlackList() {
    if (settings.dontBanMobile) {
        if (!curInfo.mobile) {
            local.ips.push(remoteIP.innerText)
            chrome.storage.local.set({"ips": local.ips});

            if (settings.skipSound)
                male.play()
        }
    } else {
        local.ips.push(remoteIP.innerText)
        chrome.storage.local.set({"ips": local.ips});

        if (settings.skipSound)
            male.play()
    }
}

async function detectGender() {
    if (!settings.skipMale && !settings.skipFemale && !settings.enableFaceApi)
        return
    let stop = false
    let skip_m = false
    let skip_f = false
    let text = ''
    if (stage === 3) {
        console.time("faceapi: detectAllFaces()")

        clearInterval(tim)

        array = await faceapi.detectAllFaces(document.getElementById('remote-video'), new faceapi.TinyFaceDetectorOptions()).withAgeAndGender()

        for (let i = 0; i < array.length; i++) {
            text += `<b>* ${array[i].gender} (${(array[i].genderProbability * 100).toFixed(0) + '%'}), ${(array[i].age).toFixed(0)}</b></br>`
            if (array[i].gender === "male" && (array[i].genderProbability * 100).toFixed(0) > 90) {
                skip_m = true
                stop = true
                settings.stats.countMales++
            }
            if (array[i].gender === "female" && (array[i].genderProbability * 100).toFixed(0) > 90) {
                skip_f = true
                stop = true
                settings.stats.countFemales++
            }
        }

        if (skip_m && settings.skipMale) {
            text += `<b>male skipping...</b></br>`
            document.getElementsByClassName('buttons__button start-button')[0].click()
            console.log("MALE SKIPPED")
            settings.stats.countMaleSkip++
            settings.stats.countManSkip--

            if (settings.autoBan) {
                syncBlackList()
            }
        }

        if (skip_f && settings.skipFemale) {
            text += `<b>female skipping...</b></br>`
            document.getElementsByClassName('buttons__button start-button')[0].click()
            console.log("FEMALE SKIPPED")
            settings.stats.countFemaleSkip++
            settings.stats.countManSkip--

            if (settings.autoBan) {
                syncBlackList()
            }
        }

        if (text !== '')
            remoteFace.innerHTML = text

        console.timeEnd("faceapi: detectAllFaces()")
    }
    if (!stop)
        tim = setTimeout(detectGender, 500)
}

function checkApi() {
    console.dir(`attemping to connect to http://ip-api.com directly (will fail unless user allow unsecure content)`)
    $.getJSON("http://ip-api.com/json/", {
        fields: "status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
    }).done(function (json) {
        console.dir('direct ip-api.com connection test passed! proceeding with best possible speed')
        // best case
        api = 1
        if (settings.minimalism) {
            if ($('span[data-tr="rules"]').length === 1) {
                $("<span> </span>" + chrome.i18n.getMessage("apiStatus1")).appendTo($(".message-bubble")[0])
            }
        } else {
            apiStatus.innerHTML = ''
            remoteInfo.innerHTML = chrome.i18n.getMessage("apiStatus1") + "</br></br>" + chrome.i18n.getMessage("main")
            if ($('li.active')[0].innerText === chrome.i18n.getMessage("tab1")) {
                resizemap()
            }
        }
    }).fail(function (jqxhr, textStatus, error) {
        console.dir('direct ip-api.com connection test failed! trying to connect via extension\'s service worker')
        chrome.runtime.sendMessage({testApi: true}, function (response) {
            console.dir(`request to send test ip-api request sent to service worker: ${response}`)
        });
    });
}

function switchMode() {
    let preselect = settings.minimalism
    Swal.fire({
        title: chrome.i18n.getMessage("switchModeTitle"),
        allowOutsideClick: false,
        heightAuto: false,
        html: `${chrome.i18n.getMessage("switchModeText")}<br><br>
 <form id="modeSelector">
 <input type="radio" id="minimalism" name="mode" value="minimalism">
 <label for="minimalism">${chrome.i18n.getMessage("switchModeLabelMod1")}<br><img src="${chrome.runtime.getURL('resources/img/' + chrome.i18n.getMessage("minimalismImg"))}" style="border:1px solid" width="300px"></label><br>
 <br>
 <input type="radio" id="full" name="mode" value="full">
 <label for="full">${chrome.i18n.getMessage("switchModeLabelMod2")}</label></form>`,
        preConfirm: () => {
            let newMode = $("#modeSelector").serializeArray()[0]['value']
            if (typeof newMode === "undefined") {
                return false
            } else {
                if (!settings.askForMode && newMode === "minimalism" && preselect) {
                    return true
                } else if (!settings.askForMode && newMode === "full" && !preselect) {
                    return true
                } else {
                    if (newMode === "minimalism") {
                        chrome.storage.sync.set({askForMode: false, minimalism: true}, function (params) {
                            location.reload()
                        });
                    } else {
                        chrome.storage.sync.set({askForMode: false, minimalism: false}, function (params) {
                            location.reload()
                        });
                    }
                }
            }
        },
        didRender: () => {
            if (settings.minimalism) {
                minimalism.checked = "checked"
            } else {
                full.checked = "checked"
            }
        }
    })
}

chrome.storage.sync.get(null, function (result) {
    Sentry.wrap(function () {
        settings = result;

        let switchModeButton = createElement('button', {
            onclick: () => {
                switchMode()
            },
        }, [
            createElement('b', {
                innerText: chrome.i18n.getMessage("switchModeButtonText")
            })
        ])

        if (settings.askForMode) {
            switchMode()
            return
        } else {
            if (settings.minimalism) {
                $(createElement('p', {
                    id: "remoteIP", style: "display: none;"
                })).appendTo($("body"))

                const onChangeStageMinimalism = function (mutations) {
                    mutations.forEach(function (mutation) {
                        if (mutation.attributeName === "class") {
                            const attributeValue = $(mutation.target).prop(mutation.attributeName);
                            if (attributeValue.includes("s-search")) {
                                if (remoteIP.innerText !== "")
                                    remoteIP.innerText = "-"
                                curIps = []
                            } else if (attributeValue.includes("s-stop")) {
                                if (remoteIP.innerText !== "")
                                    remoteIP.innerText = "-"
                                curIps = []
                            }
                        }
                    });
                }

                var observer3 = new MutationObserver(onChangeStageMinimalism)
                observer3.observe(document.getElementById('remote-video-wrapper'), {attributes: true});

                const observer = new MutationObserver(onUpdateIP)
                observer.observe(document.getElementById('remoteIP'), {
                    attributes: true,
                    childList: true,
                    characterData: true
                });


                $(document).arrive("[data-tr=\"rules\"]", function (el) {
                    $("<br><br>").appendTo($(".message-bubble")[0])
                    $(switchModeButton).appendTo($(".message-bubble")[0])
                    checkApi()
                });
                return true
            }
        }

        $(document).arrive("[data-tr=\"rules\"]", function (el) {
            $("<br><br>").appendTo($(".message-bubble")[0])
            $(switchModeButton).appendTo($(".message-bubble")[0])
            $(document).unbindArrive("[data-tr=\"rules\"]");
        });

        (document.head || document.documentElement).appendChild(c);
        (document.head || document.documentElement).appendChild(cs);
        (document.head || document.documentElement).appendChild(css);

        document.getElementsByClassName('buttons__button start-button')[0].addEventListener("click", (e) => {
            if (stage === 3)
                settings.stats.countManSkip++

            clearTimeout(timeout)
        })

        document.getElementsByClassName('buttons__button stop-button')[0].addEventListener("click", (e) => {
            if (e.pointerType !== "") {
                remoteInfo.innerHTML = chrome.i18n.getMessage("main")
                checkApi()
            }
            clearTimeout(timeout)
        })

        injectInterface()

        setInterval(() => {
            if (document.getElementsByClassName("remoteTM").length > 0) {
                if (localStage.innerText === "3") {
                    for (let el of document.getElementsByClassName("remoteTM")) {
                        el.innerText = secondsToHms(+new Date() / 1000 - startDate)
                    }
                }
            }
            if (document.getElementsByClassName("remoteTZ").length > 0 && document.getElementsByClassName("remoteTime").length > 0) {
                for (let el of document.getElementsByClassName("remoteTime")) {
                    try {
                        el.innerText = new Date().toLocaleTimeString("ru", {timeZone: $(el).parent().find('.remoteTZ')[0].innerText}).slice(0, -3)
                    } catch {
                        el.innerText = "???"
                    }
                }
            }
        }, 1000)

        checkApi()

        if (settings.hideLogo) {
            try {
                document.getElementById("logo-link").style.display = "none"
            } catch (e) {
                console.dir(e)
            }
        }

        if (settings.hideHeader) {
            $("#header").hide()
            app.style.height = "100%"
            window.dispatchEvent(new Event('resize'));
        }

        if (settings.hideWatermark || settings.streamer) {
            try {
                document.getElementsByClassName("remote-video__watermark")[0].style.display = "none"
            } catch (e) {
                console.dir(e)
            }
        }

        if (settings.hideBanner || settings.streamer) {
            try {
                document.getElementsByClassName("caption remote-video__info")[0].style.display = "none"
            } catch (e) {
                console.dir(e)
            }
        }

        if (settings.doNotReflect) {
            $("#local-video").removeClass("video-container-local-video")
        }

        if (settings.doNotCover) {
            $("#remote-video").css({"object-fit": "contain"})
            // $(".preview").css({"background-size": "contain"})
        }

        if (settings.hideCamera) {
            $("#local-video-wrapper")[0].style.display = "none"
        }

        setInterval(() => {
            if (settings.skipFourSec) {
                try {
                    if ((stage === 2) && (found + 4000 < Date.now())) {
                        console.dir("Skipping due to loading time limit")
                        document.getElementsByClassName('buttons__button start-button')[0].click()
                        //settings.stats.countManSkip--
                    }
                } catch (e) {
                    //console.dir(e)
                }
            }
        }, 1000)

        if (settings.autoResume) {
            document.getElementById('overlay').style.background = "none"
            // document.getElementById('overlay').style.position = "unset"

            document.getElementById('local-video-warning-popup').style.filter = "opacity(0)"
            new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                        if (mutation.attributeName === "class") {
                            if (mutation.target.className.includes("disabled")) {
                                $(".ok").removeClass("disabled")
                                document.getElementsByClassName("video-warning__btn")[0].firstElementChild.click()
                            }
                        }
                    }
                )
            }).observe($(".ok")[0], {attributes: true});
        }

        if (!settings.ipApiLocalisation)
            language = "en"

        if (settings.hotkeys) {
            document.removeEventListener('keyup', hotkeys)
            document.addEventListener('keyup', hotkeys)
        }

        if (settings.skipMale || settings.skipFemale || settings.enableFaceApi) {
            setTimeout(async () => {
                console.time("faceapi: loading models")
                await faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('resources/models'))
                await faceapi.nets.ageGenderNet.loadFromUri(chrome.runtime.getURL('resources/models'))
                console.timeEnd("faceapi: loading models")

                console.time("faceapi: initial facedetect")
                remoteFace.innerHTML = chrome.i18n.getMessage("initialFaceDetect")
                let tempImage = document.createElement('img')
                tempImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY/j//z8ABf4C/qc1gYQAAAAASUVORK5CYII="
                await faceapi.detectAllFaces(tempImage, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender()
                console.timeEnd("faceapi: initial facedetect")
                remoteFace.innerHTML = ""

                faceApiLoaded = true

                tim = setTimeout(detectGender, 200)
            }, 0)
        }

        if (settings.risky) {
            if (settings.mirror || settings.mirrorAlt || settings.prikol) {
                if (settings.prikol && isDevMode()) {
                    const prikolV = document.createElement('video');
                    prikolV.id = "prikol"
                    prikolV.loop = "loop"
                    prikolV.autoplay = "autoplay"
                    prikolV.muted = true
                    prikolV.src = chrome.runtime.getURL('resources/prikol.mp4');
                    prikolV.width = 0
                    prikolV.onload = () => s1.remove();

                    app.appendChild(prikolV);
                }

                const s1 = document.createElement('script');
                s1.src = chrome.runtime.getURL('injection/camera-hijack.js');
                s1.onload = () => s1.remove();
                (document.head || document.documentElement).appendChild(s1);
            }

            if (settings.ws) {
                if (settings.wsconfig.theyskipsound) {
                    skip = document.createElement("AUDIO");
                    skip.id = "skip"
                    skip.src = chrome.runtime.getURL('resources/audio/skip.mp3')
                    document.body.appendChild(skip)
                    skip.volume = 0.3
                }

                const purify = document.createElement('script');
                purify.src = chrome.runtime.getURL('libs/js/purify.min.js');
                purify.onload = () => wss.remove();
                (document.head || document.documentElement).appendChild(purify);

                const wss = document.createElement('script');
                wss.src = chrome.runtime.getURL('injection/ws.js');
                wss.onload = () => wss.remove();
                (document.head || document.documentElement).appendChild(wss);
            }
        }

        if (settings.streamer) {
            if (settings.blurReport)
                document.getElementById("report-screen").style.filter = "blur(10px)"

            if (settings.cover || settings.coverPreview || settings.coverNoise || settings.coverStop) {
                $(createElement('img', {
                    src: settings.coverSrc,
                    id: "cover",
                    style: "height:100%; position: absolute; display:none"
                })).insertBefore("#remote-video")

                $(createElement('img', {
                    src: settings.coverSrc,
                    id: "cover2",
                    style: "height:100%; position: absolute; transform: scaleX(-1)"
                })).insertBefore("#local-video")

                $(".remote-video__preview").insertBefore("#cover")

                $(".remote-video__noise").insertBefore("#cover")
            }

            if (settings.nsfw && isDevMode()) {
                const nsfwjs = document.createElement('script');
                nsfwjs.src = chrome.runtime.getURL('libs/js/nsfwjs.min.js');
                nsfwjs.onload = () => {
                    nsfwjs.remove()
                    const nsfw = document.createElement('script');
                    nsfw.src = chrome.runtime.getURL('injection/streamer-mode.js');
                    nsfw.onload = () => nsfw.remove();
                    (document.head || document.documentElement).appendChild(nsfw);
                };
                (document.head || document.documentElement).appendChild(nsfwjs);
            } else {
                const nsfw = document.createElement('script');
                nsfw.src = chrome.runtime.getURL('injection/streamer-mode.js');
                nsfw.onload = () => nsfw.remove();
                (document.head || document.documentElement).appendChild(nsfw);
            }
        }

        if (settings.darkMode)
            (document.body || document.documentElement).appendChild(dark);

        new ResizeObserver(outputsize).observe(document.getElementById("overlay"))

        const observer = new MutationObserver(onUpdateIP)
        observer.observe(document.getElementById('remoteIP'), {attributes: true, childList: true, characterData: true});

        var observer2 = new MutationObserver(onChangeStage)
        observer2.observe(document.getElementById('remote-video-wrapper'), {attributes: true});

        if (!settings.swalInfoCompleted) {
            showSwalInfo()
        } else {
            if (settings.lastVersion !== chrome.runtime.getManifest().version) {
                showSwalChangelog(settings.lastVersion)
            } else {
                if (settings.showDangerWarning && settings.risky) {
                    showDangerWarning()
                }
            }
        }

        chrome.storage.sync.set({lastVersion: chrome.runtime.getManifest().version})
    })
});