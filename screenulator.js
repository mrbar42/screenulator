(function (win, doc) {
    "use strict";

    var css = function (elem, attr, value) {
        if (typeof attr == "object" && !attr.length) {
            for (var p in attr) {
                if (!attr.hasOwnProperty(p)) {
                    continue
                }
                elem.style[p] = attr[p];
            }
        } else if (attr && (value || value === "")) {
            elem.style[attr] = value;
        } else if (attr) {
            return elem.style[attr];
        }
    };
    var on = function (elem, event, handler, useCapture) {
        elem.addEventListener(event, handler, useCapture);
    };
    var child = function (parent, tag, klass, html, attr, event) {
        var elem = document.createElement(tag || "div");

        if (klass) {
            klass.split(" ").forEach(function (item) {
                elem.classList.add(item);
            })
        }

        var htm = typeof html != "object" && typeof html != "function" && html || "";
        var att = typeof html == "object" && !html.length && html || typeof attr !== 'function' && attr;
        var ev = typeof html == "object" && html.length && html || typeof attr == "object" && attr.length && attr || event;

        elem.innerHTML = htm;
        if (att) {
            for (var key in att) {
                if (!att.hasOwnProperty(key)) continue;
                elem.setAttribute(key, att[key]);
            }
        }

        if (typeof arguments[arguments.length - 1] == "function") {
            on(elem, 'click', arguments[arguments.length - 1], false);
        } else if (ev) {
            on(elem, ev[0], ev[1], ev[2] || false);
        }

        parent.appendChild(elem);
        return elem
    };

    var p = {};
    p.settings = {
        sizeDivider: 4 // 1:x scaling factor. example: 2 means half of the actual size
        , maxWidth: 800 // maximum width of the simulator div (in case of a big screen)
        , maxHeight: 600 // maximum height of the simulator div (in case of a big screen)
        , offsetMonitorInterval: 100 // browser offset changes monitor interval in ms
        , maxLocationBar: 150 // max size of location bar height in pixels
    };
    p.conf = {
        contextThreshold: 3 // mouse events to wait before hiding the context menu (minimum 2)
        , contextMenu: 0
        , computedDivider: 0
        // js browser detection
        , isOpera: function () {return !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0}()
        , isFirefox: function () {return typeof InstallTrigger !== 'undefined'}()
        , isSafari: function () {return Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0}()
        , isChrome: function () {return !!window.chrome && !window.opera && navigator.userAgent.indexOf(' OPR/') == -1}()
        , isIE: function () {return !!document.documentMode}()
        , lastMouseEvent: 0
    };
    p.html = null;
    p.data = {
        screenWidth: win.screen.width
        , screenHeight: win.screen.height
        , availWidth: win.screen.availWidth
        , availHeight: win.screen.availHeight
        , innerWidth: 0
        , innerHeight: 0
        , offsetLeft: 0
        , offsetTop: 0
        , pageWidth: 0
        , pageHeight: 0
        , misc: (win.outerHeight - win.innerHeight) < 100 ? win.outerHeight - win.innerHeight : 100 // make sure dev tools is not open
        , locationBar: 0
        , devTools: 0
        , browserMargin: 0
        , statusBar: 0
        , statusBarPosition: "unknown"
        , statusBarLower: 0
        , statusBarUpper: 0
        , sidePanel: 0
        , sidePanelPosition: "unknown"
        , sidePanelLower: 0
        , sidePanelUpper: 0
    };
    p.UI = {
        screenXY: null,
        statusBar: null,
        sidePanel: null,
        outerXY: null,
        innerXY: null,
        offsetX: null,
        offsetY: null,
        isMaximizedY: null,
        isMaximizedX: null,
        pageXY: null,
        mouseScreen: null,
        mouseClient: null,
        mousePage: null
    };

    p.htmlInit = function () {
        var data = p.data;

        var body = doc.body || doc.getElementsByTagName('body')[0];

        var appHtml = child(doc.body);
        child(appHtml, 'header', 0, "Screenulator");

        var main = child(appHtml, 0, "main");
        /// Simulator ///
        // Screen
        var screen = p.UI.screen = child(main, 0, "screen");
        // status bars
        p.UI.statusBarLower = child(screen, 0, "statusBarLower");
        p.UI.statusBarUpper = child(screen, 0, "statusBarUpper");
        // side panels
        p.UI.sidePanelLeft = child(screen, 0, "sidePanelLeft");
        p.UI.sidePanelRight = child(screen, 0, "sidePanelRight");

        // Browser
        var browser = p.UI.browser = child(screen, 0, "browser");
        p.UI.locationBar = child(browser, 0, "locationBar");
        p.UI.devTools = child(browser, 0, "devTools");

        // Mouse
        // mouse cursor and context menu
        p.UI.cursor = child(browser, 0, "cursor");
        p.UI.context = child(browser, 0, "contextMenu");


        var description = "<span class='big'>What is Screenulator?</span><br>" +
            "Screenulator is simulator of your browser window with the available data about the " +
            "browser and hosting Operating system through javascript.<br>" +
            "the simulator is based on real time data retrieved from the browser api.<br><br><br>" +
            "<span class='big'>What can it do?</span><br>" +
            "Screenulator tracks the following features:<br>" +
            "- Screen size<br>" +
            "- Operating system status bars and side panels<br>" +
            "- Browser window size and location (offsets)<br>" +
            "- HTML page size <br>" +
            "- Mouse move across browserwindow<br>" +
            "- Mouse right click (context menu)<br>" +
            "- Browser's toolbars: location bar, status bar, bookmark bar etc<br>" +
            "- Developer tools opening (bottom only)<br><br><br>" +
            "<span class='big'>What was it made for?</span><br>" +
            "Screenulator was built to for educational and demonstartion purposes.<br>" +
            "I did it as an 'in the air' project, meaning i worked on it long flights to stay sane after that many hours." +
            "<br><br><br>" +
            "Feel free to move your browser and see the data and the illustration update dynamically";
        child(main, 0, "description", description);

        child(main, 'div', "ratio", "Simulator ratio <small>(higher = smaller)</small>&nbsp;&nbsp;&nbsp;&nbsp;<b>1&nbsp;:&nbsp;</b>");
        child(main, "input", "sizeDevider", {type: "number", value: p.settings.sizeDivider}, ['input', function () {
            p.conf.computedDivider = p.getSizeDivider(this.value||0);
            p.changesMonitor();
        }]);
        child(main, 'small', "ratioNotes", "* the simulator is limited to max-width of " + p.settings.maxWidth + "px and max-height of " + p.settings.maxHeight + "px<br>" +
            "* The value may be modified to preserve aspect ratio");

        var createField = function (parent, nameSpace, initialHTML, txt) {
            var box = child(parent, 0, "textBox");
            p.UI[nameSpace] = child(box, 0, "valueBox", initialHTML);
            child(box, 0, "textNote", txt);
        };

        // Textual data
        var mouseBox = child(main, 0, "fieldsBox");
        var mouseTitle = child(mouseBox, 0, 0, "<span>Mouse info:</span>");
        child(mouseTitle, 0, "mouseToggle" + (p.data.noMouse?' disabled':''), "Mouse track", function () {
            if (p.data.noMouse) {
                p.toggleMouse(false);
                this.classList.remove("disabled");
            }
            else {
                p.toggleMouse(true);
                this.classList.add("disabled");
            }
        });


        createField(mouseBox,
            'mouseScreen',
            "",
            "Mouse XY relative to <u>monitor's</u> border<br>" +
            "<small>example: If the browser doesn't touch the wall,<br>" +
            "the value will be equals to the browser's window offset</small><br>" +
            "<code>document.onmousemove = function (e) {e.screenX + 'x' + e.screenY}</code><br>");

        createField(mouseBox,
            'mouseClient',
            "",
            "Mouse XY relative to browser's <u>inner space</u> (innerWidth/Height box)<br>" +
            "<small>example: If mouse touches the ceiling of the page,<br>" +
            "Y will always show 0 regardless to browser window location and page scroll</small><br>" +
            "<code>document.onmousemove = function (e) {e.clientX + 'x' + e.clientY}</code><br>");

        createField(mouseBox,
            'mousePage',
            "",
            "Mouse XY relative to <u>page layer</u><br>" +
            "<small>example: If the page is scrolled down by 200px and the mouse wil touch the ceiling,<br>" +
            "clientY will be 0 while pageY will be 200px</small><br>" +
            "<code>document.onmousemove = function (e) {e.pageX + 'x' + e.pageY}</code><br>");


        var screenBox = child(main, 0, "fieldsBox", "<div>Screen info:</div>");
        createField(screenBox,
            'screenXY',
            "Screen Size: " + data.screenWidth + "x" + data.screenHeight,
            "Monitor size - usually only one monitor is reported even if there are are more.<br>" +
            "<code>screen.width, screen.height</code><br>");
        createField(screenBox,
            'statusBar',
            "Status bar position: unknown",
            "Shows operating system top/bottom bars<br>" +
            "<small>* Maximize the window to update data<br>" +
            "* Firefox is not supported because the way it calculates window.screen.availHeight/Width<br>" +
            "* Browsers usually don't update status bar changes until complete browser restart</small>" +
            "<code>var totalBars = screen.height -  screen.availHeight</code>" +
            "<code class='snippet' onclick='this.classList.add(\"expanded\")'>" +
            "click to show expanded snippet...<br><br>" +
            "if (screen.availHeight == outerHeight) { // meaning Y axis is maximized<br>" +
            "&nbsp;&nbsp;if (!data.statusBar) {<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarPosition = 'none';<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarLower = 0;<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarUpper = 0;<br>" +
            "&nbsp;&nbsp;}<br>" +
            "&nbsp;&nbsp;else if (data.offsetTop == data.statusBar) {<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarPosition = 'top';<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarLower = 0;<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarUpper = data.offsetTop;<br>" +
            "&nbsp;&nbsp;}<br>" +
            "&nbsp;&nbsp;else if (data.offsetTop < data.statusBar<br>&& data.offsetTop > 0 && data.offsetBottom > 0) {<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarPosition = 'both';<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarLower = data.offsetBottom;<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarUpper = data.offsetTop;<br>" +
            "&nbsp;&nbsp;}<br>" +
            "&nbsp;&nbsp;else if (data.offsetBottom == data.statusBar) {<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarPosition = 'bottom';<br>" +
            "&nbsp;&nbsp;&nbsp;&nbsp;data.statusBarLower = data.offsetBottom;data.statusBarUpper = 0;<br>" +
            "&nbsp;&nbsp;}<br>" +
            "}</code><br>");
        createField(screenBox,
            'sidePanel',
            "",
            "Same as status bars for side panels on X axis<br>" +
            "<code>var totalPanels = screen.width -  screen.availWidth</code>");

        var browserBox = child(main, 0, "fieldsBox", "<div>Browser window:</div>");
        createField(browserBox,
            'outerXY',
            "Width/Height: " + data.outerWidth + "x" + data.outerHeight,
            "Browser window external border" +
            "<code>outerWidth, outerHeight</code><br>");

        createField(browserBox,
            'innerXY',
            "Usable screen: " + data.innerWidth + "x" + data.innerHeight,
            "Inner space between browser window not including location bar, bookmark bar etc.<br>" +
            "This is the actual space the page is rendering on<br>" +
            "<code>outerWidth, outerHeight</code><br>");

        createField(browserBox,
            'offsetX',
            "Offset Left: " + data.offsetLeft,
        "Browser window offset from monitor's left wall<br>" +
        "<code>var offsetLeft = screenLeft || screenX</code><br>");

        createField(browserBox,
            'offsetY',
            "Offset Top: " + data.offsetTop,
            "Browser window offset from monitor's top ceiling<br>" +
            "<code>var offsetTop = screenTop || screenY</code><br>");

        createField(browserBox,
            'isMaximizedY',
            "isMaximizedY: False",
        "<b>Calculated!</b> States that the browser is maximized on the vertical (y) axis" +
        "<small>* Firefox is not supported because the way it calculates window.screen.availHeight/Width</small>" +
        "<code>var isMaximizedY = screen.availHeight === outerHeight</code><br>");

        createField(browserBox,
            'isMaximizedX',
            "isMaximizedX: False",
            "<b>Calculated!</b> States that the browser is maximized on the horizontal (x) axis" +
            "<small>* Firefox is not supported because the way it calculates window.screen.availHeight/Width</small>" +
            "<code>var isMaximizedX = screen.availWidth === outerWidth</code><br>");

        createField(main,
            'pageXY',
            "HTML Page size: " + data.pageWidth + "x" + data.pageHeight,
            "The rendered HTML size.<br>" +
            "<small>example: if 'pageY' is larger than 'innerHeight' a vertical scrolling bar will appear</small><br>" +
            "<code>var pageX = document.body.scrollWidth<br>" +
            "var pageY = document.body.scrollHeight</code><br>");



        var footer = child(appHtml);

        var footerText = "This website is open source. the source code can be found at " +
            "<a href='https://github.com/mrbar42/screenulator'>https://github.com/mrbar42/screenulator</a>.<br>" +
            "";
        child(footer, 'footer', 0, footerText);

        body.appendChild(appHtml);
    };
    p.fetchScreenData = function () {
        var data = p.data;

        // screen
        data.screenWidth = win.screen.width; // screen width
        data.screenHeight = win.screen.height; // screen height
        data.innerWidth = win.innerWidth; // available width
        data.innerHeight = win.innerHeight; // available height
        // browser
        data.outerWidth = win.outerWidth; // Browser window width
        data.outerHeight = win.outerHeight; // browser window height
        data.offsetLeft = win.screenLeft || win.screenX; // offset left
        data.offsetTop = win.screenTop || win.screenY; // offset top
        data.browserMargin = win.outerWidth - data.innerWidth; // browser sideBars
        data.offsetBottom = data.screenHeight - (data.outerHeight + data.offsetTop); // bottom offset of browser window
        data.offsetRight = data.screenWidth - (data.outerWidth + data.offsetLeft); // right offset of browser window

        // status bars and side panel detection
        data.isMaximizedY = data.availHeight == data.outerHeight; // check if browser is maximized vertically
        data.isMaximizedX = data.availWidth == data.outerWidth; // check if browser is maximized horizontally
        data.statusBar = data.screenHeight - data.availHeight;
        data.sidePanel = data.screenWidth - data.availWidth;
        // location bar and developer tools
        var misc = win.outerHeight - data.innerHeight;
        misc = misc >= 0 ? misc : 0;
        if (misc > p.settings.maxLocationBar && misc - data.misc > 50) {
            // assume only location bar
            data.locationBar = data.misc;
            data.devTools = misc - data.misc;
        }
        else if (misc > p.settings.maxLocationBar) {
            data.locationBar = p.settings.maxLocationBar; // browser location bar height
            data.devTools = misc - p.settings.maxLocationBar;
        }
        else {
            data.misc = misc >= 0 ? misc : 0;
            data.locationBar = misc; // browser location bar height
            data.devTools = 0;
        }

        // page
        data.pageWidth = doc.body.parentNode.scrollWidth; // page width
        data.pageHeight = doc.body.parentNode.scrollHeight; // page height

        // OS status bar location and size on Y axis
        if (data.isMaximizedY) {
            data.verifiedY = 1;
            if (!data.statusBar) {
                data.statusBarPosition = 'none';
                data.statusBarLower = 0;
                data.statusBarUpper = 0;
            }
            else if (data.offsetTop == data.statusBar) {
                data.statusBarPosition = 'top';
                data.statusBarLower = 0;
                data.statusBarUpper = data.offsetTop;
            }
            else if (data.offsetTop < data.statusBar && data.offsetTop > 0 && data.offsetBottom > 0) {
                data.statusBarPosition = 'both';
                data.statusBarLower = data.offsetBottom;
                data.statusBarUpper = data.offsetTop;
            }
            else if (data.offsetBottom == data.statusBar) {
                data.statusBarPosition = 'bottom';
                data.statusBarLower = data.offsetBottom;
                data.statusBarUpper = 0;
            }
        }

        // OS side panels location and size on X axis
        if (data.isMaximizedX) {
            data.verifiedX = 1;
            if (!data.sidePanel) {
                data.sidePanelPosition = 'none';
                data.sidePanelLeft = 0;
                data.sidePanelRight = 0;
            }
            else if (data.offsetLeft == data.sidePanel) {
                data.sidePanelPosition = 'left';
                data.sidePanelLeft = data.offsetLeft;
                data.sidePanelRight = 0;
            }
            else if (data.offsetRight == data.sidePanel) {
                data.sidePanelPosition = 'right';
                data.sidePanelLeft = 0;
                data.sidePanelRight = data.offsetRight;
            }
            else if (data.offsetLeft < data.sidePanel && data.offsetLeft  && data.offsetRight) {
                data.sidePanelPosition = 'both';
                data.sidePanelLeft = data.offsetLeft;
                data.sidePanelRight = data.offsetRight;
            }
        }
    };

    p.getSizeDivider = function (base) {
        var data = p.data;
        var divider = base || p.settings.sizeDivider || 0;

        // calculate the maximum divider for given screen width & height
        var widthDivider = data.screenWidth / (p.settings.maxWidth - 2);
        var heightDivider = data.screenHeight / (p.settings.maxHeight - 2);

        // restrain to lowest divider
        if (widthDivider > divider) {
            divider = widthDivider
        }
        if (heightDivider > divider) {
            divider = heightDivider
        }

        return divider
    };

    p.changesMonitor = function () {
        p.fetchScreenData();
        p.updateGraphics();
    };

    p.updateGraphics = function () {
        // scale the numbers to a mini model
        var divider = p.conf.computedDivider;
        var data = p.data;
        // set screen size - add
        css(p.UI.screen, {
            width: data.screenWidth / divider
            , height: data.screenHeight / divider
        });

        // browser window
        var locBar = data.locationBar / divider;
        //var margin = data.browserMargin / 2 / divider;
        //margin = margin >= 1 ? margin : 1;
        var browserBorder = 2;
        var devTools = data.devTools / divider;
        devTools = devTools >= 1 ? devTools : 1;
        css( p.UI.browser, {
            width: (data.outerWidth / divider) - (browserBorder * 2)
            , height: (data.outerHeight / divider) - browserBorder
            , left: data.offsetLeft / divider
            , top: data.offsetTop / divider
        });

        css(p.UI.locationBar, {
            height: locBar - 1
        });

        css(p.UI.devTools, {
            height: devTools - 1
        });

        // status bar
        if (data.verifiedY) {
            // OS bottom bar height
            css(p.UI.statusBarLower, {
                height: data.statusBarLower / divider
            });
            // OS top bar height
            css(p.UI.statusBarUpper, {
                height: data.statusBarUpper / divider
            });
        }
        else {
            // OS bottom bar height
            css(p.UI.statusBarLower, {
                height: data.statusBar / divider
            });
        }

        // side panel
        if (data.verifiedX) {
            // OS left panel
            css(p.UI.sidePanelLeft, {
                width: data.sidePanelLeft / divider - 1
                , height: (data.screenHeight - data.statusBar) / divider - 2
                , marginTop: data.statusBarUpper / divider
            });
            // OS right panel
            css(p.UI.sidePanelRight, {
                width: data.sidePanelRight / divider - 1
                , height: (data.screenHeight - data.statusBar) / divider - 2
                , marginTop: data.statusBarUpper / divider
            });
        }


        // update data

        p.UI.screenXY.innerHTML = "Screen Size: " + data.screenWidth + "x" + data.screenHeight;
        // status bar position
        var bars = '';
        switch (data.statusBarPosition) {
            case 'top'   : bars = 'top ' + data.statusBarUpper + 'px'; break;
            case 'bottom': bars = 'bottom ' + data.statusBarLower + 'px'; break;
            case 'both'  : bars = 'top ' + data.statusBarUpper + 'px & bottom ' + data.statusBarLower + 'px'; break;
            case 'none'  : bars = 'none'; break;
            default      : bars = 'unknown'; break;
        }
        p.UI.statusBar.innerHTML = "Status bar: " + bars;


        // side panel position
        var panels = '';
        switch (data.statusBarPosition) {
            case 'left'   : panels = 'left ' + data.sidePanelLeft + 'px'; break;
            case 'right': panels = 'right ' + data.sidePanelRight + 'px'; break;
            case 'both'  : panels = 'left ' + data.sidePanelLeft + 'px & right ' + data.sidePanelRight + 'px'; break;
            case 'none'  : panels = 'none'; break;
            default      : panels = 'unknown'; break;
        }
        p.UI.sidePanel.innerHTML = "Side panel: " + data.sidePanelPosition;


        p.UI.outerXY.innerHTML = "Width/Height: " + data.outerWidth + "x" + data.outerHeight;
        p.UI.innerXY.innerHTML = "Usable screen: " + data.innerWidth + "x" + data.innerHeight;

        p.UI.offsetX.innerHTML = "Offset Left: " + data.offsetLeft;
        p.UI.offsetY.innerHTML = "Offset Top: " + data.offsetTop;

        // isFullScreen boolean
        p.UI.isMaximizedY.innerHTML = "isMaximizedY: " + (data.isMaximizedY ? "True" : "False");
        p.UI.isMaximizedX.innerHTML = "isMaximizedX: " + (data.isMaximizedX ? "True" : "False");

        // page data
        p.UI.pageXY.innerHTML = "Page size: " + data.pageWidth + "x" + data.pageHeight;
    };

    p.offsetMonitor = function () {
        // offset change detector
        var lastLeft, lastTop;
        setInterval(function () {
            var left = win.screenLeft || win.screenX;
            var top = win.screenTop || win.screenY;
            if (lastLeft !== left || lastTop !== top) {
                lastLeft = left;
                lastTop = top;
                // offset changed - fetch new data
                p.changesMonitor();
            }
        }, p.settings.offsetMonitorInterval);
    };

    p.mouseMonitor = function (e) {
        e = e || window.event; // IE-ism
        var divider = p.conf.computedDivider;

        // skip first mouse move to avoid false contextMenu hiding
        if (p.conf.contextMenu) {
            if (++p.conf.contextMenu > p.conf.contextThreshold) {
                p.UI.context.style.display = "none";
                p.conf.contextMenu = 0;
            }
            else {
                return
            }
        }

        p.conf.lastMouseEvent = e;

        if (!p.conf.lastMouseTimer) {
            p.conf.lastMouseTimer = true;
            setTimeout(function () {
                var e = p.conf.lastMouseEvent;

                p.UI.mouseScreen.innerHTML = "e.screenX/Y: " + e.screenX + "x" + e.screenY;
                p.UI.mouseClient.innerHTML = "e.clientX/Y: " + e.clientX + "x" + e.clientY;
                p.UI.mousePage.innerHTML = "e.pageX/Y: " + e.pageX + "x" + e.pageY;

                p.UI.cursor.style.left = e.clientX / divider;
                p.UI.cursor.style.top = e.clientY / divider;

                p.conf.lastMouseTimer = false;
            }, 70);
        }
    };

    p.contextMenu = function (e) {
        e = e || window.event; // IE-ism
        var divider = p.conf.computedDivider;
        css(p.UI.context, {
            left: e.clientX / divider
            , top: e.clientY / divider
            , width: 170 / divider
            , height: 250 / divider
            , display: "inline-block"
        });
        p.conf.contextMenu++;
    };

    p.saveData = function () {
        // stringify and save
        win.localStorage.setItem("screenulator", JSON.stringify(p.data));
    };

    p.loadData = function () {
        // load data and attach to main object
        var data = JSON.parse(win.localStorage.getItem("screenulator"));
        if (data) {
            p.data = data;
            p.data.availWidth = win.screen.availWidth;
            p.data.availHeight = win.screen.availHeight;
        }
    };

    p.toggleMouse = function (disable) {
        if (disable) {
            window.onmousemove = null;
            document.oncontextmenu = null;
            document.onmousedown = null;
            p.data.noMouse = true;
        }
        else {
            // track mouse move
            window.onmousemove = p.mouseMonitor;
            // monitor context menu opening
            document.oncontextmenu = p.contextMenu;
            // hide menu on mouse click
            document.onmousedown = function () {
                css(p.UI.context, "display", "none");
                p.conf.contextMenu = 0;
            };
            p.data.noMouse = false;
        }

    };

    win.appInit = function () {
        // load save data
        p.loadData();

        // init HTML and save reference
        p.html = p.htmlInit();

        // get initial screen data
        p.fetchScreenData();

        // calculate size divider
        p.conf.computedDivider = p.getSizeDivider();

        // listen to browser resize events
        win.onresize = p.changesMonitor;

        // lister for offset changes
        p.offsetMonitor();

        // monitor mouse
        p.toggleMouse(p.data.noMouse);

        // firefox continues to fire mouse move events even when the context menu is opened.
        // override: auto hide menu after X mouse moves
        if (p.conf.isFirefox) {
            p.conf.contextThreshold = 50;
        }

        // save data on page exit
        win.onbeforeunload = function () {
            p.saveData()
        };
    };

    window.p = p;
    // trigger module on window load
    window.onload = function () {
        window.appInit();
    }
})(window, document);