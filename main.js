// Global Variables
const vars = {
    sandbox: undefined,
    sandboxAttributes: { // To eventually allow zooming and stuff
        zoom: 1.0,
        x: 0,
        y: 0,
    },
    DFA: undefined,

    // Whether Something is being dragged
    dragging: false,

    // What State is Selected
    selectedState: undefined,

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
    window.addEventListener("mousewheel", sandboxOnScroll);
}

// Resize Sandbox to window Width and Height
function sandboxResize() {
    const sandbox = vars.sandbox;
    sandbox.width = window.innerWidth;
    sandbox.height = window.innerHeight;
    sandboxDraw();
}

/******************************************************************************/
/*                                MATH HELPERS                                */
/******************************************************************************/


// Returns true only if line exists from (x1, y1) to (x3, y3), via (x2, y2)
function isCollinear(x1, y1, x2, y2, x3, y3) {
    if (x1 == x2 && y1 == y2
        || x2 == x3 && y2 == y3) return true;
    if (x3-x2 === 0 && x2-x1 === 0) return true;
    if (x3-x2 === 0 || x2-x1 === 0) return false;
    return (y2-y1)/(x2-x1) === (y3-y2)/(x3-x2);
}

// Returns Euclidean distance between (x1, y1) and (x2, y2)
function distance(x1, y1, x2, y2) {
    return ((x2-x1)**2 + (y2-y1)**2)**0.5;
}

// Returns the distance from point (xp, yp) to the line
// segment between (x1, y1) and (x2, y2)
function pointToLineDistance(xp, yp, x1, y1, x2, y2) {
    let dxy = distance(x1, y1, x2, y2);
    if (dxy === 0) return distance(xp, yp, x1, y1);
    let t = ((xp-x1)*(x2-x1) + (yp-y1)*(y2-y1)) / dxy**2;
    t = Math.max(0, Math.min(t, 1)); // t is projection onto line segment
    return distance(xp, yp, x1 + t*(x2-x1), y1 + t*(y2-y1));
}

// Returns the distance from point (xp, yp) to the arc
// From (x1, y1) through (x2, y2) ending at (x3, y3)
// Or Infinity if (xp, yp) not in correct arc area
function pointToArcDistance(xp, yp, x1, y1, x2, y2, x3, y3) {
    if (isCollinear(x1, y1, x2, y2, x3, y3)) {
        return pointToLineDistance(xp, yp, x1, y1, x3, y3);
    }
    const [centerX, centerY] = arcCenter(x1, y1, x2, y2, x3, y3);
    let t1 = Math.atan2(y1-centerY, x1-centerX); 
    let t2 = Math.atan2(y2-centerY, x2-centerX); 
    let t3 = Math.atan2(y3-centerY, x3-centerX); 
    let tp = Math.atan2(yp-centerY, xp-centerX); 

    function isBetween(a, b, c) {
        return (a <= b && b <= c) || (c <= b && b <= a);
    }
    if (isBetween(t1, t2, t3) === isBetween(t1, tp, t3)) {
        return Math.abs(distance(xp, yp, centerX, centerY)
                      - distance(x1, y1, centerX, centerY));
    }
    return Infinity;
}

// Solve System of Following Equations for x and y,
// Assuming EXACTLY 1 solution exists: 
//  A1x + B1y + C1 = 0
//  A2x + B2y + C2 = 0
function solveSystem(A1, B1, C1, A2, B2, C2) {
    if (B1 === 0) return [-C1/A1, (A2*(C1/A1)-C2)/B2];
    if (B2 === 0) return [-C2/A2, (A1*(C2/A2)-C1)/B1];
    let x = (B2*C1 / B1 - C2) / (A2 - (B2*A1 / B1));
    let y = (-A1*x-C1) / B1;
    return [x,y];
}

