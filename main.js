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
    startingArrow: undefined,  // Object

    // Sandbox Drawing Constants
    DEFAULT_COLOR: "black",
    SELECTED_COLOR: "blue",
    STATE_RADIUS: 40,
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
    vars.sandbox.addEventListener("mousemove", sandboxOnMousemove);
    vars.sandbox.addEventListener("mouseleave", sandboxOnMouseleave);
    vars.sandbox.addEventListener("click", sandboxOnClick);
    vars.sandbox.addEventListener("dblclick", sandboxOnDblClick);
    window.addEventListener("keydown", sandboxOnKeyDown);
    window.addEventListener("scroll", sandboxOnScroll);
}

// Resize Sandbox to window Width and Height
function sandboxResize() {
    const sandbox = vars.sandbox;
    sandbox.width = window.innerWidth;
    sandbox.height = window.innerHeight;
    sandboxDraw();
}

// Helper Function to sandboxDraw, moves from point at angle for dist length
function forward(x, y, angle, dist) {
    const newX = x + Math.cos(angle) * dist;
    const newY = y + Math.sin(angle) * dist;
    return [newX, newY];
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
    const HEAD_HEIGHT = vars.STATE_RADIUS * 0.5;
    const HEAD_WIDTH = HEAD_HEIGHT * Math.tan(HEAD_ANGLE/2)
    const [backX, backY] = forward(toX, toY, angle, -HEAD_HEIGHT);
    const [leftX, leftY] = forward(backX, backY, angle+Math.PI/2, HEAD_WIDTH);
    const [rightX, rightY] = forward(backX, backY, angle-Math.PI/2, HEAD_WIDTH);
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
    ctx.font = `${vars.STATE_RADIUS * 0.6}px arial`;
    vars.DFA.states.forEach((state) => {
        // Draw Red if Selected, else Black, with White fill
        if (vars.selectedState === state) {
            ctx.strokeStyle = vars.SELECTED_COLOR;
            ctx.fillStyle = vars.SELECTED_COLOR;
        }
        else {
            ctx.strokeStyle = vars.DEFAULT_COLOR;
            ctx.fillStyle = vars.DEFAULT_COLOR;
        }
        // Draw Circles of state
        ctx.beginPath();
        ctx.ellipse(state.x, state.y, vars.STATE_RADIUS, vars.STATE_RADIUS, 0, 0, 2*Math.PI);
        ctx.stroke();
        if (state.accepting) {
            ctx.beginPath();
            ctx.ellipse(state.x, state.y, 0.8*vars.STATE_RADIUS, 0.8*vars.STATE_RADIUS, 0, 0, 2*Math.PI);
            ctx.stroke();
        }
        // Draw state name
        ctx.fillText(state.name, state.x, state.y);
    });

    // Draw Arrows in DFA
    for (const fromState of vars.DFA.states) {
        for (const toState of vars.DFA.states) {
            if (!vars.DFA.arrows.get(fromState).has(toState)) {
                continue;
            }
            // Draw Arrow from fromState to toState
            const arrow = vars.DFA.arrows.get(fromState).get(toState);
            if (vars.selectedArrow === arrow) {
                ctx.strokeStyle = vars.SELECTED_COLOR;
                ctx.fillStyle = vars.SELECTED_COLOR;
            }
            else {
                ctx.strokeStyle = vars.DEFAULT_COLOR;
                ctx.fillStyle = vars.DEFAULT_COLOR;
            }

            const [dx, dy] = [toState.x-fromState.x, toState.y-fromState.y];
            const angle = Math.atan2(dy,dx);
            const [fromX, fromY] = forward(fromState.x, fromState.y, angle, vars.STATE_RADIUS);
            const [toX, toY] = forward(toState.x, toState.y, angle, -vars.STATE_RADIUS);
            drawArrow(ctx, fromX, fromY, toX, toY);
        }
    }

    // Draw Floating Arrow, if it exists
    if (vars.floatingArrow !== undefined) {
        ctx.strokeStyle = vars.SELECTED_COLOR;
        ctx.fillStyle = vars.SELECTED_COLOR;
        const farrow = vars.floatingArrow;
        let [fromX, fromY] = [farrow.fromX, farrow.fromY];
        let [toX, toY] = [farrow.toX, farrow.toY];
        const fromState = getClickedState(farrow.fromX, farrow.fromY);
        const toState = getClickedState(farrow.toX, farrow.toY);

        // Compute Arrow Angle
        if (toState !== undefined) {
            // (toX, toY) is in a state, snap and move head backward
            [toX, toY] = [toState.x, toState.y]
        }
        angle = Math.atan2(toY-fromY, toX-fromX);

        // Given Arrow Angle, Compute Arrow base and head
        if (fromState !== undefined) {
            // (fromX, fromY) is CENTER of a state, move base forward
            [fromX, fromY] = forward(fromX, fromY, angle, vars.STATE_RADIUS);
        }
        if (toState !== undefined) {
            [toX, toY] = forward(toX, toY, angle, -vars.STATE_RADIUS);
        }
        
        drawArrow(ctx, fromX, fromY, toX, toY);
    }

    // Draw Stating Arrow, if it exists
    if (vars.startingArrow !== undefined) {
        ctx.strokeStyle = vars.DEFAULT_COLOR;
        ctx.fillStyle = vars.DEFAULT_COLOR;
        const sarrow = vars.startingArrow;
        let [fromX, fromY] = [sarrow.fromX, sarrow.fromY];
        let [toX, toY] = [sarrow.toState.x, sarrow.toState.y];
        angle = Math.atan2(toY-fromY, toX-fromX);
        [toX, toY] = forward(toX, toY, angle, -vars.STATE_RADIUS);
        drawArrow(ctx, fromX, fromY, toX, toY);
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
        if (distance(x, y, state.x, state.y) < vars.STATE_RADIUS) {
            return state;
        }
    }
    return undefined;
}

