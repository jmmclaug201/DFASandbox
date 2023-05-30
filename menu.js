function initMenu() {
    const buttons = document.getElementsByClassName("inputButton");
    Array.from(buttons).forEach(element => {
        element.addEventListener("mouseover", onHover);
        element.addEventListener("mouseleave", onLeave);
    });
    document.getElementById("restart").addEventListener("click", restartClick);
    document.getElementById("back").addEventListener("click", backClick);
    document.getElementById("forward").addEventListener("click", forwardClick);
    document.getElementById("run").addEventListener("click", runClick);

    document.getElementById("dfaInput").addEventListener("keyup", onInputChange);
}

function onHover(event) {
    event.target.style.background = "red";
}

function onLeave(event) {
    event.target.style.background = "green";
}

function canClick() {
    return (vars.DFAResults !== undefined) && (vars.DFA.isValid());
}

function restartClick(event) {
    if (!canClick()) return;
    vars.DFAIndex = -1;
    sandboxDraw();
}

function backClick(event) {
    if (!canClick() || vars.DFAIndex <= -1) return;
    vars.DFAIndex -= 1;
    sandboxDraw();
}

function forwardClick(event) {
    if (!canClick() || vars.DFAIndex >= vars.DFAResults.states.length-2) return;
    vars.DFAIndex += 1;
    sandboxDraw();
}

function runClick(event) {
    if (!canClick()) return;
    vars.DFAIndex = vars.DFAResults.states.length-2;
    sandboxDraw();
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