// Given (x1, y1), (x2, y2), (x3, y3), returns focal point of arc between
// first and third points through the second.
// Assumes three points are NOT collinear
function arcCenter(x1, y1, x2, y2, x3, y3) {
    const [bisectX1, bisectY1] = [(x1+x2) / 2, (y1+y2) / 2];
    const [bisectX2, bisectY2] = [(x2+x3) / 2, (y2+y3) / 2];
    let [A1, B1, C1] = [0,0,0];
    if (y1 === y2) [A1, B1, C1] = [1, 0, -bisectX1];
    else {
        let slope = -(x2-x1) / (y2-y1);
        [A1, B1, C1] = [slope, -1, bisectY1 - slope*bisectX1];
    }
    let [A2, B2, C2] = [0,0,0];
    if (y2 === y3) [A2, B2, C2] = [1, 0, -bisectX2];
    else {
        let slope = -(x3-x2) / (y3-y2);
        [A2, B2, C2] = [slope, -1, bisectY2 - slope*bisectX2];
    }

    return solveSystem(A1, B1, C1, A2, B2, C2);
}

// Helper Function to sandboxDraw, moves from point at angle for dist length
function forward(x, y, angle, dist) {
    const newX = x + Math.cos(angle) * dist;
    const newY = y + Math.sin(angle) * dist;
    return [newX, newY];
}

/******************************************************************************/
/*                              DRAWING ROUTINES                              */
/******************************************************************************/

// Update strokeStyle and fillStyle based on some boolean
function updateColor(ctx, bool, trueColor, falseColor) {
    ctx.strokeStyle = (bool ? trueColor : falseColor);
    ctx.fillStyle = (bool ? trueColor : falseColor);
}

// Draw Arrowhead with tip at (x,y) and pointed in direction angle
function drawArrowHead(ctx, angle, x, y) {
    const HEAD_ANGLE = Math.PI/4;
    const HEAD_HEIGHT = vars.STATE_RADIUS * 0.5;
    const HEAD_WIDTH = HEAD_HEIGHT * Math.tan(HEAD_ANGLE/2);

    // Determine three points of Arrow Head triangle
    const [backX, backY] = forward(x, y, angle, -HEAD_HEIGHT);
    const [leftX, leftY] = forward(backX, backY, angle+Math.PI/2, HEAD_WIDTH);
    const [rightX, rightY] = forward(backX, backY, angle-Math.PI/2, HEAD_WIDTH);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
}

// Draw Arc Arrow from (fromX, fromY) to (toX, toY) via (midX, midY)
// (fromX, fromY) and (toX, toY) are treated as state centers, meaning the
// drawn arrow actually starts and ends at different points than specified
function drawArrow(ctx, fromX, fromY, midX, midY, toX, toY) {
    // If colinear, Draw Linear Arrow
    if (isCollinear(fromX, fromY, midX, midY, toX, toY)) {
        // Update xs and ys to not start at state center
        const angle = Math.atan2(toY-fromY, toX-fromX);
        [fromX, fromY] = forward(fromX, fromY, angle, vars.STATE_RADIUS);
        [toX, toY] = forward(toX, toY, angle, -vars.STATE_RADIUS);

        // Draw Linear Arrow
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        drawArrowHead(ctx, angle, toX, toY);
        return;
    }

    // Find Center Point of Arrow Arc
    const [centerX, centerY] = arcCenter(fromX, fromY, midX, midY, toX, toY);

    // Find Radius of Circle
    const r = distance(centerX, centerY, fromX, fromY);

    // Find Start and Ending Angle of state centers
    let startAngle = Math.atan2(fromY-centerY, fromX-centerX);
    let midAngle = Math.atan2(midY-centerY, midX-centerX);
    let endAngle = Math.atan2(toY-centerY, toX-centerX);
    
    // Determine if Angle should be Counterclockwise
    const cclock = (startAngle <= endAngle && endAngle <= midAngle)
                || (midAngle <= startAngle && startAngle <= endAngle)
                || (endAngle <= midAngle && midAngle <= startAngle);

    // Adjust Start and Ending Angle to meet with Edges of State Circle
    const dAngle = 2*Math.asin(0.5*vars.STATE_RADIUS / r);
    startAngle += (cclock ? -dAngle : dAngle);
    endAngle += (cclock ? dAngle : -dAngle);

    // Draw Arrow Body
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, r, r, 0, startAngle, endAngle, cclock);
    ctx.stroke();

    // Draw Arrow Head
    const angle = endAngle + (cclock ? -Math.PI/2 : +Math.PI/2);
    [toX, toY] = [centerX + r*Math.cos(endAngle), centerY + r*Math.sin(endAngle)];
    drawArrowHead(ctx, angle, toX, toY);
}

