const vars = {
    sandbox: undefined,
    sandboxAttributes: { // To eventually allow zooming and stuff
        zoom: 1.0,
        x: 0,
        y: 0,
    },
    DFA: undefined,

    // What State is Selected and If It's being dragged
    selectedState: undefined,
    dragging: false,

    // Whether an Arrow is being dragged
    selectedArrow: undefined,  // Arrow
    floatingArrow: undefined,  // Object
    
    // Starting State Arrow info
    startingArrow: undefined   // Object
};

window.onload = function(){
    // Define Global Vars
    vars.sandbox = document.getElementById("sandbox");
    vars.DFA = new DFA();

    // Allow Sandbox to Resize with Window
    window.addEventListener("resize", sandboxResize);
    sandboxResize();

    // Declare Sandbox Interaction Events
    vars.sandbox.addEventListener("mousedown", sandboxOnMouseDown);
    vars.sandbox.addEventListener("mouseup", sandboxOnMouseUp);
    vars.sandbox.addEventListener("mousemove", sandboxOnMousemove);
    vars.sandbox.addEventListener("mouseleave", sandboxOnMouseleave);
    vars.sandbox.addEventListener("click", sandboxOnClick);
    vars.sandbox.addEventListener("dblclick", sandboxOnDblClick);
    window.addEventListener("keydown", sandboxOnKeyDown);
    vars.sandbox.addEventListener("scroll", sandboxOnScroll);
}

// Resize Sandbox to window Width and Height
function sandboxResize() {
    const sandbox = vars.sandbox;
    sandbox.width = window.innerWidth;
    sandbox.height = window.innerHeight;
    sandboxDraw();
}

// Helper Function to sandboxDraw, draws arrow (fromX, fromY) -> (toX, toY)
function drawArrow(ctx, fromX, fromY, toX, toY) {
    const angle = Math.atan2(toY-fromY, toX-fromX);
    // Draw Arrow Line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    // Draw Arrow Head
    const HEAD_ANGLE = Math.PI/4;
    const HEAD_HEIGHT = 25 * 0.5;
    const backX = toX - Math.cos(angle) * HEAD_HEIGHT;
    const backY = toY - Math.sin(angle) * HEAD_HEIGHT;
    const leftX = backX + Math.cos(angle+Math.PI/2) * (HEAD_HEIGHT * Math.tan(HEAD_ANGLE/2)); // 25 SHOULD NOT BE HARDCODED
    const leftY = backY + Math.sin(angle+Math.PI/2) * (HEAD_HEIGHT * Math.tan(HEAD_ANGLE/2)); // 25 SHOULD NOT BE HARDCODED
    const rightX = backX + Math.cos(angle-Math.PI/2) * (HEAD_HEIGHT * Math.tan(HEAD_ANGLE/2)); // 25 SHOULD NOT BE HARDCODED
    const rightY = backY + Math.sin(angle-Math.PI/2) * (HEAD_HEIGHT * Math.tan(HEAD_ANGLE/2)); // 25 SHOULD NOT BE HARDCODED
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
}

// Draw Sandbox Canvas Screen
function sandboxDraw() {
    const sandbox = vars.sandbox;
    const ctx = sandbox.getContext("2d");
    ctx.clearRect(0, 0, sandbox.width, sandbox.height);

    // Draw States in DFA
    ctx.textAlign = "center";
    ctx.textBaseline = 'middle';
    ctx.font = "15px arial";
    vars.DFA.states.forEach((state) => {
        // Draw Red if Selected, else Black, with White fill
        if (vars.selectedState === state) {
            ctx.strokeStyle = "red";
            ctx.fillStyle = "red";
        }
        else {
            ctx.strokeStyle = "black";
            ctx.fillStyle = "black";
        }
        // Draw Circles of state
        ctx.beginPath();
        ctx.ellipse(state.x, state.y, 25, 25, 0, 0, 2*Math.PI); // 25 SHOULD NOT BE HARDCODED
        ctx.stroke();
        if (state.accepting) {
            ctx.beginPath();
            ctx.ellipse(state.x, state.y, 20, 20, 0, 0, 2*Math.PI); // 20 SHOULD NOT BE HARDCODED
            ctx.stroke();
        }
        // Draw state name
        ctx.fillText(state.name, state.x, state.y); // 25 SHOULD NOT BE HARDCODED
    });

    // Draw Arrows in DFA
    for (const fromState of vars.DFA.states) {
        for (const toState of vars.DFA.states) {
            if (!vars.DFA.arrows.get(fromState).has(toState)) {
                continue;
            }
            // Draw Arrow from fromState to toState
            ctx.strokeStyle = "black";
            ctx.fillStyle = "black";

            const [dx, dy] = [toState.x-fromState.x, toState.y-fromState.y];
            const angle = Math.atan2(dy,dx);
            const fromX = fromState.x + Math.cos(angle) * 25; // 25 SHOULD NOT BE HARDCODED
            const fromY = fromState.y + Math.sin(angle) * 25; // 25 SHOULD NOT BE HARDCODED
            const toX = toState.x - Math.cos(angle) * 25; // 25 SHOULD NOT BE HARDCODED
            const toY = toState.y - Math.sin(angle) * 25; // 25 SHOULD NOT BE HARDCODED
            drawArrow(ctx, fromX, fromY, toX, toY, angle);
        }
    }

    /* Draw Toolbar to Run DFA 
    toolbarY = 0.8 * sandbox.height;
    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.beginPath();
    ctx.roundRect(0.45*sandbox.width, toolbarY, 0.1*sandbox.width, 0.1*sandbox.height, [10, 10, 10, 10]);
    ctx.fill();*/
}

