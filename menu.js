const menuVars = {
    buttons: undefined,

    SELECTABLE_COLOR: "rgb(200,200,200)",
    HOVER_COLOR: "rgb(150, 150, 150)",
    INVALID_COLOR: "rgb(100, 100, 100)",

    selected: undefined
}

function initMenu() {
    const buttons = Array.from(document.getElementsByClassName("inputButton"));
    menuVars.buttons = buttons;
    buttons.forEach(element => {
        element.addEventListener("mouseover", onHover);
        element.addEventListener("mouseleave", onLeave);
    });
    updateButtonBackgrounds();

    document.getElementById("restart").addEventListener("click", restartClick);
    document.getElementById("back").addEventListener("click", backClick);
    document.getElementById("forward").addEventListener("click", forwardClick);
    document.getElementById("run").addEventListener("click", runClick);

    document.getElementById("dfaInput").addEventListener("keyup", onInputKeyChange);
    document.getElementById("dfaInput").addEventListener("mousedown", onInputMouseDownChange);

    document.addEventListener("click", setSelected);
}

// Since The user will sometimes click on the image inside a buttion,
// instead of the button itself, getbutton gets the actual button element
function getButton(target) {
    if (!menuVars.buttons.includes(target)) return target.parentElement;
    return target;
}

function onHover(event) {
    let target = getButton(event.target);
    if (canClick(target)) {
        target.style.background = menuVars.HOVER_COLOR;
    }
}

function onLeave(event) {
    updateButtonBackgrounds();
}

function canClick(button) {
    if (vars.DFAResults === undefined) return false;
    if ((button.id === "restart" || button.id === "back")
         && vars.DFAIndex <= -1) return false;
    if ((button.id === "run" || button.id === "forward")
        && vars.DFAIndex >= vars.DFAResults.states.length-2) {
        return false;
    }
    return true;
}

function restartClick(event) {
    let target = getButton(event.target);
    if (!canClick(target)) return;
    vars.DFAIndex = -1;
    updateInput();
    updateButtonBackgrounds();
    sandboxDraw();
}

function backClick(event) {
    let target = getButton(event.target);
    if (!canClick(target)) return;
    vars.DFAIndex -= 1;
    updateInput();
    updateButtonBackgrounds();
    sandboxDraw();
}

function forwardClick(event) {
    let target = getButton(event.target);
    if (!canClick(target)) return;
    vars.DFAIndex += 1;
    updateInput();
    updateButtonBackgrounds();
    sandboxDraw();
}

function runClick(event) {
    let target = getButton(event.target);
    if (!canClick(target)) return;
    vars.DFAIndex = vars.DFAResults.states.length-2;
    updateInput();
    updateButtonBackgrounds();
    sandboxDraw();
}

function updateInput() {
    let dfaInput = document.getElementById("dfaInput");
    let inputText = dfaInput.innerHTML.replaceAll(/<.+?>/g, "");
    let seen = inputText.substring(0, vars.DFAIndex + 1);
    let unseen = inputText.substring(vars.DFAIndex + 1);
    let highlight; 
    if (vars.DFAResults !== undefined
        && vars.DFAResults.states[vars.DFAIndex+1] != undefined
        && vars.DFAResults.states[vars.DFAIndex+1].accepting) {
            highlight = vars.ACCEPT_COLOR;
        }
    else {
        highlight = vars.REJECT_COLOR;
    }
    let newHTML = `<span style="background-color:${highlight}">${seen}</span>${unseen}`;
    dfaInput.innerHTML = newHTML;
}

function updateButtonBackgrounds() {
    menuVars.buttons.forEach(element => {
        if (!canClick(element)) {
            element.style.background = menuVars.INVALID_COLOR;
        }
        else {
            element.style.background = menuVars.SELECTABLE_COLOR;
        }
    });
}

function resetDFA() {
    const input = document.getElementById("dfaInput").textContent;
    vars.DFAIndex = -2;
    vars.DFAResults = vars.DFA.evaluate(input);
    updateButtonBackgrounds();
}

function onInputKeyChange(event) {
    resetDFA();
    sandboxDraw();
}

function setSelected(event) {
    menuVars.selected = event.target;
    if (event.target == undefined || event.target.id != "dfaInput") {
        window.getSelection().removeAllRanges();
    }
}

function onInputMouseDownChange(event) {
    resetDFA();
    // If Wasn't already selecting input bar, reset it
    console.log(event.target.childNodes)
    if (menuVars.selected == undefined || menuVars.selected.id != "dfaInput") {
        updateInput();
        window.getSelection().removeAllRanges();
        if (event.target.childNodes.length > 1) {
            event.preventDefault();
            const range = document.createRange();
            range.setStart(event.target.childNodes[1], 0);//Fix This
            range.setEnd(event.target.childNodes[1], event.target.childNodes[1].length);
            window.getSelection().addRange(range);
        }
    }
    sandboxDraw();
}