// Draw Sandbox Canvas Screen
function sandboxDraw() {
    const sandbox = vars.sandbox;
    const ctx = sandbox.getContext("2d");
    ctx.clearRect(0, 0, sandbox.width, sandbox.height);

    // Draw States in DFA
    const r = vars.STATE_RADIUS;
    ctx.textAlign = "center";
    ctx.textBaseline = 'middle';
    ctx.font = `${r * 0.6}px arial`;
    vars.DFA.states.forEach((state) => {
        // Draw SELECTED_COLOR if Selected, else DEFAULT_COLOR
        updateColor(ctx, vars.selectedState === state, 
                    vars.SELECTED_COLOR, vars.DEFAULT_COLOR);

        // Draw Circles of state
        ctx.beginPath();
        ctx.ellipse(state.x, state.y, r, r, 0, 0, 2*Math.PI);
        ctx.stroke();
        if (state.accepting) {
            ctx.beginPath();
            ctx.ellipse(state.x, state.y, 0.8*r, 0.8*r, 0, 0, 2*Math.PI);
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
            updateColor(ctx, vars.selectedArrow === arrow, 
                        vars.SELECTED_COLOR, vars.DEFAULT_COLOR);

            drawArrow(ctx, fromState.x, fromState.y, arrow.x, arrow.y, toState.x, toState.y);

            // Draw Characters of Arrow
            /*const charString = arrow.chars.toString();
            const [mx, my] = [(fromX+toX)/2, (fromY+toY)/2];
            const width = ctx.measureText(charString).width;
            ctx.fillText(charString, mx, my);*/
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

        // Snap Arrow End to State
        if (toState !== undefined) {
            [toX, toY] = [toState.x, toState.y]
        }

        // Compute Arrow Angle
        let angle = Math.atan2(toY-fromY, toX-fromX);

        // Move Arrow Ends to Adjust for drawArrow state snapping
        if (fromState === undefined) {
            [fromX, fromY] = forward(fromX, fromY, angle, -vars.STATE_RADIUS);
        }
        if (toState === undefined) {
            [toX, toY] = forward(toX, toY, angle, vars.STATE_RADIUS);
        }
        
        drawArrow(ctx, fromX, fromY, toX, toY, toX, toY);
    }

    // Draw Stating Arrow, if it exists
    if (vars.startingArrow !== undefined) {
        ctx.strokeStyle = vars.DEFAULT_COLOR;
        ctx.fillStyle = vars.DEFAULT_COLOR;
        const sarrow = vars.startingArrow;

        let [fromX, fromY] = [sarrow.fromX, sarrow.fromY];
        let [toX, toY] = [sarrow.toState.x, sarrow.toState.y];
        angle = Math.atan2(toY-fromY, toX-fromX);

        [fromX, fromY] = forward(fromX, fromY, angle, -vars.STATE_RADIUS);
        drawArrow(ctx, fromX, fromY, toX, toY, toX, toY);
    }

    /* Draw Toolbar to Run DFA 
    toolbarY = 0.8 * sandbox.height;
    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.beginPath();
    ctx.roundRect(0.45*sandbox.width, toolbarY, 0.1*sandbox.width, 0.1*sandbox.height, [10, 10, 10, 10]);
    ctx.fill();*/
}

/******************************************************************************/
/*                               EVENT HANDLERS                               */
/******************************************************************************/


// Returns State at (x,y) coordinate on Canvas, or undefined if none exists
function getClickedState(x, y) {
    for (const state of vars.DFA.states) {
        if (distance(x, y, state.x, state.y) < vars.STATE_RADIUS) {
            return state;
        }
    }
    return undefined;
}

// Returns Arrow at (x,y) coordinate on Canvas, or undefined if none exists
function getClickedArrow(x, y) {
    for (const fromState of vars.DFA.states) {
        for (const toState of vars.DFA.states) {
            if (!vars.DFA.arrows.get(fromState).has(toState)) {
                continue;
            }
            const arrow = vars.DFA.arrows.get(fromState).get(toState);
            const [x1,y1] = [fromState.x, fromState.y];
            const [x2, y2] = [arrow.x, arrow.y];
            const [x3,y3] = [toState.x, toState.y];
            console.log(pointToArcDistance(x, y, x1, y1, x2, y2, x3, y3));
            if (pointToArcDistance(x, y, x1, y1, x2, y2, x3, y3) <= 20) {
                return vars.DFA.arrows.get(fromState).get(toState);
            }
        }
    }
    return undefined;
}

// Defines what Sandbox Should do on MouseClick:
// - If Shift was Pressed Down, start arrow from the location
// - Else If On a Element, Select the element
function sandboxOnMouseDown(event) {
    let clickedState = getClickedState(event.x, event.y);
    let clickedArrow = getClickedArrow(event.x, event.y);
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
    else if (clickedArrow !== undefined) {
        // Start Selecting Arrow, Unselect anything Else
        vars.selectedArrow = clickedArrow;
        vars.dragging = true;
        vars.selectedState = undefined;
    }
    sandboxDraw();
}

// Defines what Sandbox Should do on Mousemove:
// - If dragging state or arrow, update dragged element position
// - If moving floating arrow, update arrowhead position
function sandboxOnMousemove(event){
    if (vars.floatingArrow !== undefined) {
        vars.floatingArrow.toX = event.x;
        vars.floatingArrow.toY = event.y;
    }
    else if (vars.dragging) {
        let state = vars.selectedState;
        if (state !== undefined) {
            state.x = event.x;
            state.y = event.y;
            if (vars.DFA.startingState === state) {
                // Move Starting Arrow with Starting State
                vars.startingArrow.fromX += event.movementX;
                vars.startingArrow.fromY += event.movementY;
            }
        }
        let arrow = vars.selectedArrow;
        if (arrow !== undefined) {
            arrow.x = event.x;
            arrow.y = event.y;
        }
    }
    sandboxDraw();
}

// Defines what Sandbox Should do on Mouseleave:
// - Stop Selection and dragging
function sandboxOnMouseleave(event) {
    vars.selectedState = undefined;
    vars.selectedArrow = undefined;
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
    let clickedArrow = getClickedArrow(event.x, event.y);
    if (vars.floatingArrow !== undefined) {
        // Stopped dragging arrow, Determine if Arrow should be added and how
        const farrow = vars.floatingArrow;
        const fromState = getClickedState(farrow.fromX, farrow.fromY);
        const toState = getClickedState(farrow.toX, farrow.toY);
        if (toState !== undefined) {
            if (fromState !== undefined) {
                // State to State, should add arrow
                vars.DFA.createTransition(fromState, toState,
                      (fromState.x + toState.x)/2, (fromState.y + toState.y)/2);
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
    else if (clickedState === undefined && clickedArrow === undefined) {
        // Didn't Click on Anything, Create a New Dtate
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

// Returns true if given string is a valid character for a transition function
// or state name
function isDFAChar(s) {
    return new RegExp(/^[ -~]$/).test(s)
}

// Defines what Sandbox Should do on KeyDown:
// - If Escape, Unselect element
// - If Selecting an Element with a valid key, add character to state name
//   or transition chars
function sandboxOnKeyDown(event) {
    if (event.key === "Escape") {
        vars.selectedState = undefined;
        vars.selectedArrow = undefined;
    }
    else if (event.ctrlkey || event.metaKey) {
        return;
    }
    else if (vars.selectedState !== undefined) {
        const state = vars.selectedState;
        if (event.key === "Backspace" || event.key === "Delete") {
            if (state.name.length === 0) { // Delete State if no more name chars to delete (possibly remove this functionality)
                if (vars.DFA.startingState === state) {
                    vars.startingArrow = undefined;
                }
                vars.selectedState = undefined;
                vars.DFA.deleteState(state);
            }
            else {
                vars.selectedState.name = vars.selectedState.name.slice(0, -1);
            }
        }
        else if (isDFAChar(event.key)){
            vars.selectedState.name += event.key;
        }
    }
    else if (vars.selectedArrow !== undefined) {
        const arrow = vars.selectedArrow;
        if (event.key === "Backspace" || event.key === "Delete") {
            arrow.chars.pop();
        }
        else if (isDFAChar(event.key) && !(arrow.chars.includes(event.key))){
            arrow.chars.push(event.key);
        }
    }
    sandboxDraw();
}

function sandboxOnScroll(event){
    vars.sandboxAttributes.zoom += 0.1;
    // Not Yet Implemented!
}