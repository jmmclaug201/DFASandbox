const menuVars = {
    buttons: undefined,

    SELECTABLE_COLOR: "rgb(200,200,200)",
    HOVER_COLOR: "rgb(150, 150, 150)",
    INVALID_COLOR: "rgb(100, 100, 100)",
}

function initMenu() {
    const buttons = Array.from(document.getElementsByClassName("inputButton"));
    menuVars.buttons = buttons;
    buttons.forEach(element => {
        element.addEventListener("mouseover", onHover);
        element.addEventListener("mouseleave", onLeave);
    });
    document.getElementById("restart").addEventListener("click", restartClick);
    document.getElementById("back").addEventListener("click", backClick);
    document.getElementById("forward").addEventListener("click", forwardClick);
    document.getElementById("run").addEventListener("click", runClick);

    document.getElementById("dfaInput").addEventListener("keyup", onInputChange);
    document.getElementById("dfaInput").addEventListener("click", onInputChange);
}

function onHover(event) {
    let target = event.target;
    if (!menuVars.buttons.includes(event.target)) target = target.parentElement;
    target.style.background = menuVars.HOVER_COLOR;
}

function onLeave(event) {
    event.target.style.background = menuVars.SELECTABLE_COLOR;
}

function canClick() {
    return (vars.DFAResults !== undefined) && (vars.DFA.isValid());
}

function restartClick(event) {
    if (!canClick()) return;
    vars.DFAIndex = -1;
    updateInput();
    sandboxDraw();
}

function backClick(event) {
    if (!canClick() || vars.DFAIndex <= -1) return;
    vars.DFAIndex -= 1;
    updateInput();
    sandboxDraw();
}

function forwardClick(event) {
    if (!canClick() || vars.DFAIndex >= vars.DFAResults.states.length-2) return;
    vars.DFAIndex += 1;
    updateInput();
    sandboxDraw();
}

function runClick(event) {
    if (!canClick()) return;
    vars.DFAIndex = vars.DFAResults.states.length-2;
    updateInput();
    sandboxDraw();
}

// see if you can maintain cursor position
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
    console.log("InnerText:" + dfaInput.innerHTML);
}

function resetDFA() {
    const input = document.getElementById("dfaInput").textContent;
    vars.DFAIndex = -2;
    vars.DFAResults = vars.DFA.evaluate(input);
    console.log('"' + input + '"', vars.DFAResults);
}

function onInputChange(event) {
    resetDFA();
    sandboxDraw();
}