function distance(x1, y1, x2, y2) {
    return ((x2-x1)**2 + (y2-y1)**2)**0.5;
}

// Returns State at (x,y) coordinate on Canvas, or undefined if none exists
function getClickedState(x, y) {
    for (const state of vars.DFA.states) {
        if (distance(x, y, state.x, state.y) < 25) { // 25 SHOULD NOT BE HARDCODED
            return state;
        }
    }
    return undefined;
}

// Defines what Sandbox Should do on MouseClick:
// - If On a state, Select the state
//    - If Shift was Pressed Down, start arrow from the state
function sandboxOnMouseDown(event) {
    let clickedState = getClickedState(event.x, event.y);
    if (clickedState !== undefined) {
        if (event.shiftKey) {
            // Create Selected Arrow starting at clickedState
        }
        else{
            vars.selectedState = clickedState;
            vars.dragging = true;    
        }
    }
    sandboxDraw();
}

// Defines what Sandbox Should do on MouseUp
function sandboxOnMouseUp(event) {
    vars.dragging = false;
}

// Defines what Sandbox Should do on Mousemove:
// - If dragging, update dragged element position
function sandboxOnMousemove(event){
    if (vars.dragging) {
        let state = vars.selectedState;
        state.x += event.movementX;
        state.y += event.movementY;
        sandboxDraw();    
    }
}

// Defines what Sandbox Should do on Mouseleave:
// - Stop Selection
function sandboxOnMouseleave(event) {
    vars.selectedState = undefined;
    vars.dragging = false;
    sandboxDraw();
}

// - If Didn't Click on a State, Create a New State at cursor
function sandboxOnClick(event) {
    let clickedState = getClickedState(event.x, event.y);
    if (clickedState === undefined) {
        let newState = vars.DFA.createState("", false, event.x, event.y);
        if(vars.selectedState) {                                    // DEBUG STUFF
            vars.DFA.createTransition(vars.selectedState, newState) // DEBUG STUFF
        }                                                           // DEBUG STUFF
        vars.selectedState = newState;
    }
    console.log(vars.DFA.toString());
    sandboxDraw();
}

// Defines what Sandbox Should do on Double Click:
// - If on a state, toggle its accepting status
function sandboxOnDblClick(event) {
    let state = getClickedState(event.x, event.y);
    if (state !== undefined) {
        vars.DFA.toggleStateAccepting(state);
        sandboxDraw();
    }
}

// Defines what Sandbox Should do on KeyDown:
// - If Delete, delete element selected
// - If Escape, Unselected element
function sandboxOnKeyDown(event) {
    if (vars.selectedState !== undefined) {
        // TODO: CHANGE FOR IF ARROW SELECTED
        if (event.key === "Backspace" || event.key === "Delete") {
            vars.selectedState.name = vars.selectedState.name.slice(0, -1);
        }
        else if (new RegExp(/^[0-9a-zA-Z ]$/).test(event.key)){
            vars.selectedState.name += event.key;
        }
    }
    sandboxDraw();
}

function sandboxOnScroll(event){
    console.log(event);
}