// Defines what Sandbox Should do on MouseClick:
// - If Shift was Pressed Down, start arrow from the location
// - Else If On a state, Select the state
function sandboxOnMouseDown(event) {
    let clickedState = getClickedState(event.x, event.y);
    if (event.shiftKey) {
        let [fromX, fromY] = [event.x, event.y];
        if (clickedState !== undefined) {
            // Arrow starts from state, snap base of arrow to state
            fromX = clickedState.x;
            fromY = clickedState.y;
        }
        // Start floating arrow and stop any other selection
        vars.floatingArrow = {
            fromX: fromX,
            fromY: fromY, 
            toX: event.x,
            toY: event.y
        }
        vars.selectedState = undefined;
        vars.selectedArrow = undefined;
    }
    else if (clickedState !== undefined) {
        // Start Selecting State, Unselect anything Else
        vars.selectedState = clickedState;
        vars.dragging = true;
        vars.selectedArrow = undefined;
    }
    sandboxDraw();
}

// Defines what Sandbox Should do on Mousemove:
// - If dragging state, update dragged element position
// - If moving arrow, update arrowhead position
function sandboxOnMousemove(event){
    if (vars.floatingArrow !== undefined) {
        vars.floatingArrow.toX = event.x;
        vars.floatingArrow.toY = event.y;
    }
    else if (vars.dragging) {
        let state = vars.selectedState;
        state.x += event.movementX;
        state.y += event.movementY;
        if (vars.DFA.startingState === state) {
            // Move Starting Arrow with Starting State
            vars.startingArrow.fromX += event.movementX;
            vars.startingArrow.fromY += event.movementY;
        }
    }
    sandboxDraw();
}

// Defines what Sandbox Should do on Mouseleave:
// - Stop Selection
function sandboxOnMouseleave(event) {
    vars.selectedState = undefined;
    vars.dragging = false;
    sandboxDraw();
}

// Defines what Sandbox Should do on Click:
// - Stop Dragging
// - If was creating an arrow: resolve arrow
// - If Didn't Click on a State, Create a New State at cursor
function sandboxOnClick(event) {
    vars.dragging = false;
    let clickedState = getClickedState(event.x, event.y);
    if (vars.floatingArrow !== undefined) {
        // Stopped dragging arrow, Determine if Arrow should be added and how
        const farrow = vars.floatingArrow;
        const fromState = getClickedState(farrow.fromX, farrow.fromY);
        const toState = getClickedState(farrow.toX, farrow.toY);
        if (toState !== undefined) {
            if (fromState !== undefined) {
                // State to State, should add arrow
                vars.DFA.createTransition(fromState, toState);
                vars.selectedArrow = vars.DFA.getTransition(fromState, toState);
            }
            else {
                // Point to State, should set starting state
                vars.DFA.setStartingState(toState);
                vars.startingArrow = {
                    fromX: vars.floatingArrow.fromX,
                    fromY: vars.floatingArrow.fromY,
                    toState: toState,
                };
            }
        }
        vars.floatingArrow = undefined;
    }
    else if (clickedState === undefined) {
        let newState = vars.DFA.createState("", false, event.x, event.y);
        vars.selectedArrow = undefined;
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

function isDFAChar(s) {
    return new RegExp(/^[ -~]$/).test(s)
}

// Defines what Sandbox Should do on KeyDown:
// - If Delete, delete element selected
// - If Escape, Unselected element
function sandboxOnKeyDown(event) {
    if (event.key === "Escape") {
        vars.selectedState = undefined;
        vars.selectedArrow = undefined;
    }
    else if (vars.selectedState !== undefined) {
        if (event.key === "Backspace" || event.key === "Delete") {
            vars.selectedState.name = vars.selectedState.name.slice(0, -1);
        }
        else if (isDFAChar(event.key)){
            vars.selectedState.name += event.key;
        }
    }
    else if (vars.selectedArrow !== undefined) {
        if (event.key === "Backspace" || event.key === "Delete") {
            vars.selectedArrow.chars.pop();
        }
        else if (isDFAChar(event.key)){
            vars.selectedArrow.chars.push(event.key);
        }
    }
    sandboxDraw();
}

function sandboxOnScroll(event){
    console.log(event);
}